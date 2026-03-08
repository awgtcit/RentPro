"""Base repository with common CRUD helpers using parameterized ORM queries."""

from extensions import db


class BaseRepository:
    """Generic repository providing standard CRUD operations for a SQLAlchemy model."""

    model = None  # override in subclass

    @classmethod
    def get_by_id(cls, entity_id):
        return db.session.get(cls.model, entity_id)

    @classmethod
    def get_all(cls, page=1, per_page=25, filters=None, order_by=None):
        query = cls.model.query
        if filters:
            for attr, value in filters.items():
                if value is not None and hasattr(cls.model, attr):
                    col = getattr(cls.model, attr)
                    if isinstance(value, str):
                        query = query.filter(col.ilike(f'%{value}%'))
                    else:
                        query = query.filter(col == value)
        if order_by:
            col = getattr(cls.model, order_by.lstrip('-'), None)
            if col is not None:
                query = query.order_by(col.desc() if order_by.startswith('-') else col.asc())
        else:
            query = query.order_by(cls.model.id.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [item.to_dict() for item in pagination.items],
            "total": pagination.total,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "pages": pagination.pages,
        }

    @classmethod
    def create(cls, **kwargs):
        instance = cls.model(**kwargs)
        db.session.add(instance)
        db.session.flush()  # get ID without committing — transaction manager commits
        return instance

    @classmethod
    def update(cls, entity_id, **kwargs):
        instance = cls.get_by_id(entity_id)
        if not instance:
            return None
        for key, value in kwargs.items():
            if hasattr(instance, key) and key not in ('id', 'created_at'):
                setattr(instance, key, value)
        db.session.flush()
        return instance

    @classmethod
    def delete(cls, entity_id):
        instance = cls.get_by_id(entity_id)
        if instance:
            db.session.delete(instance)
            db.session.flush()
            return True
        return False

    @classmethod
    def count(cls, filters=None):
        query = cls.model.query
        if filters:
            for attr, value in filters.items():
                if value is not None and hasattr(cls.model, attr):
                    query = query.filter(getattr(cls.model, attr) == value)
        return query.count()
