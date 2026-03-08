"""Report routes — financial and occupancy reports."""

from datetime import date
from flask import Blueprint, request, jsonify
from middlewares import require_auth
from middlewares.authorization import require_permission
from services import dashboard_service

report_bp = Blueprint('reports', __name__)


@report_bp.route('/daily-collection', methods=['GET'])
@require_auth
@require_permission('reports.view')
def daily_collection():
    target = request.args.get('date')
    target_date = date.fromisoformat(target) if target else None
    return jsonify(dashboard_service.get_daily_collection(target_date))


@report_bp.route('/monthly-revenue', methods=['GET'])
@require_auth
@require_permission('reports.view')
def monthly_revenue():
    year = request.args.get('year', date.today().year, type=int)
    month = request.args.get('month', date.today().month, type=int)
    return jsonify(dashboard_service.get_monthly_revenue(year, month))


@report_bp.route('/overdue-tenants', methods=['GET'])
@require_auth
@require_permission('reports.view')
def overdue_tenants():
    return jsonify(dashboard_service.get_overdue_tenants())


@report_bp.route('/occupancy', methods=['GET'])
@require_auth
@require_permission('reports.view')
def occupancy():
    stats = dashboard_service.get_dashboard_stats()
    return jsonify({
        "total_flats": stats["total_flats"],
        "occupied_flats": stats["occupied_flats"],
        "vacant_flats": stats["vacant_flats"],
        "total_rooms": stats["total_rooms"],
        "occupied_rooms": stats["occupied_rooms"],
        "vacant_rooms": stats["vacant_rooms"],
        "total_bedspaces": stats["total_bedspaces"],
        "occupied_bedspaces": stats["occupied_bedspaces"],
        "vacant_bedspaces": stats["vacant_bedspaces"],
        "occupancy_rate": stats["occupancy_rate"],
    })


@report_bp.route('/vacancy', methods=['GET'])
@require_auth
@require_permission('reports.view')
def vacancy():
    return jsonify(dashboard_service.get_vacancy_report())
