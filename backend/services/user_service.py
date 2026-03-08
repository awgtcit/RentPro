"""User management service."""

from services.auth_service import hash_password
from repositories import UserRepo, RoleRepo
from audit import log_action
from extensions import db


def create_user(data, actor):
    """Create a new user with role assignment."""
    if UserRepo.get_by_username(data['username']):
        raise ValueError("Username already exists")
    if UserRepo.get_by_email(data['email']):
        raise ValueError("Email already exists")

    user = UserRepo.create(
        username=data['username'],
        email=data['email'],
        password_hash=hash_password(data['password']),
        first_name=data['first_name'],
        last_name=data['last_name'],
        phone=data.get('phone'),
    )

    # Assign roles
    for role_name in data.get('roles', ['Viewer']):
        role = RoleRepo.get_by_name(role_name)
        if role:
            user.roles.append(role)

    db.session.flush()
    log_action('user.create', 'user', user.id, new_value=user.to_dict())
    return user


def update_user(user_id, data, actor):
    """Update user details (not password)."""
    old_user = UserRepo.get_by_id(user_id)
    if not old_user:
        raise ValueError("User not found")

    old_snapshot = old_user.to_dict()
    allowed = {'first_name', 'last_name', 'email', 'phone', 'is_active'}
    update_data = {k: v for k, v in data.items() if k in allowed}
    user = UserRepo.update(user_id, **update_data)
    log_action('user.update', 'user', user_id, old_value=old_snapshot, new_value=user.to_dict())
    return user


def change_password(user_id, new_password, actor):
    """Change user password."""
    user = UserRepo.get_by_id(user_id)
    if not user:
        raise ValueError("User not found")
    user.password_hash = hash_password(new_password)
    db.session.flush()
    log_action('user.change_password', 'user', user_id)
    return user
