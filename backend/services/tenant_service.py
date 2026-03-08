"""Tenant management service."""

import os
import uuid
from flask import current_app
from werkzeug.utils import secure_filename
from repositories import TenantRepo, TenantDocumentRepo
from audit import log_action


ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}


def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def create_tenant(data, actor):
    tenant = TenantRepo.create(**data)
    log_action('tenant.create', 'tenant', tenant.id, new_value=tenant.to_dict())
    return tenant


def update_tenant(tenant_id, data, actor):
    old = TenantRepo.get_by_id(tenant_id)
    if not old:
        raise ValueError("Tenant not found")
    old_snap = old.to_dict()
    tenant = TenantRepo.update(tenant_id, **data)
    log_action('tenant.update', 'tenant', tenant_id, old_value=old_snap, new_value=tenant.to_dict())
    return tenant


def list_tenants(page=1, per_page=25, filters=None):
    return TenantRepo.get_all(page=page, per_page=per_page, filters=filters)


def search_tenants(query_str, page=1, per_page=25):
    return TenantRepo.search(query_str, page=page, per_page=per_page)


def upload_document(tenant_id, file, document_type, actor_id):
    tenant = TenantRepo.get_by_id(tenant_id)
    if not tenant:
        raise ValueError("Tenant not found")
    if not _allowed_file(file.filename):
        raise ValueError("File type not allowed")

    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    rel_dir = os.path.join('tenants', str(tenant_id))
    abs_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], rel_dir)
    os.makedirs(abs_dir, exist_ok=True)
    file_path = os.path.join(abs_dir, unique_name)
    file.save(file_path)

    doc = TenantDocumentRepo.create(
        tenant_id=tenant_id,
        document_type=document_type,
        file_name=filename,
        file_path=os.path.join(rel_dir, unique_name),
        file_size=os.path.getsize(file_path),
        mime_type=file.content_type,
        uploaded_by=actor_id,
    )
    log_action('document.upload', 'tenant_document', doc.id, new_value=doc.to_dict())
    return doc
