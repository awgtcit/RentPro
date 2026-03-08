"""Assignment routes — create, end, transfer, list."""

from datetime import date
from flask import Blueprint, request, jsonify, g
from middlewares import require_auth
from middlewares.authorization import require_permission
from services import assignment_service
from repositories import AssignmentRepo
from rules import RuleViolation
from db import transaction

assignment_bp = Blueprint('assignments', __name__)


@assignment_bp.route('', methods=['GET'])
@require_auth
def list_assignments():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    filters = {}
    for key in ('tenant_id', 'building_id', 'flat_id', 'room_id', 'bedspace_id', 'status', 'assignment_type'):
        val = request.args.get(key)
        if val:
            filters[key] = int(val) if key.endswith('_id') else val
    return jsonify(assignment_service.list_assignments(page, per_page, filters))


@assignment_bp.route('/<int:aid>', methods=['GET'])
@require_auth
def get_assignment(aid):
    a = AssignmentRepo.get_by_id(aid)
    if not a:
        return jsonify({"error": "Assignment not found"}), 404
    return jsonify(a.to_dict())


@assignment_bp.route('', methods=['POST'])
@require_auth
@require_permission('tenants.manage')
def create_assignment():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body required"}), 400
    required = ['tenant_id', 'assignment_type', 'building_id', 'flat_id', 'rent_amount', 'start_date']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # Parse dates
    try:
        data['start_date'] = date.fromisoformat(data['start_date'])
        if data.get('end_date'):
            data['end_date'] = date.fromisoformat(data['end_date'])
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    try:
        with transaction():
            assignment = assignment_service.create_assignment(data, g.actor)
        return jsonify(assignment.to_dict()), 201
    except RuleViolation as e:
        return jsonify({"error": e.message, "code": e.code}), 409
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@assignment_bp.route('/<int:aid>/end', methods=['POST'])
@require_auth
@require_permission('tenants.manage')
def end_assignment(aid):
    data = request.get_json(silent=True) or {}
    end_date_val = None
    if data.get('end_date'):
        try:
            end_date_val = date.fromisoformat(data['end_date'])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid date format"}), 400
    try:
        with transaction():
            a = assignment_service.end_assignment(aid, end_date_val, g.actor)
        return jsonify(a.to_dict())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@assignment_bp.route('/<int:aid>/transfer', methods=['POST'])
@require_auth
@require_permission('tenants.manage')
def transfer_assignment(aid):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "New assignment data required"}), 400
    required = ['tenant_id', 'assignment_type', 'building_id', 'flat_id', 'rent_amount', 'start_date']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    try:
        data['start_date'] = date.fromisoformat(data['start_date'])
        if data.get('end_date'):
            data['end_date'] = date.fromisoformat(data['end_date'])
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid date format"}), 400
    try:
        with transaction():
            new_a = assignment_service.transfer_tenant(aid, data, g.actor)
        return jsonify(new_a.to_dict()), 201
    except (RuleViolation, ValueError) as e:
        msg = e.message if isinstance(e, RuleViolation) else str(e)
        return jsonify({"error": msg}), 400
