"""Transaction manager — ensures service operations run inside a DB transaction with commit/rollback."""

from contextlib import contextmanager
from extensions import db


@contextmanager
def transaction():
    """Context manager for transactional service operations.

    Usage:
        with transaction():
            repo.create(...)
            audit.log_action(...)
        # auto-committed on exit, rolled back on exception
    """
    try:
        yield db.session
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
