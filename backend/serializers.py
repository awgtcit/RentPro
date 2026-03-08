"""Serialization helpers — to_dict for all models."""

from models.user import User, Role, Permission
from models.property import Building, Flat, Room, Bedspace
from models.tenant import Tenant, TenantDocument
from models.assignment import Assignment
from models.billing import Invoice, InvoiceItem, Payment, PaymentAllocation
from models.deposit import Deposit, DepositTransaction
from models.maintenance import MaintenanceRequest
from models.audit import AuditLog
from models.notification import Notification


def _dt(val):
    return val.isoformat() if val else None


def _date(val):
    return val.isoformat() if val else None


def _cents_to_str(cents):
    """Convert cents integer to decimal string for JSON."""
    if cents is None:
        return None
    return f"{cents / 100:.2f}"


# ── User ──────────────────────────────────────────────────
def user_to_dict(self):
    return {
        "id": self.id,
        "username": self.username,
        "email": self.email,
        "first_name": self.first_name,
        "last_name": self.last_name,
        "phone": self.phone,
        "is_active": self.is_active,
        "roles": self.role_names,
        "created_at": _dt(self.created_at),
    }

User.to_dict = user_to_dict


def role_to_dict(self):
    return {
        "id": self.id,
        "name": self.name,
        "description": self.description,
        "permissions": [rp.permission.key for rp in self.role_permissions] if hasattr(self, 'role_permissions') else [],
    }

Role.to_dict = role_to_dict


def permission_to_dict(self):
    return {"id": self.id, "key": self.key, "description": self.description, "module": self.module}

Permission.to_dict = permission_to_dict


# ── Property ──────────────────────────────────────────────
def building_to_dict(self):
    return {
        "id": self.id,
        "name": self.name,
        "address": self.address,
        "city": self.city,
        "country": self.country,
        "total_flats": self.total_flats,
        "notes": self.notes,
        "is_active": self.is_active,
        "created_at": _dt(self.created_at),
    }

Building.to_dict = building_to_dict


def flat_to_dict(self):
    return {
        "id": self.id,
        "building_id": self.building_id,
        "building_name": self.building.name if self.building else None,
        "flat_number": self.flat_number,
        "floor": self.floor,
        "flat_type": self.flat_type,
        "total_rooms": self.total_rooms,
        "rent_amount": _cents_to_str(self.rent_amount),
        "is_active": self.is_active,
        "notes": self.notes,
        "created_at": _dt(self.created_at),
    }

Flat.to_dict = flat_to_dict


def room_to_dict(self):
    return {
        "id": self.id,
        "flat_id": self.flat_id,
        "flat_number": self.flat.flat_number if self.flat else None,
        "room_number": self.room_number,
        "room_type": self.room_type,
        "capacity": self.capacity,
        "rent_amount": _cents_to_str(self.rent_amount),
        "is_active": self.is_active,
        "notes": self.notes,
        "created_at": _dt(self.created_at),
    }

Room.to_dict = room_to_dict


def bedspace_to_dict(self):
    flat = self.room.flat if self.room else None
    return {
        "id": self.id,
        "room_id": self.room_id,
        "room_number": self.room.room_number if self.room else None,
        "flat_id": flat.id if flat else None,
        "flat_number": flat.flat_number if flat else None,
        "bedspace_code": self.bedspace_code,
        "rent_amount": _cents_to_str(self.rent_amount),
        "is_active": self.is_active,
        "notes": self.notes,
        "created_at": _dt(self.created_at),
    }

Bedspace.to_dict = bedspace_to_dict


# ── Tenant ────────────────────────────────────────────────
def tenant_to_dict(self):
    return {
        "id": self.id,
        "first_name": self.first_name,
        "last_name": self.last_name,
        "full_name": f"{self.first_name} {self.last_name}",
        "email": self.email,
        "phone": self.phone,
        "nationality": self.nationality,
        "id_type": self.id_type,
        "id_number": self.id_number,
        "id_expiry": _date(self.id_expiry),
        "emergency_contact_name": self.emergency_contact_name,
        "emergency_contact_phone": self.emergency_contact_phone,
        "date_of_birth": _date(self.date_of_birth),
        "notes": self.notes,
        "is_active": self.is_active,
        "created_at": _dt(self.created_at),
    }

Tenant.to_dict = tenant_to_dict


def tenant_doc_to_dict(self):
    return {
        "id": self.id,
        "tenant_id": self.tenant_id,
        "document_type": self.document_type,
        "file_name": self.file_name,
        "file_size": self.file_size,
        "mime_type": self.mime_type,
        "created_at": _dt(self.created_at),
    }

TenantDocument.to_dict = tenant_doc_to_dict


# ── Assignment ────────────────────────────────────────────
def assignment_to_dict(self):
    return {
        "id": self.id,
        "tenant_id": self.tenant_id,
        "tenant_name": f"{self.tenant.first_name} {self.tenant.last_name}" if self.tenant else None,
        "assignment_type": self.assignment_type,
        "building_id": self.building_id,
        "flat_id": self.flat_id,
        "room_id": self.room_id,
        "bedspace_id": self.bedspace_id,
        "unit_label": self.unit_label,
        "start_date": _date(self.start_date),
        "end_date": _date(self.end_date),
        "rent_amount": _cents_to_str(self.rent_amount),
        "deposit_amount": _cents_to_str(self.deposit_amount),
        "billing_cycle": self.billing_cycle,
        "billing_day": self.billing_day,
        "status": self.status,
        "notes": self.notes,
        "created_at": _dt(self.created_at),
    }

