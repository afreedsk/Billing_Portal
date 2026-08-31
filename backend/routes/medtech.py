# backend/routes/medtech.py
"""MedTech finance routes - Income/Expenses entries"""
import json
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from models import db, FinanceEntry, FinanceEntryItem, ENTRY_TYPES, DEPARTMENT_CONFIG
from utils import role_required
from file_utils import save_invoice_file, delete_invoice_file

DEPARTMENT = "MedTech"
CONFIG = DEPARTMENT_CONFIG[DEPARTMENT]

medtech_bp = Blueprint("medtech", __name__, url_prefix="/api/medtech")

def _parse_date(value, default=None):
    if not value:
        return default
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return default

def _apply_date_filters(query):
    start_date = _parse_date(request.args.get("start_date"))
    end_date = _parse_date(request.args.get("end_date"))
    if start_date:
        query = query.filter(FinanceEntry.entry_date >= start_date)
    if end_date:
        query = query.filter(FinanceEntry.entry_date <= end_date)
    return query

def _validate_items(items_data):
    clean_items = []
    errors = []
    items_total = 0.0
    if not isinstance(items_data, list):
        items_data = []
    for idx, item in enumerate(items_data, start=1):
        item_name = (item.get("item_name") or "").strip()
        try:
            quantity = float(item.get("quantity"))
        except (TypeError, ValueError):
            quantity = None
        try:
            unit_price = float(item.get("unit_price"))
        except (TypeError, ValueError):
            unit_price = None
        if not item_name:
            errors.append(f"Item {idx}: item name is required.")
            continue
        if quantity is None or quantity <= 0:
            errors.append(f"Item {idx} ({item_name}): quantity must be greater than 0.")
            continue
        if unit_price is None or unit_price < 0:
            errors.append(f"Item {idx} ({item_name}): unit price must be a valid number.")
            continue
        line_amount = round(quantity * unit_price, 2)
        items_total = round(items_total + line_amount, 2)
        clean_items.append({"item_name": item_name, "quantity": quantity, "unit_price": unit_price, "amount": line_amount})
    if not clean_items and not errors:
        errors.append("Add at least one item.")
    return clean_items, items_total, errors

def _parse_gst_tax_percent(raw_value):
    if raw_value in (None, ""):
        return 0.0, None
    try:
        percent = float(raw_value)
    except (TypeError, ValueError):
        return 0.0, "gst_tax_percent must be a number."
    if percent < 0 or percent > 100:
        return 0.0, "gst_tax_percent must be between 0 and 100."
    return percent, None

@medtech_bp.route("/options", methods=["GET"])
@role_required("MedTech")
def options():
    # Fetch the salary category name from Corporate config
    salary_category = DEPARTMENT_CONFIG.get("Corporate", {}).get("is_salary_category", "Personnel & Payroll")
    return jsonify({
        "department": DEPARTMENT,
        "entry_types": ENTRY_TYPES,
        "categories": CONFIG["categories"],
        "revenue_types": CONFIG["revenue_types"],
        "show_generated_by": CONFIG["show_generated_by"],
        "show_revenue_type": CONFIG["show_revenue_type"],
        "show_client_name": CONFIG["show_client_name"],
        "show_gst_number": CONFIG["show_gst_number"],
        "gst_required_categories": CONFIG["gst_required_categories"],
        "show_items": CONFIG["show_items"],
        "show_invoice": CONFIG["show_invoice"],
        "show_gst_tax": CONFIG["show_gst_tax"],
        "show_tax_invoice_number": CONFIG["show_tax_invoice_number"],
        "is_salary_category": salary_category,   # <-- now correctly returns the salary category name
    }), 200

