# backend/routes/salesenterprise.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db, SalesEnterpriseKPI
from utils import role_required

salesenterprise_bp = Blueprint("salesenterprise", __name__, url_prefix="/api/salesenterprise")

@salesenterprise_bp.route("/kpis", methods=["GET"])
@role_required("SalesEnterprise")
def get_kpis():
    """Return all KPI records, optionally filtered by year/quarter."""
    year = request.args.get("year", type=int)
    quarter = request.args.get("quarter")  # "Q1","Q2","Q3","Q4"
    query = SalesEnterpriseKPI.query
    if year:
        query = query.filter_by(year=year)
    if quarter:
        query = query.filter_by(quarter=quarter)
    kpis = query.order_by(SalesEnterpriseKPI.year.desc(), SalesEnterpriseKPI.quarter.desc()).all()
    return jsonify({"kpis": [k.to_dict() for k in kpis]}), 200

@salesenterprise_bp.route("/kpis", methods=["POST"])
@role_required("SalesEnterprise")
def create_kpi():
    data = request.get_json(silent=True) or {}
    # Validate required fields
    if not data.get("year") or not data.get("quarter"):
        return jsonify({"message": "Year and quarter are required."}), 400

    # Check for duplicate
    existing = SalesEnterpriseKPI.query.filter_by(
        year=data["year"], quarter=data["quarter"]
    ).first()
    if existing:
        return jsonify({"message": "KPI for this quarter already exists. Use PUT to update."}), 409

    kpi = SalesEnterpriseKPI(
        year=data["year"],
        quarter=data["quarter"],
        revenue_growth=data.get("revenue_growth"),
        win_rate=data.get("win_rate"),
        stage_conversion=data.get("stage_conversion"),
        pipeline_coverage=data.get("pipeline_coverage"),
        sales_cycle_length=data.get("sales_cycle_length"),
        cac=data.get("cac"),
        rep_productivity=data.get("rep_productivity"),
        ramp_time=data.get("ramp_time"),
        lead_response_time=data.get("lead_response_time"),
        nrr=data.get("nrr"),
        quota_attainment=data.get("quota_attainment"),
        forecast_accuracy=data.get("forecast_accuracy"),
        created_by_id=get_jwt_identity(),
    )
    db.session.add(kpi)
    db.session.commit()
    return jsonify({"message": "KPI created", "kpi": kpi.to_dict()}), 201

@salesenterprise_bp.route("/kpis/<int:kpi_id>", methods=["PUT"])
@role_required("SalesEnterprise")
def update_kpi(kpi_id):
    kpi = SalesEnterpriseKPI.query.get(kpi_id)
    if not kpi:
        return jsonify({"message": "KPI not found."}), 404
    data = request.get_json(silent=True) or {}
    # Update fields if provided
    for field in [
        "revenue_growth", "win_rate", "stage_conversion", "pipeline_coverage",
        "sales_cycle_length", "cac", "rep_productivity", "ramp_time",
        "lead_response_time", "nrr", "quota_attainment", "forecast_accuracy"
    ]:
        if field in data and data[field] is not None:
            setattr(kpi, field, data[field])
    db.session.commit()
    return jsonify({"message": "KPI updated", "kpi": kpi.to_dict()}), 200

@salesenterprise_bp.route("/kpis/<int:kpi_id>", methods=["DELETE"])
@role_required("SalesEnterprise")
def delete_kpi(kpi_id):
    kpi = SalesEnterpriseKPI.query.get(kpi_id)
    if not kpi:
        return jsonify({"message": "KPI not found."}), 404
    db.session.delete(kpi)
    db.session.commit()
    return jsonify({"message": "KPI deleted."}), 200