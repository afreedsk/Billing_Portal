from flask import Blueprint, request, jsonify
from sqlalchemy import func

from models import db, User, FinanceEntry, CaredxLabEntry, CaredxExpense, ROLES, VALID_DEPARTMENTS
from utils import role_required

superadmin_bp = Blueprint("superadmin", __name__, url_prefix="/api/admin")


@superadmin_bp.route("/roles", methods=["GET"])
@role_required("SuperAdmin")
def roles():
    return jsonify({"roles": ROLES}), 200


@superadmin_bp.route("/users", methods=["GET"])
@role_required("SuperAdmin")
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200


@superadmin_bp.route("/users", methods=["POST"])
@role_required("SuperAdmin")
def create_user():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = data.get("role")
    department = data.get("department", role)

    errors = []
    if not name:
        errors.append("Name is required.")
    if not email:
        errors.append("Email is required.")
    if len(password) < 6:
        errors.append("Password must be at least 6 characters.")
    if role not in ROLES:
        errors.append(f"Role must be one of: {', '.join(ROLES)}.")
    if email and User.query.filter_by(email=email).first():
        errors.append("A user with this email already exists.")

    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    user = User(name=name, email=email, role=role, department=department)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created.", "user": user.to_dict()}), 201


@superadmin_bp.route("/users/<int:user_id>", methods=["PUT"])
@role_required("SuperAdmin")
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found."}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data and data["name"].strip():
        user.name = data["name"].strip()
    if "role" in data and data["role"] in ROLES:
        user.role = data["role"]
    if "department" in data:
        user.department = data["department"]
    if "is_active" in data:
        user.is_active = bool(data["is_active"])
    if "password" in data and data["password"]:
        if len(data["password"]) < 6:
            return jsonify({"message": "Password must be at least 6 characters."}), 400
        user.set_password(data["password"])

    db.session.commit()
    return jsonify({"message": "User updated.", "user": user.to_dict()}), 200


@superadmin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@role_required("SuperAdmin")
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found."}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted."}), 200


@superadmin_bp.route("/team-stats", methods=["GET"])
@role_required("SuperAdmin")
def team_stats():
    """Total members overall and broken down per role/department."""
    total_members = User.query.count()
    rows = (
        db.session.query(User.role, func.count(User.id))
        .group_by(User.role)
        .all()
    )
    by_role = [{"role": r, "count": c} for r, c in rows]

    return jsonify({
        "total_members": total_members,
        "by_role": by_role,
    }), 200


@superadmin_bp.route("/overview", methods=["GET"])
@role_required("SuperAdmin")
def overview():
    """High level snapshot across the platform for the SuperAdmin dashboard:
    total/active members, platform-wide income/expenses/profit, and a
    breakdown of income/expenses/profit per department (IT, PCM, MedTech,
    Caredx).

    NOTE: Caredx doesn't use the generic FinanceEntry table — its income
    comes from CaredxLabEntry.total_amount_paid and its expenses from
    CaredxExpense.amount, so those are queried separately below.
    """
    total_members = User.query.count()
    active_members = User.query.filter_by(is_active=True).count()

    def sum_for(department, entry_type):
        query = db.session.query(func.coalesce(func.sum(FinanceEntry.amount), 0)).filter(
            FinanceEntry.entry_type == entry_type
        )
        if department is not None:
            query = query.filter(FinanceEntry.department == department)
        return float(query.scalar())

    def caredx_income():
        return float(db.session.query(func.coalesce(func.sum(CaredxLabEntry.total_amount_paid), 0)).scalar())

    def caredx_expenses():
        return float(db.session.query(func.coalesce(func.sum(CaredxExpense.amount), 0)).scalar())

    by_department = []
    for dept in VALID_DEPARTMENTS:
        if dept == "Caredx":
            income = caredx_income()
            expenses = caredx_expenses()
        else:
            income = sum_for(dept, "Income")
            expenses = sum_for(dept, "Expenses")
        by_department.append({
            "department": dept,
            "income": income,
            "expenses": expenses,
            "profit": income - expenses,
        })

    total_income = sum(d["income"] for d in by_department)
    total_expenses = sum(d["expenses"] for d in by_department)

    return jsonify({
        "total_members": total_members,
        "active_members": active_members,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "total_profit": total_income - total_expenses,
        "by_department": by_department,
    }), 200