@medtech_bp.route("/entries", methods=["POST"])
@role_required("MedTech")
def create_entry():
    data = request.form
    entry_type = data.get("entry_type")
    category = data.get("category")
    generated_by = (data.get("generated_by") or "").strip()
    revenue_type = data.get("revenue_type")
    client_name = (data.get("client_name") or "").strip() or None
    gst_number = (data.get("gst_number") or "").strip() or None
    tax_invoice_number = (data.get("tax_invoice_number") or "").strip() or None
    remarks = data.get("remarks", "")
    entry_date = _parse_date(data.get("entry_date"), default=date.today())

    # Generic fields (used by some categories)
    employee_name = (data.get("employee_name") or "").strip() or None
    vehicle_type = (data.get("vehicle_type") or "").strip() or None
    amount = data.get("amount")

    # Get salary category from Corporate
    salary_category = DEPARTMENT_CONFIG.get("Corporate", {}).get("is_salary_category", "Personnel & Payroll")
    is_salary = (entry_type == "Expenses" and category == salary_category)

    errors = []
    if entry_type not in ENTRY_TYPES:
        errors.append("entry_type must be Income or Expenses.")

    allowed_categories = CONFIG["categories"].get(entry_type, [])
    if category not in allowed_categories:
        errors.append(f"category must be one of: {', '.join(allowed_categories)}.")

    if is_salary:
        errors.append("Salaries must be entered by Corporate Management only.")

    if not is_salary:
        # Standard MedTech validations
        if entry_type == "Income" and not generated_by:
            errors.append("generated_by (employee name) is required for Income entries.")
        if CONFIG["show_revenue_type"] and revenue_type not in CONFIG["revenue_types"]:
            errors.append(f"revenue_type must be one of: {', '.join(CONFIG['revenue_types'])}.")
        if CONFIG["show_gst_number"] and category in CONFIG["gst_required_categories"] and not gst_number:
            errors.append(f"gst_number is required for {category} entries.")

        gst_tax_percent, gst_tax_error = _parse_gst_tax_percent(data.get("gst_tax_percent"))
        if gst_tax_error:
            errors.append(gst_tax_error)

        try:
            items_data = json.loads(data.get("items") or "[]")
        except (TypeError, ValueError):
            items_data = []
            errors.append("Items data could not be read.")

        clean_items, items_total, item_errors = _validate_items(items_data)
        errors.extend(item_errors)
    else:
        # Salary is blocked – set defaults
        clean_items = []
        items_total = 0
        gst_tax_percent = 0.0
        amount = 0
        generated_by = None
        revenue_type = None
        gst_number = None
        tax_invoice_number = None

    # Invoice handling (skip for salary)
    invoice_path = invoice_original = invoice_mimetype = None
    invoice_file = request.files.get("invoice")
    if CONFIG["show_invoice"] and invoice_file and invoice_file.filename and not is_salary:
        try:
            invoice_path, invoice_original, invoice_mimetype = save_invoice_file(invoice_file, DEPARTMENT)
        except ValueError as e:
            errors.append(str(e))

    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    # Calculate totals
    if not is_salary:
        base_amount = items_total
        gst_tax_amount = round(base_amount * gst_tax_percent / 100, 2) if gst_tax_percent else 0
        total_amount = round(base_amount + gst_tax_amount, 2)
    else:
        base_amount = 0
        gst_tax_percent = 0
        gst_tax_amount = 0
        total_amount = 0

    entry = FinanceEntry(
        department=DEPARTMENT,
        entry_type=entry_type,
        category=category,
        generated_by=generated_by if not is_salary else None,
        revenue_type=revenue_type if not is_salary else None,
        client_name=client_name,
        gst_number=gst_number if not is_salary else None,
        tax_invoice_number=tax_invoice_number if not is_salary else None,
        amount=total_amount,
        base_amount=base_amount,
        gst_tax_percent=gst_tax_percent,
        gst_tax_amount=gst_tax_amount,
        employee_name=employee_name,
        vehicle_type=vehicle_type,
        remarks=remarks,
        entry_date=entry_date,
        invoice_filename=invoice_path,
        invoice_original_name=invoice_original,
        invoice_mimetype=invoice_mimetype,
        created_by_id=get_jwt_identity(),
    )
    
    if not is_salary and clean_items:
        for item in clean_items:
            entry.items.append(FinanceEntryItem(**item))

    db.session.add(entry)
    db.session.commit()
    return jsonify({"message": "Entry created.", "entry": entry.to_dict()}), 201

@medtech_bp.route("/entries", methods=["GET"])
@role_required("MedTech")
def list_entries():
    query = FinanceEntry.query.filter_by(department=DEPARTMENT)
    query = _apply_date_filters(query)
    entry_type = request.args.get("entry_type")
    if entry_type in ENTRY_TYPES:
        query = query.filter(FinanceEntry.entry_type == entry_type)
    category = request.args.get("category")
    if category:
        query = query.filter(FinanceEntry.category == category)
    search = request.args.get("search")
    if search:
        like = f"%{search}%"
        query = query.filter(
            (FinanceEntry.generated_by.ilike(like))
            | (FinanceEntry.client_name.ilike(like))
            | (FinanceEntry.gst_number.ilike(like))
            | (FinanceEntry.tax_invoice_number.ilike(like))
            | (FinanceEntry.remarks.ilike(like))
        )
    query = query.order_by(FinanceEntry.entry_date.desc(), FinanceEntry.id.desc())
    return jsonify({"entries": [e.to_dict() for e in query.all()]}), 200

