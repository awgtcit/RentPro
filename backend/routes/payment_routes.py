"""Payment routes — collect, list, receipt."""

from datetime import date
from flask import Blueprint, request, jsonify, g
from middlewares import require_auth
from middlewares.authorization import require_permission
from services import payment_service
from db import transaction

payment_bp = Blueprint('payments', __name__)


@payment_bp.route('', methods=['GET'])
@require_auth
def list_payments():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    filters = {}
    if request.args.get('tenant_id'):
        filters['tenant_id'] = int(request.args['tenant_id'])
    return jsonify(payment_service.list_payments(page, per_page, filters))


@payment_bp.route('', methods=['POST'])
@require_auth
@require_permission('payments.collect')
def collect_payment():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body required"}), 400
    required = ['tenant_id', 'amount', 'payment_method']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    # Parse date
    if data.get('payment_date'):
        try:
            data['payment_date'] = date.fromisoformat(data['payment_date'])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid date format"}), 400
    try:
        with transaction():
            payment = payment_service.collect_payment(data, g.actor)
        return jsonify(payment.to_dict()), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@payment_bp.route('/<int:pid>/receipt', methods=['GET'])
@require_auth
def get_receipt(pid):
    try:
        receipt = payment_service.get_receipt(pid)
        return jsonify(receipt)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
