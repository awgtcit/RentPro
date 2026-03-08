"""Audit logger — records who/what/when for sensitive actions."""

import json
from flask import g, request
from extensions import db
from models.audit import AuditLog


REDACTED_FIELDS = {'password', 'password_hash', 'token', 'secret'}


def _redact(data):
    """Remove sensitive fields from audit snapshots."""
    if not isinstance(data, dict):
        return data
    return {k: '***REDACTED***' if k in REDACTED_FIELDS else v for k, v in data.items()}


def log_action(action, entity_type, entity_id=None, old_value=None, new_value=None):
    """Create an immutable audit record.

    Args:
        action: e.g. 'tenant.create', 'payment.collect', 'assignment.end'
        entity_type: e.g. 'tenant', 'invoice', 'payment'
        entity_id: primary key of the affected entity
        old_value: dict snapshot before change (will be JSON-serialized)
        new_value: dict snapshot after change (will be JSON-serialized)
    """
    actor = getattr(g, 'actor', None)
    entry = AuditLog(
        user_id=actor.id if actor and actor.is_authenticated else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=json.dumps(_redact(old_value), default=str) if old_value else None,
        new_value=json.dumps(_redact(new_value), default=str) if new_value else None,
        ip_address=request.remote_addr if request else None,
        user_agent=(request.headers.get('User-Agent', '')[:500]) if request else None,
    )
    db.session.add(entry)
    # Flushed with the enclosing transaction — not committed standalone