@medtech_bp.route("/entries/<int:entry_id>", methods=["PUT"])
@role_required("MedTech")
def update_entry(entry_id):
    entry = FinanceEntry.query.filter_by(id=entry_id, department=DEPARTMENT).first()
    if not entry:
        return jsonify({"message": "Entry not found."}), 404

    if request.is_json:
        data = request.get_json() or {}
    else:
        data = request.form

    errors = []

    # Block changing to salary category
    salary_category = DEPARTMENT_CONFIG.get("Corporate", {}).get("is_salary_category", "Personnel & Payroll")
    if "category" in data and data["category"] == salary_category and entry.category != salary_category:
        errors.append("Salaries must be entered by Corporate Management only.")

    if "entry_type" in data and data["entry_type"] in ENTRY_TYPES:
        entry.entry_type = data["entry_type"]
    if "category" in data:
        allowed_categories = CONFIG["categories"].get(entry.entry_type, [])
        if data["category"] in allowed_categories:
            entry.category = data["category"]
        else:
            errors.append(f"category must be one of: {', '.join(allowed_categories)}")
    if "generated_by" in data and data["generated_by"].strip():
        entry.generated_by = data["generated_by"].strip()
    if "revenue_type" in data and data["revenue_type"] in CONFIG["revenue_types"]:
        entry.revenue_type = data["revenue_type"]
    if "client_name" in data:
        entry.client_name = (data["client_name"] or "").strip() or None
    if "gst_number" in data:
        entry.gst_number = (data["gst_number"] or "").strip() or None
    if "tax_invoice_number" in data:
        entry.tax_invoice_number = (data["tax_invoice_number"] or "").strip() or None
    if "remarks" in data:
        entry.remarks = data["remarks"]
    if "entry_date" in data:
        parsed = _parse_date(data["entry_date"])
        if parsed:
            entry.entry_date = parsed
    if "employee_name" in data:
        entry.employee_name = (data["employee_name"] or "").strip() or None
    if "vehicle_type" in data:
        entry.vehicle_type = (data["vehicle_type"] or "").strip() or None

    amount_from_request = data.get("amount")
    if amount_from_request is not None and amount_from_request != "":
        try:
            base_amount = float(amount_from_request)
            if base_amount < 0:
                errors.append("amount must be >= 0.")
        except (TypeError, ValueError):
            errors.append("amount must be a valid number.")
            base_amount = float(entry.base_amount) if entry.base_amount is not None else 0.0
    else:
        base_amount = float(entry.base_amount) if entry.base_amount is not None else 0.0

    items_changed = "items" in data
    if items_changed:
        if request.is_json:
            items_data = data.get("items") or []
        else:
            try:
                items_data = json.loads(data.get("items") or "[]")
            except (TypeError, ValueError):
                items_data = []
                errors.append("Items data could not be read.")
        clean_items, items_total, item_errors = _validate_items(items_data)
        errors.extend(item_errors)
        if not item_errors:
            entry.items = [FinanceEntryItem(**item) for item in clean_items]
            base_amount = items_total

    if "gst_tax_percent" in data:
        gst_tax_percent, gst_tax_error = _parse_gst_tax_percent(data.get("gst_tax_percent"))
        if gst_tax_error:
            errors.append(gst_tax_error)
    else:
        gst_tax_percent = float(entry.gst_tax_percent) if entry.gst_tax_percent is not None else 0.0

    if request.files:
        invoice_file = request.files.get("invoice")
        if invoice_file and invoice_file.filename:
            try:
                new_path, new_original, new_mimetype = save_invoice_file(invoice_file, DEPARTMENT)
            except ValueError as e:
                errors.append(str(e))
            else:
                delete_invoice_file(entry.invoice_filename)
                entry.invoice_filename = new_path
                entry.invoice_original_name = new_original
                entry.invoice_mimetype = new_mimetype
        elif data.get("remove_invoice") == "true":
            delete_invoice_file(entry.invoice_filename)
            entry.invoice_filename = None
            entry.invoice_original_name = None
            entry.invoice_mimetype = None

    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    gst_tax_amount = round(base_amount * gst_tax_percent / 100, 2) if gst_tax_percent else 0
    entry.base_amount = base_amount
    entry.gst_tax_percent = gst_tax_percent
    entry.gst_tax_amount = gst_tax_amount
    entry.amount = round(base_amount + gst_tax_amount, 2)

    db.session.commit()
    return jsonify({"message": "Entry updated.", "entry": entry.to_dict()}), 200

@medtech_bp.route("/entries/<int:entry_id>", methods=["DELETE"])
@role_required("MedTech")
def delete_entry(entry_id):
    entry = FinanceEntry.query.filter_by(id=entry_id, department=DEPARTMENT).first()
    if not entry:
        return jsonify({"message": "Entry not found."}), 404
    delete_invoice_file(entry.invoice_filename)
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Entry deleted."}), 200

@medtech_bp.route("/summary", methods=["GET"])
@role_required("MedTech")
def finance_summary():
    entries = _apply_date_filters(FinanceEntry.query.filter_by(department=DEPARTMENT)).all()
    total_income = sum(float(e.amount) for e in entries if e.entry_type == "Income")
    total_expenses = sum(float(e.amount) for e in entries if e.entry_type == "Expenses")
    by_date = {}
    for e in entries:
        key = e.entry_date.isoformat()
        by_date.setdefault(key, {"date": key, "income": 0, "expenses": 0})
        by_date[key]["income" if e.entry_type == "Income" else "expenses"] += float(e.amount)
    trend = sorted(by_date.values(), key=lambda x: x["date"])
    by_category = {}
    for e in entries:
        by_category.setdefault(e.category, {"category": e.category, "amount": 0})
        by_category[e.category]["amount"] += float(e.amount)
    return jsonify({
        "department": DEPARTMENT,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "profit": total_income - total_expenses,
        "entry_count": len(entries),
        "trend": trend,
        "category_breakdown": list(by_category.values()),
    }), 200