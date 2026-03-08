"""Tenant routes — CRUD, search, document upload."""

from datetime import date as date_type
from flask import Blueprint, request, jsonify, g, send_from_directory, current_app
from middlewares import require_auth
from middlewares.authorization import require_permission
from services import tenant_service
from repositories import TenantRepo
from db import transaction
import os


def _sanitize_tenant_data(data):
    """Convert empty strings to None and parse date strings for date fields."""
    date_fields = ['id_expiry', 'date_of_birth']
    str_fields = ['emergency_contact_name', 'emergency_contact_phone', 'notes']
    for f in date_fields:
        val = data.get(f)
        if val == '' or val is None:
            data[f] = None
        elif isinstance(val, str):
            data[f] = date_type.fromisoformat(val)
    for f in str_fields:
        if data.get(f) == '':
            data[f] = None
    return data

tenant_bp = Blueprint('tenants', __name__)


@tenant_bp.route('', methods=['GET'])
@require_auth
def list_tenants():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    search = request.args.get('search')
    if search:
        return jsonify(tenant_service.search_tenants(search, page, per_page))
    filters = {}
    if request.args.get('is_active') is not None:
        filters['is_active'] = request.args.get('is_active', 'true').lower() == 'true'
    return jsonify(tenant_service.list_tenants(page, per_page, filters))


@tenant_bp.route('/<int:tid>', methods=['GET'])
@require_auth
def get_tenant(tid):
    t = TenantRepo.get_by_id(tid)
    if not t:
        return jsonify({"error": "Tenant not found"}), 404
    return jsonify(t.to_dict(include_documents=True))


@tenant_bp.route('', methods=['POST'])
@require_auth
@require_permission('tenants.manage')
def create_tenant():
    data = request.get_json(silent=True)
    if not data or not data.get('first_name') or not data.get('last_name'):
        return jsonify({"error": "first_name and last_name required"}), 400
    data = _sanitize_tenant_data(data)
    with transaction():
        t = tenant_service.create_tenant(data, g.actor)
    return jsonify(t.to_dict()), 201


@tenant_bp.route('/<int:tid>', methods=['PUT'])
@require_auth
@require_permission('tenants.manage')
def update_tenant(tid):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body required"}), 400
    data = _sanitize_tenant_data(data)
    try:
        with transaction():
            t = tenant_service.update_tenant(tid, data, g.actor)
        return jsonify(t.to_dict())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@tenant_bp.route('/<int:tid>/documents', methods=['POST'])
@require_auth
@require_permission('tenants.manage')
def upload_document(tid):
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    doc_type = request.form.get('document_type', 'general')
    try:
        with transaction():
            doc = tenant_service.upload_document(tid, file, doc_type, g.actor.id)
        return jsonify(doc.to_dict()), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@tenant_bp.route('/<int:tid>/documents/<int:doc_id>/download', methods=['GET'])
@require_auth
def download_document(tid, doc_id):
    from repositories import TenantDocumentRepo
    doc = TenantDocumentRepo.get_by_id(doc_id)
    if not doc or doc.tenant_id != tid:
        return jsonify({"error": "Document not found"}), 404
    upload_folder = current_app.config['UPLOAD_FOLDER']
    directory = os.path.dirname(os.path.join(upload_folder, doc.file_path))
    filename = os.path.basename(doc.file_path)
    return send_from_directory(directory, filename, as_attachment=True, download_name=doc.file_name)
