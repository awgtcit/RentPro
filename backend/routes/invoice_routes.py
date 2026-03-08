"""Invoice routes — generate, list, manage invoices."""

from datetime import date
from flask import Blueprint, request, jsonify, g
from middlewares import require_auth
from middlewares.authorization import require_permission
from services import billing_service
from repositories import InvoiceRepo
from db import transaction

invoice_bp = Blueprint('invoices', __name__)


@invoice_bp.route('', methods=['GET'])
@require_auth
def list_invoices():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    filters = {}
    for key in ('tenant_id', 'assignment_id', 'status'):
        val = request.args.get(key)
        if val:
            filters[key] = int(val) if key.endswith('_id') else val
    return jsonify(InvoiceRepo.get_all(page=page, per_page=per_page, filters=filters, order_by='-due_date'))


@invoice_bp.route('/<int:iid>', methods=['GET'])
@require_auth
def get_invoice(iid):
    inv = InvoiceRepo.get_by_id(iid)
    if not inv:
        return jsonify({"error": "Invoice not found"}), 404
    return jsonify(inv.to_dict())


@invoice_bp.route('/generate', methods=['POST'])
@require_auth
@require_permission('payments.manage')
def generate_invoice():
    data = request.get_json(silent=True)
    if not data or not data.get('assignment_id'):
        return jsonify({"error": "assignment_id required"}), 400
    try:
        period_start = date.fromisoformat(data['period_start']) if data.get('period_start') else None
        period_end = date.fromisoformat(data['period_end']) if data.get('period_end') else None
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid date format"}), 400
    try:
        with transaction():
            inv = billing_service.generate_invoice(data['assignment_id'], period_start, period_end, g.actor)
        return jsonify(inv.to_dict()), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@invoice_bp.route('/generate-batch', methods=['POST'])
@require_auth
@require_permission('payments.manage')
def generate_batch():
    try:
        with transaction():
            invoices = billing_service.generate_monthly_invoices(g.actor)
        return jsonify({"generated": len(invoices), "invoices": [i.to_dict() for i in invoices]}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@invoice_bp.route('/<int:iid>/late-fee', methods=['POST'])
@require_auth
@require_permission('payments.manage')
def add_late_fee(iid):
    data = request.get_json(silent=True)
    if not data or not data.get('amount'):
        return jsonify({"error": "amount required"}), 400
    try:
        with transaction():
            inv = billing_service.apply_late_fee(iid, data['amount'], g.actor)
        return jsonify(inv.to_dict())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@invoice_bp.route('/<int:iid>/extra-charge', methods=['POST'])
@require_auth
@require_permission('payments.manage')
def add_extra_charge(iid):
    data = request.get_json(silent=True)
    if not data or not data.get('amount') or not data.get('description'):
        return jsonify({"error": "amount and description required"}), 400
    try:
        with transaction():
            inv = billing_service.add_extra_charge(iid, data['description'], data['amount'], g.actor)
        return jsonify(inv.to_dict())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@invoice_bp.route('/<int:iid>/discount', methods=['POST'])
@require_auth
@require_permission('payments.manage')
def apply_discount(iid):
    data = request.get_json(silent=True)
    if not data or not data.get('amount') or not data.get('description'):
        return jsonify({"error": "amount and description required"}), 400
    try:
        with transaction():
            inv = billing_service.apply_discount(iid, data['description'], data['amount'], g.actor)
        return jsonify(inv.to_dict())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@invoice_bp.route('/overdue', methods=['GET'])
@require_auth
def list_overdue():
    invoices = InvoiceRepo.get_overdue()
    return jsonify([i.to_dict(include_items=False) for i in invoices])
