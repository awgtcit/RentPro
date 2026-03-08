"""User, Role, Permission models and association tables."""

from datetime import datetime, timezone
from extensions import db


class Role(db.Model):
    __tablename__ = 'roles'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False, index=True)
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    permissions = db.relationship('Permission', secondary='role_permissions', back_populates='roles', lazy='selectin')
    users = db.relationship('User', secondary='user_roles', back_populates='roles', lazy='selectin')

    def to_dict(self):
        return {"id": self.id, "name": self.name, "description": self.description}


class Permission(db.Model):
    __tablename__ = 'permissions'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.String(255))
    module = db.Column(db.String(50), nullable=False, index=True)

    roles = db.relationship('Role', secondary='role_permissions', back_populates='permissions', lazy='selectin')

    def to_dict(self):
        return {"id": self.id, "key": self.key, "description": self.description, "module": self.module}


class UserRole(db.Model):
    __tablename__ = 'user_roles'

    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)


class RolePermission(db.Model):
    __tablename__ = 'role_permissions'

    role_id = db.Column(db.Integer, db.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
    permission_id = db.Column(db.Integer, db.ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    roles = db.relationship('Role', secondary='user_roles', back_populates='users', lazy='selectin')

    def to_dict(self, include_roles=True):
        data = {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "phone": self.phone,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_roles:
            data["roles"] = [r.to_dict() for r in self.roles]
        return data

    @property
    def role_names(self):
        return [r.name for r in self.roles]

    @property
    def permission_keys(self):
        keys = set()
        for role in self.roles:
            for perm in role.permissions:
                keys.add(perm.key)
        return keys
