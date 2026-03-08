"""Deposit routes — view, deduct, refund."""

from flask import Blueprint, request, jsonify, g
from middlewares import require_auth
from middlewares.authorization import require_permission
from services import deposit_service
from repositories import DepositRepo
from db import transaction

deposit_bp = Blueprint('deposits', __name__)


@deposit_bp.route('', methods=['GET'])
@require_auth
def list_deposits():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    filters = {}
    if request.args.get('tenant_id'):
        filters['tenant_id'] = int(request.args['tenant_id'])
    return jsonify(DepositRepo.get_all(page=page, per_page=per_page, filters=filters))


@deposit_bp.route('/<int:did>', methods=['GET'])
@require_auth
def get_deposit(did):
    d = DepositRepo.get_by_id(did)
    if not d:
        return jsonify({"error": "Deposit not found"}), 404
    return jsonify(d.to_dict())


@deposit_bp.route('/<int:did>/deduct', methods=['POST'])
@require_auth
@require_permission('payments.manage')
def deduct(did):
    data = request.get_json(silent=True)
    if not data or not data.get('amount') or not data.get('reason'):
        return jsonify({"error": "amount and reason required"}), 400
    try:
        with transaction():
            d = deposit_service.deduct_from_deposit(did, data['amount'], data['reason'], g.actor)
        return jsonify(d.to_dict())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@deposit_bp.route('/<int:did>/refund', methods=['POST'])
@require_auth
@require_permission('payments.manage')
def refund(did):
    data = request.get_json(silent=True)
    if not data or not data.get('amount') or not data.get('reason'):
        return jsonify({"error": "amount and reason required"}), 400
    try:
        with transaction():
            d = deposit_service.refund_deposit(did, data['amount'], data['reason'], g.actor)
        return jsonify(d.to_dict())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
