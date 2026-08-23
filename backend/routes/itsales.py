"""IT Sales department finance routes — Income/Expenses entries with categories.
See DEPARTMENT_CONFIG['IT Sales'] in models.py.
"""
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from models import db, FinanceEntry, ENTRY_TYPES, DEPARTMENT_CONFIG
from utils import role_required
from file_utils import save_invoice_file, delete_invoice_file

DEPARTMENT = "IT Sales"
CONFIG = DEPARTMENT_CONFIG[DEPARTMENT]

itsales_bp = Blueprint("itsales", __name__, url_prefix="/api/itsales")


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


@itsales_bp.route("/options", methods=["GET"])
@role_required("IT Sales")
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
        "show_invoice": CONFIG["show_invoice"],
        "show_gst_tax": CONFIG["show_gst_tax"],
        "show_tax_invoice_number": CONFIG["show_tax_invoice_number"],
    }), 200


@itsales_bp.route("/entries", methods=["POST"])
@role_required("IT Sales")
def create_entry():
    data = request.form

    entry_type = data.get("entry_type")
    category = data.get("category")
    generated_by = (data.get("generated_by") or "").strip()
    revenue_type = data.get("revenue_type")
    client_name = (data.get("client_name") or "").strip() or None
    gst_number = (data.get("gst_number") or "").strip() or None
    gst_tax_percent = data.get("gst_tax_percent")
    tax_invoice_number = data.get("tax_invoice_number") or None
    amount = data.get("amount")
    remarks = data.get("remarks", "")
    entry_date = _parse_date(data.get("entry_date"), default=date.today())

    errors = []
    if entry_type not in ENTRY_TYPES:
        errors.append("entry_type must be Income or Expenses.")

    allowed_categories = CONFIG["categories"].get(entry_type, [])
    if category not in allowed_categories:
        errors.append(f"category must be one of: {', '.join(allowed_categories)}.")

    if not generated_by:
        errors.append("generated_by (employee name) is required.")

    if CONFIG["show_revenue_type"] and revenue_type not in CONFIG["revenue_types"]:
        errors.append(f"revenue_type must be one of: {', '.join(CONFIG['revenue_types'])}.")

    if CONFIG["show_gst_number"] and category in CONFIG["gst_required_categories"] and not gst_number:
        errors.append(f"GST number is required for {category}.")

    try:
        amount = float(amount)
        if amount <= 0:
            errors.append("amount must be greater than 0.")
    except (TypeError, ValueError):
        errors.append("amount must be a number.")

    if CONFIG["show_gst_tax"] and gst_tax_percent:
        try:
            gst_tax_percent = float(gst_tax_percent)
            if gst_tax_percent < 0 or gst_tax_percent > 100:
                errors.append("GST tax percent must be between 0 and 100.")
        except ValueError:
            errors.append("GST tax percent must be a number.")

    invoice_path = invoice_original = invoice_mimetype = None
    invoice_file = request.files.get("invoice")
    if CONFIG["show_invoice"] and invoice_file and invoice_file.filename:
        try:
            invoice_path, invoice_original, invoice_mimetype = save_invoice_file(invoice_file, DEPARTMENT)
        except ValueError as e:
            errors.append(str(e))

    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    # Calculate GST if applicable
    base_amount = amount
    gst_tax_amount = 0
    if CONFIG["show_gst_tax"] and gst_tax_percent:
        gst_tax_amount = round(amount * gst_tax_percent / 100, 2)
        total_amount = amount + gst_tax_amount
    else:
        total_amount = amount

    entry = FinanceEntry(
        department=DEPARTMENT,
        entry_type=entry_type,
        category=category,
        generated_by=generated_by,
        revenue_type=revenue_type if CONFIG["show_revenue_type"] else None,
        client_name=client_name if CONFIG["show_client_name"] else None,
        gst_number=gst_number if CONFIG["show_gst_number"] else None,
        amount=total_amount,
        base_amount=base_amount,
        gst_tax_percent=gst_tax_percent if CONFIG["show_gst_tax"] else None,
        gst_tax_amount=gst_tax_amount if CONFIG["show_gst_tax"] else None,
        tax_invoice_number=tax_invoice_number if CONFIG["show_tax_invoice_number"] else None,
        remarks=remarks,
        entry_date=entry_date,
        invoice_filename=invoice_path,
        invoice_original_name=invoice_original,
        invoice_mimetype=invoice_mimetype,
        created_by_id=get_jwt_identity(),
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify({"message": "Entry created.", "entry": entry.to_dict()}), 201


@itsales_bp.route("/entries", methods=["GET"])
@role_required("IT Sales")
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
            | (FinanceEntry.remarks.ilike(like))
        )

    query = query.order_by(FinanceEntry.entry_date.desc(), FinanceEntry.id.desc())
    return jsonify({"entries": [e.to_dict() for e in query.all()]}), 200


@itsales_bp.route("/entries/<int:entry_id>", methods=["PUT"])
@role_required("IT Sales")
def update_entry(entry_id):
    entry = FinanceEntry.query.filter_by(id=entry_id, department=DEPARTMENT).first()
    if not entry:
        return jsonify({"message": "Entry not found."}), 404

    data = request.form
    errors = []

    if "entry_type" in data and data["entry_type"] in ENTRY_TYPES:
        entry.entry_type = data["entry_type"]
    if "category" in data:
        allowed = CONFIG["categories"].get(entry.entry_type, [])
        if data["category"] in allowed:
            entry.category = data["category"]
    if "generated_by" in data and data["generated_by"].strip():
        entry.generated_by = data["generated_by"].strip()
    if "revenue_type" in data and data["revenue_type"] in CONFIG["revenue_types"]:
        entry.revenue_type = data["revenue_type"]
    if "client_name" in data:
        entry.client_name = (data["client_name"] or "").strip() or None
    if "gst_number" in data:
        entry.gst_number = (data["gst_number"] or "").strip() or None
    if "gst_tax_percent" in data:
        try:
            gst = float(data["gst_tax_percent"])
            if 0 <= gst <= 100:
                entry.gst_tax_percent = gst
            else:
                errors.append("GST tax percent must be between 0 and 100.")
        except ValueError:
            errors.append("GST tax percent must be a number.")
    if "tax_invoice_number" in data:
        entry.tax_invoice_number = data["tax_invoice_number"] or None
    if "amount" in data:
        try:
            amt = float(data["amount"])
            if amt > 0:
                entry.amount = amt
                # Recalculate GST if needed
                if entry.gst_tax_percent:
                    entry.base_amount = amt / (1 + entry.gst_tax_percent / 100)
                    entry.gst_tax_amount = entry.amount - entry.base_amount
                else:
                    entry.base_amount = amt
                    entry.gst_tax_amount = 0
        except (TypeError, ValueError):
            pass
    if "remarks" in data:
        entry.remarks = data["remarks"]
    if "entry_date" in data:
        parsed = _parse_date(data["entry_date"])
        if parsed:
            entry.entry_date = parsed

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

    db.session.commit()
    return jsonify({"message": "Entry updated.", "entry": entry.to_dict()}), 200


@itsales_bp.route("/entries/<int:entry_id>", methods=["DELETE"])
@role_required("IT Sales")
def delete_entry(entry_id):
    entry = FinanceEntry.query.filter_by(id=entry_id, department=DEPARTMENT).first()
    if not entry:
        return jsonify({"message": "Entry not found."}), 404
    delete_invoice_file(entry.invoice_filename)
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Entry deleted."}), 200


@itsales_bp.route("/summary", methods=["GET"])
@role_required("IT Sales")
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