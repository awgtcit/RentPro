"""Maintenance request model."""

from datetime import datetime, timezone
from extensions import db


class MaintenanceRequest(db.Model):
    __tablename__ = 'maintenance_requests'

    id = db.Column(db.Integer, primary_key=True)
    building_id = db.Column(db.Integer, db.ForeignKey('buildings.id', ondelete='CASCADE'), nullable=False, index=True)
    flat_id = db.Column(db.Integer, db.ForeignKey('flats.id', ondelete='SET NULL'), nullable=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id', ondelete='SET NULL'), nullable=True)
    reported_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    priority = db.Column(db.String(20), nullable=False, default='medium', index=True)  # low, medium, high, urgent
    status = db.Column(db.String(20), nullable=False, default='open', index=True)  # open, in_progress, completed, cancelled
    cost = db.Column(db.BigInteger, default=0)  # cents
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    building = db.relationship('Building')
    flat = db.relationship('Flat')
    room = db.relationship('Room')
    reporter = db.relationship('User')

    def to_dict(self):
        return {
            "id": self.id,
            "building_id": self.building_id,
            "building_name": self.building.name if self.building else None,
            "flat_id": self.flat_id,
            "flat_number": self.flat.flat_number if self.flat else None,
            "room_id": self.room_id,
            "room_number": self.room.room_number if self.room else None,
            "reported_by": self.reported_by,
            "reporter_name": f"{self.reporter.first_name} {self.reporter.last_name}" if self.reporter else None,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "status": self.status,
            "cost": self.cost,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