Assignment.to_dict = assignment_to_dict


# ── Invoice ───────────────────────────────────────────────
def invoice_to_dict(self, include_items=True):
    d = {
        "id": self.id,
        "invoice_number": self.invoice_number,
        "tenant_id": self.tenant_id,
        "tenant_name": f"{self.tenant.first_name} {self.tenant.last_name}" if self.tenant else None,
        "assignment_id": self.assignment_id,
        "billing_period_start": _date(self.billing_period_start),
        "billing_period_end": _date(self.billing_period_end),
        "rent_amount": _cents_to_str(self.rent_amount),
        "extra_charges": _cents_to_str(self.extra_charges),
        "discount": _cents_to_str(self.discount),
        "late_fee": _cents_to_str(self.late_fee),
        "total_due": _cents_to_str(self.total_due),
        "paid_amount": _cents_to_str(self.paid_amount),
        "balance": _cents_to_str(self.balance),
        "status": self.status,
        "due_date": _date(self.due_date),
        "notes": self.notes,
        "created_at": _dt(self.created_at),
    }
    if include_items:
        d["items"] = [item.to_dict() for item in self.items]
    return d

Invoice.to_dict = invoice_to_dict


def invoice_item_to_dict(self):
    return {
        "id": self.id,
        "description": self.description,
        "amount": _cents_to_str(self.amount),
        "item_type": self.item_type,
    }

InvoiceItem.to_dict = invoice_item_to_dict


# ── Payment ───────────────────────────────────────────────
def payment_to_dict(self, include_allocations=True):
    result = {
        "id": self.id,
        "receipt_number": self.receipt_number,
        "tenant_id": self.tenant_id,
        "tenant_name": f"{self.tenant.first_name} {self.tenant.last_name}" if self.tenant else None,
        "payment_date": _date(self.payment_date),
        "amount": _cents_to_str(self.amount),
        "payment_method": self.payment_method,
        "reference_number": self.reference_number,
        "collected_by": self.collected_by,
        "remarks": self.remarks,
        "created_at": _dt(self.created_at),
    }
    if include_allocations:
        result["allocations"] = [a.to_dict() for a in self.allocations]
    return result

Payment.to_dict = payment_to_dict


def payment_alloc_to_dict(self):
    return {
        "id": self.id,
        "invoice_id": self.invoice_id,
        "invoice_number": self.invoice.invoice_number if self.invoice else None,
        "amount": _cents_to_str(self.amount),
    }

PaymentAllocation.to_dict = payment_alloc_to_dict


# ── Deposit ───────────────────────────────────────────────
def deposit_to_dict(self):
    return {
        "id": self.id,
        "tenant_id": self.tenant_id,
        "assignment_id": self.assignment_id,
        "amount": _cents_to_str(self.amount),
        "balance": _cents_to_str(self.balance),
        "status": self.status,
        "transactions": [t.to_dict() for t in self.transactions],
        "created_at": _dt(self.created_at),
    }

Deposit.to_dict = deposit_to_dict


def deposit_tx_to_dict(self):
    return {
        "id": self.id,
        "transaction_type": self.transaction_type,
        "amount": _cents_to_str(self.amount),
        "reason": self.reason,
        "processed_by": self.processed_by,
        "created_at": _dt(self.created_at),
    }

DepositTransaction.to_dict = deposit_tx_to_dict


# ── Maintenance ───────────────────────────────────────────
def maintenance_to_dict(self):
    return {
        "id": self.id,
        "building_id": self.building_id,
        "flat_id": self.flat_id,
        "room_id": self.room_id,
        "title": self.title,
        "description": self.description,
        "priority": self.priority,
        "status": self.status,
        "cost": _cents_to_str(self.cost),
        "reported_by": self.reported_by,
        "completed_at": _dt(self.completed_at),
        "created_at": _dt(self.created_at),
    }

MaintenanceRequest.to_dict = maintenance_to_dict


# ── Audit ─────────────────────────────────────────────────
def audit_to_dict(self):
    return {
        "id": self.id,
        "user_id": self.user_id,
        "action": self.action,
        "entity_type": self.entity_type,
        "entity_id": self.entity_id,
        "old_value": self.old_value,
        "new_value": self.new_value,
        "ip_address": self.ip_address,
        "created_at": _dt(self.created_at),
    }

AuditLog.to_dict = audit_to_dict


# ── Notification ──────────────────────────────────────────
def notification_to_dict(self):
    return {
        "id": self.id,
        "tenant_id": self.tenant_id,
        "user_id": self.user_id,
        "type": self.type,
        "title": self.title,
        "message": self.message,
        "is_read": self.is_read,
        "sent_at": _dt(self.sent_at),
        "created_at": _dt(self.created_at),
    }

Notification.to_dict = notification_to_dict
