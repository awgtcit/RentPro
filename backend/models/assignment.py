"""Assignment model — tenant-to-unit (flat/room/bedspace) assignments."""

from datetime import datetime, timezone
from extensions import db


class Assignment(db.Model):
    __tablename__ = 'assignments'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id', ondelete='RESTRICT'), nullable=False, index=True)
    assignment_type = db.Column(db.String(20), nullable=False, index=True)  # flat, room, bedspace
    building_id = db.Column(db.Integer, db.ForeignKey('buildings.id', ondelete='RESTRICT'), nullable=False, index=True)
    flat_id = db.Column(db.Integer, db.ForeignKey('flats.id', ondelete='RESTRICT'), nullable=False, index=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id', ondelete='RESTRICT'), nullable=True, index=True)
    bedspace_id = db.Column(db.Integer, db.ForeignKey('bedspaces.id', ondelete='RESTRICT'), nullable=True, index=True)

    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    rent_amount = db.Column(db.BigInteger, nullable=False)  # cents
    deposit_amount = db.Column(db.BigInteger, default=0)  # cents
    billing_cycle = db.Column(db.String(20), nullable=False, default='monthly')  # monthly, weekly, custom
    billing_day = db.Column(db.Integer, default=1)  # day of month/week for billing
    status = db.Column(db.String(20), nullable=False, default='active', index=True)  # active, ended, transferred

    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index('ix_assignment_active_unit', 'assignment_type', 'flat_id', 'room_id', 'bedspace_id', 'status'),
    )

    tenant = db.relationship('Tenant', back_populates='assignments')
    building = db.relationship('Building')
    flat = db.relationship('Flat')
    room = db.relationship('Room')
    bedspace = db.relationship('Bedspace')
    invoices = db.relationship('Invoice', back_populates='assignment', lazy='dynamic')

    def to_dict(self):
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "tenant_name": self.tenant.full_name if self.tenant else None,
            "assignment_type": self.assignment_type,
            "building_id": self.building_id,
            "building_name": self.building.name if self.building else None,
            "flat_id": self.flat_id,
            "flat_number": self.flat.flat_number if self.flat else None,
            "room_id": self.room_id,
            "room_number": self.room.room_number if self.room else None,
            "bedspace_id": self.bedspace_id,
            "bedspace_code": self.bedspace.bedspace_code if self.bedspace else None,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "rent_amount": self.rent_amount,
            "deposit_amount": self.deposit_amount,
            "billing_cycle": self.billing_cycle,
            "billing_day": self.billing_day,
            "status": self.status,
            "notes": self.notes,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @property
    def unit_label(self):
        """Human-readable label for the assigned unit."""
        parts = []
        if self.building:
            parts.append(self.building.name)
        if self.flat:
            parts.append(f"Flat {self.flat.flat_number}")
        if self.room:
            parts.append(f"Room {self.room.room_number}")
        if self.bedspace:
            parts.append(f"Bed {self.bedspace.bedspace_code}")
        return " / ".join(parts)
