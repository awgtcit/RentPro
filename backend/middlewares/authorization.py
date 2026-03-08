"""Authorization middleware — RBAC permission and ownership checks."""

from functools import wraps
from flask import g, jsonify


def require_role(*allowed_roles):
    """Decorator that checks if the actor has at least one of the specified roles."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            actor = getattr(g, 'actor', None)
            if not actor or not actor.is_authenticated:
                return jsonify({"error": "Authentication required", "code": "AUTH_REQUIRED"}), 401
            if not any(role in actor.roles for role in allowed_roles):
                return jsonify({"error": "Insufficient permissions", "code": "FORBIDDEN"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def require_permission(*required_permissions):
    """Decorator that checks if the actor has all specified permission keys."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            actor = getattr(g, 'actor', None)
            if not actor or not actor.is_authenticated:
                return jsonify({"error": "Authentication required", "code": "AUTH_REQUIRED"}), 401
            if not all(perm in actor.permissions for perm in required_permissions):
                return jsonify({"error": "Insufficient permissions", "code": "FORBIDDEN"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def require_ownership(resource_user_id_getter):
    """Decorator that checks resource ownership OR admin access.

    Args:
        resource_user_id_getter: callable(kwargs) → user_id that owns the resource.
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            actor = getattr(g, 'actor', None)
            if not actor or not actor.is_authenticated:
                return jsonify({"error": "Authentication required", "code": "AUTH_REQUIRED"}), 401
            if actor.is_admin:
                return f(*args, **kwargs)
            owner_id = resource_user_id_getter(kwargs)
            if owner_id != actor.id:
                return jsonify({"error": "Access denied", "code": "FORBIDDEN"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
