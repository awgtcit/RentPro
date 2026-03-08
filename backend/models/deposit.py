"""Deposit and deposit transaction models."""

from datetime import datetime, timezone
from extensions import db


class Deposit(db.Model):
    __tablename__ = 'deposits'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id', ondelete='RESTRICT'), nullable=False, index=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id', ondelete='RESTRICT'), nullable=False, index=True)
    amount = db.Column(db.BigInteger, nullable=False)  # cents
    balance = db.Column(db.BigInteger, nullable=False)  # cents — remaining after deductions
    status = db.Column(db.String(30), nullable=False, default='held')  # held, partially_refunded, refunded, forfeited
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    tenant = db.relationship('Tenant')
    assignment = db.relationship('Assignment')
    transactions = db.relationship('DepositTransaction', back_populates='deposit', lazy='selectin', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "tenant_name": self.tenant.full_name if self.tenant else None,
            "assignment_id": self.assignment_id,
            "amount": self.amount,
            "balance": self.balance,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "transactions": [t.to_dict() for t in self.transactions],
        }


class DepositTransaction(db.Model):
    __tablename__ = 'deposit_transactions'

    id = db.Column(db.Integer, primary_key=True)
    deposit_id = db.Column(db.Integer, db.ForeignKey('deposits.id', ondelete='CASCADE'), nullable=False, index=True)
    transaction_type = db.Column(db.String(20), nullable=False)  # deposit, deduction, refund
    amount = db.Column(db.BigInteger, nullable=False)  # cents
    reason = db.Column(db.String(500))
    processed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    deposit = db.relationship('Deposit', back_populates='transactions')

    def to_dict(self):
        return {
            "id": self.id,
            "deposit_id": self.deposit_id,
            "transaction_type": self.transaction_type,
            "amount": self.amount,
            "reason": self.reason,
            "processed_by": self.processed_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
