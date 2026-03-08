"""Invoice and Payment models with allocation table."""

from datetime import datetime, timezone
from extensions import db


class Invoice(db.Model):
    __tablename__ = 'invoices'

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id', ondelete='RESTRICT'), nullable=False, index=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id', ondelete='RESTRICT'), nullable=False, index=True)
    billing_period_start = db.Column(db.Date, nullable=False)
    billing_period_end = db.Column(db.Date, nullable=False)
    rent_amount = db.Column(db.BigInteger, nullable=False)  # cents
    extra_charges = db.Column(db.BigInteger, default=0)
    discount = db.Column(db.BigInteger, default=0)
    late_fee = db.Column(db.BigInteger, default=0)
    total_due = db.Column(db.BigInteger, nullable=False)  # cents
    paid_amount = db.Column(db.BigInteger, default=0)  # cents
    balance = db.Column(db.BigInteger, nullable=False)  # cents
    status = db.Column(db.String(20), nullable=False, default='draft', index=True)
    # statuses: draft, sent, paid, partial, overdue, cancelled
    due_date = db.Column(db.Date, nullable=False, index=True)
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index('ix_invoice_tenant_period', 'tenant_id', 'billing_period_start', 'billing_period_end'),
        db.Index('ix_invoice_status_due', 'status', 'due_date'),
    )

    tenant = db.relationship('Tenant')
    assignment = db.relationship('Assignment', back_populates='invoices')
    items = db.relationship('InvoiceItem', back_populates='invoice', lazy='selectin', cascade='all, delete-orphan')
    allocations = db.relationship('PaymentAllocation', back_populates='invoice', lazy='dynamic')

    def to_dict(self, include_items=True):
        data = {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "tenant_id": self.tenant_id,
            "tenant_name": self.tenant.full_name if self.tenant else None,
            "assignment_id": self.assignment_id,
            "unit_label": self.assignment.unit_label if self.assignment else None,
            "billing_period_start": self.billing_period_start.isoformat() if self.billing_period_start else None,
            "billing_period_end": self.billing_period_end.isoformat() if self.billing_period_end else None,
            "rent_amount": self.rent_amount,
            "extra_charges": self.extra_charges,
            "discount": self.discount,
            "late_fee": self.late_fee,
            "total_due": self.total_due,
            "paid_amount": self.paid_amount,
            "balance": self.balance,
            "status": self.status,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "notes": self.notes,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_items:
            data["items"] = [i.to_dict() for i in self.items]
        return data


class InvoiceItem(db.Model):
    __tablename__ = 'invoice_items'

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False, index=True)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.BigInteger, nullable=False)  # cents, negative for discounts
    item_type = db.Column(db.String(20), nullable=False)  # charge, discount, late_fee

    invoice = db.relationship('Invoice', back_populates='items')

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "description": self.description,
            "amount": self.amount,
            "item_type": self.item_type,
        }


class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    receipt_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id', ondelete='RESTRICT'), nullable=False, index=True)
    payment_date = db.Column(db.Date, nullable=False, index=True)
    amount = db.Column(db.BigInteger, nullable=False)  # cents
    payment_method = db.Column(db.String(30), nullable=False)  # cash, bank_transfer, cheque, card, online
    reference_number = db.Column(db.String(100))
    collected_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    tenant = db.relationship('Tenant')
    collector = db.relationship('User')
    allocations = db.relationship('PaymentAllocation', back_populates='payment', lazy='selectin', cascade='all, delete-orphan')

    def to_dict(self, include_allocations=True):
        data = {
            "id": self.id,
            "receipt_number": self.receipt_number,
            "tenant_id": self.tenant_id,
            "tenant_name": self.tenant.full_name if self.tenant else None,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "amount": self.amount,
            "payment_method": self.payment_method,
            "reference_number": self.reference_number,
            "collected_by": self.collected_by,
            "collector_name": f"{self.collector.first_name} {self.collector.last_name}" if self.collector else None,
            "remarks": self.remarks,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_allocations:
            data["allocations"] = [a.to_dict() for a in self.allocations]
        return data

    @property
    def allocated_amount(self):
        return sum(a.amount for a in self.allocations)

    @property
    def unallocated_amount(self):
        return self.amount - self.allocated_amount


class PaymentAllocation(db.Model):
    __tablename__ = 'payment_allocations'

    id = db.Column(db.Integer, primary_key=True)
    payment_id = db.Column(db.Integer, db.ForeignKey('payments.id', ondelete='CASCADE'), nullable=False, index=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id', ondelete='RESTRICT'), nullable=False, index=True)
    amount = db.Column(db.BigInteger, nullable=False)  # cents
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    payment = db.relationship('Payment', back_populates='allocations')
    invoice = db.relationship('Invoice', back_populates='allocations')

    def to_dict(self):
        return {
            "id": self.id,
            "payment_id": self.payment_id,
            "invoice_id": self.invoice_id,
            "invoice_number": self.invoice.invoice_number if self.invoice else None,
            "amount": self.amount,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
