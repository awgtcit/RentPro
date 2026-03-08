"""Authentication middleware — builds ActorContext from JWT."""

from functools import wraps
from flask import g, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt


class ActorContext:
    """Represents the authenticated (or anonymous) actor for the current request."""

    def __init__(self, actor_type='anonymous', actor_id=None, username=None, roles=None, permissions=None):
        self.type = actor_type
        self.id = actor_id
        self.username = username
        self.roles = roles or []
        self.permissions = permissions or set()
        self.ip = request.remote_addr if request else None
        self.user_agent = request.headers.get('User-Agent', '')[:500] if request else ''

    @property
    def is_admin(self):
        return 'Admin' in self.roles

    @property
    def is_authenticated(self):
        return self.type != 'anonymous'


def build_actor_context():
    """Build ActorContext from JWT claims. Called as before_request hook."""
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            claims = get_jwt()
            g.actor = ActorContext(
                actor_type=claims.get('actor_type', 'user'),
                actor_id=int(identity),
                username=claims.get('username'),
                roles=claims.get('roles', []),
                permissions=set(claims.get('permissions', [])),
            )
        else:
            g.actor = ActorContext()
    except Exception:
        g.actor = ActorContext()


def require_auth(f):
    """Decorator requiring a valid JWT."""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            identity = get_jwt_identity()
            claims = get_jwt()
            g.actor = ActorContext(
                actor_type=claims.get('actor_type', 'user'),
                actor_id=int(identity),
                username=claims.get('username'),
                roles=claims.get('roles', []),
                permissions=set(claims.get('permissions', [])),
            )
        except Exception:
            return jsonify({"error": "Authentication required", "code": "AUTH_REQUIRED"}), 401
        return f(*args, **kwargs)
    return decorated
