"""Caredx routes. Two modules live here:

1. Lab Data Entry — the department's day-to-day patient/test log
   (Date, Patient, Test, Total Amount Paid, Employee, Cash, Online, Paid to
   Other Labs, RMP, Salaries/Expense, Expense Details, Referral By, Referral
   Amount, Sales), with Excel import and export.

2. Expenses — a simple Category + Amount tracker (e.g. "Lab Chemicals",
   "Syringe Box"). Combined with Lab Data Entry's Total Amount Paid, this
   drives the dashboard's Income vs Expenses trend and By Category charts.

There is no generic Income/Expenses "Finance Entry" module for Caredx —
that's intentionally not used here; Lab Data Entry + Expenses cover it.
"""
from datetime import datetime, date
from io import BytesIO

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import get_jwt_identity

from models import db, CaredxLabEntry, CaredxExpense
from utils import role_required
from excel_utils import parse_lab_entries_workbook, build_lab_entries_workbook

caredx_bp = Blueprint("caredx", __name__, url_prefix="/api/caredx")


def _parse_date(value, default=None):
    if not value:
        return default
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return default


def _apply_date_filters(query, date_column):
    start_date = _parse_date(request.args.get("start_date"))
    end_date = _parse_date(request.args.get("end_date"))
    if start_date:
        query = query.filter(date_column >= start_date)
    if end_date:
        query = query.filter(date_column <= end_date)
    return query


# ---------------------------------------------------------------------------
# 1. Lab Data Entry (Date / Patient / Test / Cash / Online / Sales / etc.)
# ---------------------------------------------------------------------------

def _lab_entry_from_payload(data, existing=None):
    """Builds/updates a CaredxLabEntry from a JSON payload. Returns
    (entry_kwargs, errors)."""
    errors = []

    entry_date = _parse_date(data.get("entry_date"))
    patient_name = (data.get("patient_name") or "").strip()
    test_name = (data.get("test_name") or "").strip()

    if not entry_date:
        errors.append("date is required (YYYY-MM-DD).")
    if not patient_name:
        errors.append("Name of the Patient is required.")
    if not test_name:
        errors.append("Name of the Test is required.")

    numeric_fields = [
        "total_amount_paid", "cash", "online", "paid_to_other_labs",
        "rmp", "salaries_expense", "referral_amount", "sales",
    ]
    parsed_numbers = {}
    for field in numeric_fields:
        raw = data.get(field, 0)
        try:
            parsed_numbers[field] = float(raw) if raw not in (None, "") else 0.0
            if parsed_numbers[field] < 0:
                errors.append(f"{field} cannot be negative.")
        except (TypeError, ValueError):
            errors.append(f"{field} must be a number.")
            parsed_numbers[field] = 0.0

    kwargs = {
        "entry_date": entry_date,
        "patient_name": patient_name,
        "test_name": test_name,
        "employee_name": (data.get("employee_name") or "").strip() or None,
        "expense_details": (data.get("expense_details") or "").strip() or None,
        "referral_by": (data.get("referral_by") or "").strip() or None,
        **parsed_numbers,
    }
    return kwargs, errors


@caredx_bp.route("/lab-entries", methods=["POST"])
@role_required("Caredx")
def create_lab_entry():
    data = request.get_json(silent=True) or {}
    kwargs, errors = _lab_entry_from_payload(data)
    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    entry = CaredxLabEntry(created_by_id=get_jwt_identity(), **kwargs)
    db.session.add(entry)
    db.session.commit()
    return jsonify({"message": "Lab entry created.", "entry": entry.to_dict()}), 201


@caredx_bp.route("/lab-entries", methods=["GET"])
@role_required("Caredx")
def list_lab_entries():
    query = _apply_date_filters(CaredxLabEntry.query, CaredxLabEntry.entry_date)

    search = request.args.get("search")
    if search:
        like = f"%{search}%"
        query = query.filter(
            (CaredxLabEntry.patient_name.ilike(like))
            | (CaredxLabEntry.test_name.ilike(like))
            | (CaredxLabEntry.employee_name.ilike(like))
        )

    query = query.order_by(CaredxLabEntry.entry_date.desc(), CaredxLabEntry.id.desc())
    return jsonify({"entries": [e.to_dict() for e in query.all()]}), 200


