"""Repositories for all domain entities."""

from repositories.base import BaseRepository
from models.user import User, Role, Permission
from models.property import Building, Flat, Room, Bedspace
from models.tenant import Tenant, TenantDocument
from models.assignment import Assignment
from models.billing import Invoice, InvoiceItem, Payment, PaymentAllocation
from models.deposit import Deposit, DepositTransaction
from models.maintenance import MaintenanceRequest
from models.audit import AuditLog
from models.notification import Notification
from extensions import db
from sqlalchemy import func, and_, or_
from datetime import date


class UserRepo(BaseRepository):
    model = User

    @classmethod
    def get_by_username(cls, username):
        return User.query.filter_by(username=username).first()

    @classmethod
    def get_by_email(cls, email):
        return User.query.filter_by(email=email).first()


class RoleRepo(BaseRepository):
    model = Role

    @classmethod
    def get_by_name(cls, name):
        return Role.query.filter_by(name=name).first()


class PermissionRepo(BaseRepository):
    model = Permission


class BuildingRepo(BaseRepository):
    model = Building


class FlatRepo(BaseRepository):
    model = Flat

    @classmethod
    def get_by_building(cls, building_id, page=1, per_page=25):
        return cls.get_all(page=page, per_page=per_page, filters={'building_id': building_id})


class RoomRepo(BaseRepository):
    model = Room

    @classmethod
    def get_by_flat(cls, flat_id, page=1, per_page=25):
        return cls.get_all(page=page, per_page=per_page, filters={'flat_id': flat_id})


class BedspaceRepo(BaseRepository):
    model = Bedspace

    @classmethod
    def get_by_room(cls, room_id, page=1, per_page=25):
        return cls.get_all(page=page, per_page=per_page, filters={'room_id': room_id})


class TenantRepo(BaseRepository):
    model = Tenant

    @classmethod
    def search(cls, query_str, page=1, per_page=25):
        q = Tenant.query.filter(
            or_(
                Tenant.first_name.ilike(f'%{query_str}%'),
                Tenant.last_name.ilike(f'%{query_str}%'),
                Tenant.phone.ilike(f'%{query_str}%'),
                Tenant.id_number.ilike(f'%{query_str}%'),
                Tenant.email.ilike(f'%{query_str}%'),
            )
        ).order_by(Tenant.id.desc())
        pagination = q.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [t.to_dict() for t in pagination.items],
            "total": pagination.total,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "pages": pagination.pages,
        }


class TenantDocumentRepo(BaseRepository):
    model = TenantDocument


class AssignmentRepo(BaseRepository):
    model = Assignment

    @classmethod
    def get_active_for_tenant(cls, tenant_id):
        return Assignment.query.filter_by(tenant_id=tenant_id, status='active').all()

    @classmethod
    def get_active_for_flat(cls, flat_id):
        return Assignment.query.filter_by(flat_id=flat_id, status='active').all()

    @classmethod
    def get_active_for_room(cls, room_id):
        return Assignment.query.filter_by(room_id=room_id, status='active').all()

    @classmethod
    def get_active_for_bedspace(cls, bedspace_id):
        return Assignment.query.filter_by(bedspace_id=bedspace_id, status='active').all()


class InvoiceRepo(BaseRepository):
    model = Invoice

    @classmethod
    def get_next_invoice_number(cls):
        last = Invoice.query.order_by(Invoice.id.desc()).first()
        seq = (last.id + 1) if last else 1
        return f"INV-{seq:06d}"

    @classmethod
    def get_overdue(cls, as_of=None):
        if as_of is None:
            as_of = date.today()
        return Invoice.query.filter(
            Invoice.status.in_(['sent', 'partial']),
            Invoice.due_date < as_of,
        ).order_by(Invoice.due_date.asc()).all()

    @classmethod
    def get_by_tenant(cls, tenant_id, page=1, per_page=25):
        return cls.get_all(page=page, per_page=per_page, filters={'tenant_id': tenant_id}, order_by='-due_date')

    @classmethod
    def get_unpaid_for_tenant(cls, tenant_id):
        return Invoice.query.filter(
            Invoice.tenant_id == tenant_id,
            Invoice.status.in_(['sent', 'partial', 'overdue']),
            Invoice.balance > 0,
        ).order_by(Invoice.due_date.asc()).all()


class InvoiceItemRepo(BaseRepository):
    model = InvoiceItem


class PaymentRepo(BaseRepository):
    model = Payment

    @classmethod
    def get_next_receipt_number(cls):
        last = Payment.query.order_by(Payment.id.desc()).first()
        seq = (last.id + 1) if last else 1
        return f"RCP-{seq:06d}"

    @classmethod
    def get_by_tenant(cls, tenant_id, page=1, per_page=25):
        return cls.get_all(page=page, per_page=per_page, filters={'tenant_id': tenant_id}, order_by='-payment_date')

    @classmethod
    def get_daily_collection(cls, target_date=None):
        if target_date is None:
            target_date = date.today()
        total = db.session.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.payment_date == target_date
        ).scalar()
        return total


class PaymentAllocationRepo(BaseRepository):
    model = PaymentAllocation


class DepositRepo(BaseRepository):
    model = Deposit

    @classmethod
    def get_by_assignment(cls, assignment_id):
        return Deposit.query.filter_by(assignment_id=assignment_id).first()


class DepositTransactionRepo(BaseRepository):
    model = DepositTransaction


class MaintenanceRepo(BaseRepository):
    model = MaintenanceRequest


class AuditLogRepo(BaseRepository):
    model = AuditLog

    @classmethod
    def get_for_entity(cls, entity_type, entity_id, page=1, per_page=25):
        return cls.get_all(page=page, per_page=per_page,
                           filters={'entity_type': entity_type, 'entity_id': entity_id},
                           order_by='-created_at')


class NotificationRepo(BaseRepository):
    model = Notification
