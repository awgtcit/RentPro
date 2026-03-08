"""Settings routes — roles, permissions, audit log viewing."""

from flask import Blueprint, request, jsonify
from middlewares import require_auth
from middlewares.authorization import require_role
from repositories import RoleRepo, PermissionRepo, AuditLogRepo

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/roles', methods=['GET'])
@require_auth
@require_role('Admin')
def list_roles():
    roles = RoleRepo.get_all(page=1, per_page=100)
    return jsonify(roles)


@settings_bp.route('/permissions', methods=['GET'])
@require_auth
@require_role('Admin')
def list_permissions():
    perms = PermissionRepo.get_all(page=1, per_page=200)
    return jsonify(perms)


@settings_bp.route('/audit-logs', methods=['GET'])
@require_auth
@require_role('Admin')
def list_audit_logs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    filters = {}
    for key in ('action', 'entity_type', 'user_id'):
        val = request.args.get(key)
        if val:
            filters[key] = int(val) if key == 'user_id' else val
    return jsonify(AuditLogRepo.get_all(page=page, per_page=per_page, filters=filters))
