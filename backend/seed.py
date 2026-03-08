"""Database seed script — creates roles, permissions, and initial admin user."""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db
from models.user import User, Role, Permission, RolePermission, UserRole
import bcrypt

PERMISSIONS = [
    # Properties
    ('properties.view', 'View properties', 'properties'),
    ('properties.manage', 'Create/edit/delete properties', 'properties'),
    # Tenants
    ('tenants.view', 'View tenants', 'tenants'),
    ('tenants.manage', 'Create/edit tenants', 'tenants'),
    # Assignments
    ('assignments.view', 'View assignments', 'assignments'),
    ('assignments.manage', 'Create/end/transfer assignments', 'assignments'),
    # Payments
    ('payments.view', 'View invoices and payments', 'payments'),
    ('payments.collect', 'Collect payments', 'payments'),
    ('payments.manage', 'Generate invoices, fees, adjustments', 'payments'),
    # Reports
    ('reports.view', 'View reports and dashboard', 'reports'),
    # Users
    ('users.view', 'View users', 'users'),
    ('users.manage', 'Create/edit users', 'users'),
    # Audit
    ('audit.view', 'View audit logs', 'audit'),
    # Settings
    ('settings.manage', 'Manage system settings', 'settings'),
]

ROLES = {
    'Admin': {
        'description': 'Full system access',
        'permissions': [p[0] for p in PERMISSIONS],  # all
    },
    'Manager': {
        'description': 'Property and tenant management',
        'permissions': [
            'properties.view', 'properties.manage',
            'tenants.view', 'tenants.manage',
            'assignments.view', 'assignments.manage',
            'payments.view', 'payments.collect', 'payments.manage',
            'reports.view',
        ],
    },
    'Cashier': {
        'description': 'Payment collection only',
        'permissions': [
            'tenants.view',
            'assignments.view',
            'payments.view', 'payments.collect',
        ],
    },
    'Viewer': {
        'description': 'Read-only access',
        'permissions': [
            'properties.view',
            'tenants.view',
            'assignments.view',
            'payments.view',
            'reports.view',
        ],
    },
}


def seed():
    app = create_app()
    with app.app_context():
        # Create tables
        db.create_all()

        # Seed permissions
        perm_map = {}
        for key, desc, module in PERMISSIONS:
            perm = Permission.query.filter_by(key=key).first()
            if not perm:
                perm = Permission(key=key, description=desc, module=module)
                db.session.add(perm)
                db.session.flush()
            perm_map[key] = perm
        print(f"  {len(PERMISSIONS)} permissions seeded")

        # Seed roles
        for role_name, info in ROLES.items():
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                role = Role(name=role_name, description=info['description'])
                db.session.add(role)
                db.session.flush()
            # Assign permissions
            for perm_key in info['permissions']:
                rp = RolePermission.query.filter_by(role_id=role.id, permission_id=perm_map[perm_key].id).first()
                if not rp:
                    db.session.add(RolePermission(role_id=role.id, permission_id=perm_map[perm_key].id))
        print(f"  {len(ROLES)} roles seeded")

        # Seed admin user
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            pw_hash = bcrypt.hashpw('admin123'.encode(), bcrypt.gensalt()).decode()
            admin = User(
                username='admin',
                email='admin@rent.local',
                password_hash=pw_hash,
                first_name='System',
                last_name='Admin',
                is_active=True,
            )
            db.session.add(admin)
            db.session.flush()
            admin_role = Role.query.filter_by(name='Admin').first()
            db.session.add(UserRole(user_id=admin.id, role_id=admin_role.id))
            print("  Admin user created (admin / admin123)")
        else:
            print("  Admin user already exists")

        db.session.commit()
        print("Seed complete.")


if __name__ == '__main__':
    seed()
