"""Auth routes — login, refresh, me."""

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.auth_service import authenticate, refresh_tokens
from middlewares import require_auth
from db import transaction
from audit import log_action

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"error": "Username and password required"}), 400
    try:
        with transaction():
            user, access_token, refresh_token = authenticate(data['username'], data['password'])
            log_action('auth.login', 'user', user.id)
        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user.to_dict(),
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 401


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    try:
        access_token, refresh_token = refresh_tokens(identity)
        return jsonify({"access_token": access_token, "refresh_token": refresh_token})
    except ValueError as e:
        return jsonify({"error": str(e)}), 401


@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    from repositories import UserRepo
    user = UserRepo.get_by_id(g.actor.id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())
