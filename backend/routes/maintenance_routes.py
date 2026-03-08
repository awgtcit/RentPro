"""Maintenance request routes."""

from flask import Blueprint, request, jsonify, g
from middlewares import require_auth
from middlewares.authorization import require_permission
from repositories import MaintenanceRepo
from audit import log_action
from db import transaction
from datetime import datetime, timezone

maintenance_bp = Blueprint('maintenance', __name__)


@maintenance_bp.route('', methods=['GET'])
@require_auth
def list_requests():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    filters = {}
    for key in ('building_id', 'flat_id', 'status', 'priority'):
        val = request.args.get(key)
        if val:
            filters[key] = int(val) if key.endswith('_id') else val
    return jsonify(MaintenanceRepo.get_all(page=page, per_page=per_page, filters=filters))


@maintenance_bp.route('/<int:mid>', methods=['GET'])
@require_auth
def get_request(mid):
    m = MaintenanceRepo.get_by_id(mid)
    if not m:
        return jsonify({"error": "Maintenance request not found"}), 404
    return jsonify(m.to_dict())


@maintenance_bp.route('', methods=['POST'])
@require_auth
@require_permission('properties.manage')
def create_request():
    data = request.get_json(silent=True)
    if not data or not data.get('building_id') or not data.get('title'):
        return jsonify({"error": "building_id and title required"}), 400
    data['reported_by'] = g.actor.id
    with transaction():
        m = MaintenanceRepo.create(**data)
        log_action('maintenance.create', 'maintenance_request', m.id, new_value=m.to_dict())
    return jsonify(m.to_dict()), 201


@maintenance_bp.route('/<int:mid>', methods=['PUT'])
@require_auth
@require_permission('properties.manage')
def update_request(mid):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body required"}), 400
    old = MaintenanceRepo.get_by_id(mid)
    if not old:
        return jsonify({"error": "Not found"}), 404
    old_snap = old.to_dict()
    # If completing, set timestamp
    if data.get('status') == 'completed' and old.status != 'completed':
        data['completed_at'] = datetime.now(timezone.utc)
    try:
        with transaction():
            m = MaintenanceRepo.update(mid, **data)
            log_action('maintenance.update', 'maintenance_request', mid,
                       old_value=old_snap, new_value=m.to_dict())
        return jsonify(m.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 400
