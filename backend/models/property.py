"""Property hierarchy models: Building → Flat → Room → Bedspace."""

from datetime import datetime, timezone
from extensions import db


class Building(db.Model):
    __tablename__ = 'buildings'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, index=True)
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    country = db.Column(db.String(100))
    total_flats = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    flats = db.relationship('Flat', back_populates='building', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_flats=False):
        data = {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "city": self.city,
            "country": self.country,
            "total_flats": self.total_flats,
            "notes": self.notes,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_flats:
            data["flats"] = [f.to_dict() for f in self.flats]
        return data


class Flat(db.Model):
    __tablename__ = 'flats'

    id = db.Column(db.Integer, primary_key=True)
    building_id = db.Column(db.Integer, db.ForeignKey('buildings.id', ondelete='CASCADE'), nullable=False, index=True)
    flat_number = db.Column(db.String(20), nullable=False)
    floor = db.Column(db.Integer)
    flat_type = db.Column(db.String(50))  # studio, 1BHK, 2BHK, etc.
    total_rooms = db.Column(db.Integer, default=0)
    rent_amount = db.Column(db.BigInteger, default=0)  # stored in cents
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('building_id', 'flat_number', name='uq_flat_number_per_building'),
    )

    building = db.relationship('Building', back_populates='flats')
    rooms = db.relationship('Room', back_populates='flat', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_rooms=False):
        data = {
            "id": self.id,
            "building_id": self.building_id,
            "flat_number": self.flat_number,
            "floor": self.floor,
            "flat_type": self.flat_type,
            "total_rooms": self.total_rooms,
            "rent_amount": self.rent_amount,
            "is_active": self.is_active,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "building_name": self.building.name if self.building else None,
        }
        if include_rooms:
            data["rooms"] = [r.to_dict() for r in self.rooms]
        return data


class Room(db.Model):
    __tablename__ = 'rooms'

    id = db.Column(db.Integer, primary_key=True)
    flat_id = db.Column(db.Integer, db.ForeignKey('flats.id', ondelete='CASCADE'), nullable=False, index=True)
    room_number = db.Column(db.String(20), nullable=False)
    room_type = db.Column(db.String(50))  # single, double, master, etc.
    capacity = db.Column(db.Integer, default=1, nullable=False)
    rent_amount = db.Column(db.BigInteger, default=0)  # stored in cents
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('flat_id', 'room_number', name='uq_room_number_per_flat'),
    )

    flat = db.relationship('Flat', back_populates='rooms')
    bedspaces = db.relationship('Bedspace', back_populates='room', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_bedspaces=False):
        data = {
            "id": self.id,
            "flat_id": self.flat_id,
            "room_number": self.room_number,
            "room_type": self.room_type,
            "capacity": self.capacity,
            "rent_amount": self.rent_amount,
            "is_active": self.is_active,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "flat_number": self.flat.flat_number if self.flat else None,
        }
        if include_bedspaces:
            data["bedspaces"] = [b.to_dict() for b in self.bedspaces]
        return data


class Bedspace(db.Model):
    __tablename__ = 'bedspaces'

    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False, index=True)
    bedspace_code = db.Column(db.String(20), nullable=False)
    rent_amount = db.Column(db.BigInteger, default=0)  # stored in cents
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('room_id', 'bedspace_code', name='uq_bedspace_code_per_room'),
    )

    room = db.relationship('Room', back_populates='bedspaces')

    def to_dict(self):
        return {
            "id": self.id,
            "room_id": self.room_id,
            "bedspace_code": self.bedspace_code,
            "rent_amount": self.rent_amount,
            "is_active": self.is_active,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "room_number": self.room.room_number if self.room else None,
        }
