"""Dashboard routes — KPIs and vacancy data."""

from flask import Blueprint, jsonify
from middlewares import require_auth
from services import dashboard_service

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('', methods=['GET'])
@require_auth
def get_dashboard():
    stats = dashboard_service.get_dashboard_stats()
    return jsonify(stats)


@dashboard_bp.route('/vacancy', methods=['GET'])
@require_auth
def get_vacancy():
    return jsonify(dashboard_service.get_vacancy_report())
