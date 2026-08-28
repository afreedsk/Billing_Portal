"""MedTech finance routes - Income/Expenses entries
Now includes salary entries from Corporate Management.
"""
import json
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import or_

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
    remarks = (data.get("remarks") or "").strip()
    entry_date = _parse_date(data.get("entry_date"), default=date.today())

    # New fields for MedTech categories
    employee_name = (data.get("employee_name") or "").strip() or None
    purpose = (data.get("purpose") or "").strip() or None
    vehicle_type = (data.get("vehicle_type") or "").strip() or None
    amount = data.get("amount")

    errors = []

    # Block salary category creation in MedTech
    if category == "Payroll Salaries":
        errors.append("Salaries must be entered by Corporate Management only.")

    if entry_type not in ENTRY_TYPES:
        errors.append("entry_type must be Income or Expenses.")

    allowed_categories = CONFIG["categories"].get(entry_type, [])
    if category not in allowed_categories:
        errors.append(f"category must be one of: {', '.join(allowed_categories)}.")

    # Standard MedTech validations
    if entry_type == "Income" and not generated_by:
        errors.append("generated_by (employee name) is required for Income entries.")

    if CONFIG["show_revenue_type"] and revenue_type not in CONFIG["revenue_types"]:
        errors.append(f"revenue_type must be one of: {', '.join(CONFIG['revenue_types'])}.")

    if CONFIG["show_gst_number"] and category in CONFIG["gst_required_categories"] and not gst_number:
        errors.append(f"gst_number is required for {category} entries.")

    # Handle GST tax percent – ensure it's None if empty
    gst_tax_percent_raw = data.get("gst_tax_percent")
    gst_tax_percent, gst_tax_error = _parse_gst_tax_percent(gst_tax_percent_raw)
    if gst_tax_error:
        errors.append(gst_tax_error)

    # For expense entries (excluding salary), remarks is mandatory
    if entry_type == "Expenses" and category != "Payroll Salaries" and not remarks:
        errors.append("Remarks are required.")

    # Items handling: if items are provided, use them; otherwise use amount
    try:
        items_data = json.loads(data.get("items") or "[]")
    except (TypeError, ValueError):
        items_data = []
        errors.append("Items data could not be read.")

    if items_data:
        clean_items, items_total, item_errors = _validate_items(items_data)
        errors.extend(item_errors)
    else:
        # No items – use amount field
        clean_items = []
        try:
            items_total = float(amount) if amount else 0
            if items_total <= 0:
                errors.append("amount must be greater than 0.")
        except (TypeError, ValueError):
            errors.append("amount must be a number.")

    # Invoice handling
    invoice_path = invoice_original = invoice_mimetype = None
    invoice_file = request.files.get("invoice")
    if CONFIG["show_invoice"] and invoice_file and invoice_file.filename:
        try:
            invoice_path, invoice_original, invoice_mimetype = save_invoice_file(invoice_file, DEPARTMENT)
        except ValueError as e:
            errors.append(str(e))

    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    # Calculate totals
    base_amount = items_total
    gst_tax_amount = round(base_amount * gst_tax_percent / 100, 2)
    total_amount = round(base_amount + gst_tax_amount, 2)

    entry = FinanceEntry(
        department=DEPARTMENT,
        entry_type=entry_type,
        category=category,
        generated_by=generated_by,
        revenue_type=revenue_type if CONFIG["show_revenue_type"] else None,
        client_name=client_name if CONFIG["show_client_name"] else None,
        gst_number=gst_number if CONFIG["show_gst_number"] else None,
        tax_invoice_number=tax_invoice_number if CONFIG["show_tax_invoice_number"] else None,
        amount=total_amount,
        base_amount=base_amount,
        gst_tax_percent=gst_tax_percent,
        gst_tax_amount=gst_tax_amount,
        employee_name=employee_name,
        purpose=purpose,
        vehicle_type=vehicle_type,
        remarks=remarks,
        entry_date=entry_date,
        invoice_filename=invoice_path,
        invoice_original_name=invoice_original,
        invoice_mimetype=invoice_mimetype,
        created_by_id=get_jwt_identity(),
    )

    for item in clean_items:
        entry.items.append(FinanceEntryItem(**item))

    db.session.add(entry)
    db.session.commit()
    return jsonify({"message": "Entry created.", "entry": entry.to_dict()}), 201