@caredx_bp.route("/lab-entries/<int:entry_id>", methods=["PUT"])
@role_required("Caredx")
def update_lab_entry(entry_id):
    entry = CaredxLabEntry.query.get(entry_id)
    if not entry:
        return jsonify({"message": "Lab entry not found."}), 404

    data = request.get_json(silent=True) or {}
    # Fall back to existing values for any field not included in the payload
    # so a partial edit doesn't wipe the rest of the row.
    merged = entry.to_dict()
    merged.update(data)
    kwargs, errors = _lab_entry_from_payload(merged)
    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    for key, value in kwargs.items():
        setattr(entry, key, value)

    db.session.commit()
    return jsonify({"message": "Lab entry updated.", "entry": entry.to_dict()}), 200


@caredx_bp.route("/lab-entries/<int:entry_id>", methods=["DELETE"])
@role_required("Caredx")
def delete_lab_entry(entry_id):
    entry = CaredxLabEntry.query.get(entry_id)
    if not entry:
        return jsonify({"message": "Lab entry not found."}), 404
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Lab entry deleted."}), 200


@caredx_bp.route("/lab-entries/import", methods=["POST"])
@role_required("Caredx")
def import_lab_entries():
    """Upload an .xlsx file matching the department's lab tracker layout.
    Every recognizable row is inserted into the database."""
    if "file" not in request.files:
        return jsonify({"message": "No file uploaded. Attach it under the 'file' field."}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"message": "No file selected."}), 400
    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        return jsonify({"message": "Please upload a .xlsx file."}), 400

    try:
        rows, parse_errors = parse_lab_entries_workbook(BytesIO(file.read()))
    except Exception:
        return jsonify({"message": "Could not read that file. Please upload a valid .xlsx export of the tracker."}), 400

    if not rows and parse_errors and "Could not find" in parse_errors[0]:
        return jsonify({"message": parse_errors[0]}), 400

    user_id = get_jwt_identity()
    imported = 0
    for row in rows:
        entry = CaredxLabEntry(created_by_id=user_id, **row)
        db.session.add(entry)
        imported += 1
    db.session.commit()

    return jsonify({
        "message": f"Imported {imported} row(s).",
        "imported": imported,
        "skipped": len(parse_errors),
        "errors": parse_errors[:20],
    }), 200


