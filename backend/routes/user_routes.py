"""User management routes — CRUD for system users (Admin only)."""

from flask import Blueprint, request, jsonify, g
from middlewares import require_auth
from middlewares.authorization import require_role
from services import user_service
from repositories import UserRepo
from db import transaction

user_bp = Blueprint('users', __name__)


@user_bp.route('', methods=['GET'])
@require_auth
@require_role('Admin')
def list_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    result = UserRepo.get_all(page=page, per_page=per_page)
    return jsonify(result)


@user_bp.route('/<int:user_id>', methods=['GET'])
@require_auth
@require_role('Admin')
def get_user(user_id):
    user = UserRepo.get_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())


@user_bp.route('', methods=['POST'])
@require_auth
@require_role('Admin')
def create_user():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body required"}), 400
    required = ['username', 'email', 'password', 'first_name', 'last_name']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    try:
        with transaction():
            user = user_service.create_user(data, g.actor)
        return jsonify(user.to_dict()), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@user_bp.route('/<int:user_id>', methods=['PUT'])
@require_auth
@require_role('Admin')
def update_user(user_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body required"}), 400
    try:
        with transaction():
            user = user_service.update_user(user_id, data, g.actor)
        return jsonify(user.to_dict())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@user_bp.route('/<int:user_id>/password', methods=['PUT'])
@require_auth
@require_role('Admin')
def change_password(user_id):
    data = request.get_json(silent=True)
    if not data or not data.get('password'):
        return jsonify({"error": "New password required"}), 400
    try:
        with transaction():
            user_service.change_password(user_id, data['password'], g.actor)
        return jsonify({"message": "Password updated"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