@medtech_bp.route("/entries", methods=["GET"])
@role_required("MedTech")
def list_entries():
    # 1. Native MedTech entries
    query = FinanceEntry.query.filter_by(department=DEPARTMENT)
    query = _apply_date_filters(query)

    # 2. Salary entries from Corporate with exec_department = MedTech
    salary_query = FinanceEntry.query.filter(
        FinanceEntry.department == "Corporate",
        FinanceEntry.exec_department == "MedTech",
        FinanceEntry.entry_type == "Expenses",
        FinanceEntry.category == "Payroll Salaries"
    )
    start_date = _parse_date(request.args.get("start_date"))
    end_date = _parse_date(request.args.get("end_date"))
    if start_date:
        salary_query = salary_query.filter(FinanceEntry.entry_date >= start_date)
    if end_date:
        salary_query = salary_query.filter(FinanceEntry.entry_date <= end_date)

    # Combine both
    combined_query = query.union(salary_query)

    entry_type = request.args.get("entry_type")
    if entry_type in ENTRY_TYPES:
        combined_query = combined_query.filter(FinanceEntry.entry_type == entry_type)

    category = request.args.get("category")
    if category:
        combined_query = combined_query.filter(FinanceEntry.category == category)

    search = request.args.get("search")
    if search:
        like = f"%{search}%"
        combined_query = combined_query.filter(
            or_(
                FinanceEntry.generated_by.ilike(like),
                FinanceEntry.client_name.ilike(like),
                FinanceEntry.gst_number.ilike(like),
                FinanceEntry.tax_invoice_number.ilike(like),
                FinanceEntry.remarks.ilike(like),
                FinanceEntry.employee_name.ilike(like),
            )
        )

    combined_query = combined_query.order_by(FinanceEntry.entry_date.desc(), FinanceEntry.id.desc())
    return jsonify({"entries": [e.to_dict() for e in combined_query.all()]}), 200


@medtech_bp.route("/entries/<int:entry_id>", methods=["PUT"])
@role_required("MedTech")
def update_entry(entry_id):
    entry = FinanceEntry.query.filter_by(id=entry_id, department=DEPARTMENT).first()
    if not entry:
        return jsonify({"message": "Entry not found."}), 404

    data = request.form
    new_type = data.get("entry_type", entry.entry_type)
    allowed_categories = CONFIG["categories"].get(new_type, [])

    errors = []

    # Block changing category to Payroll Salaries
    new_category = data.get("category", entry.category)
    if new_category == "Payroll Salaries" and entry.category != "Payroll Salaries":
        errors.append("Salaries must be entered by Corporate Management only.")

    if "entry_type" in data and data["entry_type"] in ENTRY_TYPES:
        entry.entry_type = data["entry_type"]
    if "category" in data and data["category"] in allowed_categories:
        entry.category = data["category"]
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
        entry.remarks = (data["remarks"] or "").strip()
    if "entry_date" in data:
        parsed = _parse_date(data["entry_date"])
        if parsed:
            entry.entry_date = parsed

    # New fields
    if "employee_name" in data:
        entry.employee_name = (data["employee_name"] or "").strip() or None
    if "purpose" in data:
        entry.purpose = (data["purpose"] or "").strip() or None
    if "vehicle_type" in data:
        entry.vehicle_type = (data["vehicle_type"] or "").strip() or None

    # Items update
    items_changed = "items" in data
    if items_changed:
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
        else:
            base_amount = float(entry.base_amount) if entry.base_amount is not None else float(entry.amount or 0)
    else:
        base_amount = float(entry.base_amount) if entry.base_amount is not None else float(entry.amount or 0)

    # GST update
    if "gst_tax_percent" in data:
        gst_tax_percent, gst_tax_error = _parse_gst_tax_percent(data.get("gst_tax_percent"))
        if gst_tax_error:
            errors.append(gst_tax_error)
    else:
        gst_tax_percent = float(entry.gst_tax_percent) if entry.gst_tax_percent is not None else 0.0

    invoice_file = request.files.get("invoice")
    if CONFIG["show_invoice"] and invoice_file and invoice_file.filename:
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

    # Recalculate totals
    gst_tax_amount = round(base_amount * gst_tax_percent / 100, 2)
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
    # 1. Native MedTech entries
    query = FinanceEntry.query.filter_by(department=DEPARTMENT)
    query = _apply_date_filters(query)

    # 2. Salary entries from Corporate with exec_department = MedTech
    salary_query = FinanceEntry.query.filter(
        FinanceEntry.department == "Corporate",
        FinanceEntry.exec_department == "MedTech",
        FinanceEntry.entry_type == "Expenses",
        FinanceEntry.category == "Payroll Salaries"
    )
    start_date = _parse_date(request.args.get("start_date"))
    end_date = _parse_date(request.args.get("end_date"))
    if start_date:
        salary_query = salary_query.filter(FinanceEntry.entry_date >= start_date)
    if end_date:
        salary_query = salary_query.filter(FinanceEntry.entry_date <= end_date)

    combined_query = query.union(salary_query)

    entries = combined_query.all()

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