@caredx_bp.route("/lab-entries/export", methods=["GET"])
@role_required("Caredx")
def export_lab_entries():
    query = _apply_date_filters(CaredxLabEntry.query, CaredxLabEntry.entry_date)
    entries = query.order_by(CaredxLabEntry.entry_date.asc(), CaredxLabEntry.id.asc()).all()

    workbook_stream = build_lab_entries_workbook(entries)

    start_date = request.args.get("start_date") or "all"
    end_date = request.args.get("end_date") or "time"
    filename = f"Caredx_Lab_Entries_{start_date}_to_{end_date}.xlsx"

    return send_file(
        workbook_stream,
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


# ---------------------------------------------------------------------------
# 2. Expenses (Category + Amount tracker)
# ---------------------------------------------------------------------------

@caredx_bp.route("/expenses", methods=["POST"])
@role_required("Caredx")
def create_expense():
    data = request.get_json(silent=True) or {}

    expense_date = _parse_date(data.get("expense_date"), default=date.today())
    category = (data.get("category") or "").strip()
    amount = data.get("amount")
    remarks = data.get("remarks", "")

    errors = []
    if not category:
        errors.append("category is required.")
    try:
        amount = float(amount)
        if amount <= 0:
            errors.append("amount must be greater than 0.")
    except (TypeError, ValueError):
        errors.append("amount must be a number.")

    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    expense = CaredxExpense(
        expense_date=expense_date,
        category=category,
        amount=amount,
        remarks=remarks,
        created_by_id=get_jwt_identity(),
    )
    db.session.add(expense)
    db.session.commit()
    return jsonify({"message": "Expense added.", "expense": expense.to_dict()}), 201


@caredx_bp.route("/expenses", methods=["GET"])
@role_required("Caredx")
def list_expenses():
    query = _apply_date_filters(CaredxExpense.query, CaredxExpense.expense_date)

    search = request.args.get("search")
    if search:
        like = f"%{search}%"
        query = query.filter(
            (CaredxExpense.category.ilike(like)) | (CaredxExpense.remarks.ilike(like))
        )

    query = query.order_by(CaredxExpense.expense_date.desc(), CaredxExpense.id.desc())
    return jsonify({"expenses": [e.to_dict() for e in query.all()]}), 200


@caredx_bp.route("/expenses/<int:expense_id>", methods=["PUT"])
@role_required("Caredx")
def update_expense(expense_id):
    expense = CaredxExpense.query.get(expense_id)
    if not expense:
        return jsonify({"message": "Expense not found."}), 404

    data = request.get_json(silent=True) or {}
    if "category" in data and data["category"].strip():
        expense.category = data["category"].strip()
    if "amount" in data:
        try:
            amount = float(data["amount"])
            if amount > 0:
                expense.amount = amount
        except (TypeError, ValueError):
            pass
    if "remarks" in data:
        expense.remarks = data["remarks"]
    if "expense_date" in data:
        parsed = _parse_date(data["expense_date"])
        if parsed:
            expense.expense_date = parsed

    db.session.commit()
    return jsonify({"message": "Expense updated.", "expense": expense.to_dict()}), 200


@caredx_bp.route("/expenses/<int:expense_id>", methods=["DELETE"])
@role_required("Caredx")
def delete_expense(expense_id):
    expense = CaredxExpense.query.get(expense_id)
    if not expense:
        return jsonify({"message": "Expense not found."}), 404
    db.session.delete(expense)
    db.session.commit()
    return jsonify({"message": "Expense deleted."}), 200


# ---------------------------------------------------------------------------
# 3. Combined dashboard summary — Lab Data Entry income + Expenses
# ---------------------------------------------------------------------------

@caredx_bp.route("/lab-entries/summary", methods=["GET"])
@role_required("Caredx")
def lab_entries_summary():
    """Powers the whole Caredx dashboard: the stat cards, the Income vs
    Expenses trend (Income = Total Amount Paid from Lab Data Entry per day,
    Expenses = the Expenses tracker per day), and the By Category chart
    (Expenses grouped by category)."""
    lab_entries = _apply_date_filters(CaredxLabEntry.query, CaredxLabEntry.entry_date).all()
    expenses = _apply_date_filters(CaredxExpense.query, CaredxExpense.expense_date).all()

    def total(field):
        return sum(float(getattr(e, field) or 0) for e in lab_entries)

    total_expenses = sum(float(e.amount or 0) for e in expenses)

    # Income vs Expenses trend, grouped by date.
    by_date = {}
    for e in lab_entries:
        key = e.entry_date.isoformat()
        by_date.setdefault(key, {"date": key, "income": 0, "expenses": 0})
        by_date[key]["income"] += float(e.total_amount_paid or 0)
    for e in expenses:
        key = e.expense_date.isoformat()
        by_date.setdefault(key, {"date": key, "income": 0, "expenses": 0})
        by_date[key]["expenses"] += float(e.amount or 0)
    trend = sorted(by_date.values(), key=lambda x: x["date"])

    # By Category — expense categories (matches the department's own
    # "Expenses Categories" tracker).
    by_category = {}
    for e in expenses:
        by_category.setdefault(e.category, {"category": e.category, "amount": 0})
        by_category[e.category]["amount"] += float(e.amount or 0)

    return jsonify({
        "entry_count": len(lab_entries),
        "total_amount_paid": total("total_amount_paid"),
        "total_cash": total("cash"),
        "total_online": total("online"),
        "total_paid_to_other_labs": total("paid_to_other_labs"),
        "total_rmp": total("rmp"),
        "total_salaries_expense": total("salaries_expense"),
        "total_referral_amount": total("referral_amount"),
        "total_sales": total("sales"),
        "total_expenses": total_expenses,
        "expense_count": len(expenses),
        "trend": trend,
        "category_breakdown": list(by_category.values()),
    }), 200
