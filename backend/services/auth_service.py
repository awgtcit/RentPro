"""Auth service — login, token creation, password hashing."""

import bcrypt
from flask_jwt_extended import create_access_token, create_refresh_token
from repositories import UserRepo


def hash_password(plain_password):
    return bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password, hashed):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed.encode('utf-8'))


def authenticate(username, password):
    """Validate credentials and return (user, access_token, refresh_token) or raise."""
    user = UserRepo.get_by_username(username)
    if not user or not user.is_active:
        raise ValueError("Invalid credentials")
    if not verify_password(password, user.password_hash):
        raise ValueError("Invalid credentials")

    additional_claims = {
        'username': user.username,
        'roles': user.role_names,
        'permissions': list(user.permission_keys),
        'actor_type': 'admin' if 'Admin' in user.role_names else 'user',
    }
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)
    return user, access_token, refresh_token


def refresh_tokens(user_id):
    """Issue fresh tokens for an existing user (refresh flow)."""
    user = UserRepo.get_by_id(int(user_id))
    if not user or not user.is_active:
        raise ValueError("User not found or inactive")
    additional_claims = {
        'username': user.username,
        'roles': user.role_names,
        'permissions': list(user.permission_keys),
        'actor_type': 'admin' if 'Admin' in user.role_names else 'user',
    }
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)
    return access_token, refresh_token
