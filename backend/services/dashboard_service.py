"""Dashboard and reporting service — occupancy, vacancy, financial KPIs."""

from datetime import date
from sqlalchemy import func
from extensions import db
from models.property import Building, Flat, Room, Bedspace
from models.tenant import Tenant
from models.assignment import Assignment
from models.billing import Invoice, Payment


def get_dashboard_stats():
    """Return key dashboard KPIs."""
    today = date.today()
    month_start = today.replace(day=1)

    total_buildings = Building.query.filter_by(is_active=True).count()
    total_flats = Flat.query.filter_by(is_active=True).count()
    total_rooms = Room.query.filter_by(is_active=True).count()
    total_bedspaces = Bedspace.query.filter_by(is_active=True).count()
    total_tenants = Tenant.query.filter_by(is_active=True).count()

    active_assignments = Assignment.query.filter_by(status='active').count()

    # Occupied counts — distinct flat/room/bedspace IDs with active assignments
    occupied_flats = db.session.query(func.count(func.distinct(Assignment.flat_id))).filter(
        Assignment.status == 'active'
    ).scalar() or 0
    occupied_rooms = db.session.query(func.count(func.distinct(Assignment.room_id))).filter(
        Assignment.status == 'active', Assignment.room_id.isnot(None)
    ).scalar() or 0
    occupied_bedspaces = db.session.query(func.count(func.distinct(Assignment.bedspace_id))).filter(
        Assignment.status == 'active', Assignment.bedspace_id.isnot(None)
    ).scalar() or 0

    # Revenue — expected vs collected this month
    expected_rent = db.session.query(func.coalesce(func.sum(Invoice.total_due), 0)).filter(
        Invoice.billing_period_start >= month_start,
        Invoice.billing_period_start <= today,
        Invoice.status != 'cancelled',
    ).scalar()

    collected_rent = db.session.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.payment_date >= month_start,
        Payment.payment_date <= today,
    ).scalar()

    overdue_rent = db.session.query(func.coalesce(func.sum(Invoice.balance), 0)).filter(
        Invoice.status.in_(['sent', 'partial', 'overdue']),
        Invoice.due_date < today,
        Invoice.balance > 0,
    ).scalar()

    occupancy_rate = round(occupied_flats / total_flats * 100, 1) if total_flats > 0 else 0

    return {
        "total_buildings": total_buildings,
        "total_flats": total_flats,
        "total_rooms": total_rooms,
        "total_bedspaces": total_bedspaces,
        "total_tenants": total_tenants,
        "active_assignments": active_assignments,
        "occupied_flats": occupied_flats,
        "vacant_flats": total_flats - occupied_flats,
        "occupied_rooms": occupied_rooms,
        "vacant_rooms": total_rooms - occupied_rooms,
        "occupied_bedspaces": occupied_bedspaces,
        "vacant_bedspaces": total_bedspaces - occupied_bedspaces,
        "expected_rent": expected_rent,
        "collected_rent": collected_rent,
        "overdue_rent": overdue_rent,
        "occupancy_rate": occupancy_rate,
        "vacancy_rate": round(100 - occupancy_rate, 1),
    }


def get_vacancy_report():
    """List all vacant flats, rooms, and bedspaces."""
    # Flats with no active assignment
    occupied_flat_ids = db.session.query(Assignment.flat_id).filter(
        Assignment.status == 'active',
        Assignment.assignment_type == 'flat',
    ).distinct().subquery()
    vacant_flats = Flat.query.filter(
        Flat.is_active == True,
        ~Flat.id.in_(db.session.query(occupied_flat_ids))
    ).all()

    # Rooms with no active assignment
    occupied_room_ids = db.session.query(Assignment.room_id).filter(
        Assignment.status == 'active',
        Assignment.room_id.isnot(None),
    ).distinct().subquery()
    vacant_rooms = Room.query.filter(
        Room.is_active == True,
        ~Room.id.in_(db.session.query(occupied_room_ids))
    ).all()

    # Bedspaces with no active assignment
    occupied_bed_ids = db.session.query(Assignment.bedspace_id).filter(
        Assignment.status == 'active',
        Assignment.bedspace_id.isnot(None),
    ).distinct().subquery()
    vacant_beds = Bedspace.query.filter(
        Bedspace.is_active == True,
        ~Bedspace.id.in_(db.session.query(occupied_bed_ids))
    ).all()

    return {
        "vacant_flats": [f.to_dict() for f in vacant_flats],
        "vacant_rooms": [r.to_dict() for r in vacant_rooms],
        "vacant_bedspaces": [b.to_dict() for b in vacant_beds],
    }


def get_overdue_tenants():
    """List tenants with overdue invoices."""
    today = date.today()
    overdue_invoices = Invoice.query.filter(
        Invoice.status.in_(['sent', 'partial', 'overdue']),
        Invoice.due_date < today,
        Invoice.balance > 0,
    ).order_by(Invoice.due_date.asc()).all()

    tenant_map = {}
    for inv in overdue_invoices:
        tid = inv.tenant_id
        if tid not in tenant_map:
            tenant_map[tid] = {
                "tenant": inv.tenant.to_dict() if inv.tenant else None,
                "overdue_invoices": [],
                "total_overdue": 0,
            }
        tenant_map[tid]["overdue_invoices"].append(inv.to_dict(include_items=False))
        tenant_map[tid]["total_overdue"] += inv.balance

    return list(tenant_map.values())


def get_monthly_revenue(year, month):
    """Revenue report for a specific month."""
    from datetime import date as dt
    month_start = dt(year, month, 1)
    if month == 12:
        month_end = dt(year + 1, 1, 1)
    else:
        month_end = dt(year, month + 1, 1)

    total_invoiced = db.session.query(func.coalesce(func.sum(Invoice.total_due), 0)).filter(
        Invoice.billing_period_start >= month_start,
        Invoice.billing_period_start < month_end,
        Invoice.status != 'cancelled',
    ).scalar()

    total_collected = db.session.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.payment_date >= month_start,
        Payment.payment_date < month_end,
    ).scalar()

    total_overdue = db.session.query(func.coalesce(func.sum(Invoice.balance), 0)).filter(
        Invoice.billing_period_start >= month_start,
        Invoice.billing_period_start < month_end,
        Invoice.status.in_(['sent', 'partial', 'overdue']),
        Invoice.balance > 0,
    ).scalar()

    return {
        "year": year,
        "month": month,
        "total_invoiced": total_invoiced,
        "total_collected": total_collected,
        "total_overdue": total_overdue,
        "collection_rate": round(total_collected / total_invoiced * 100, 1) if total_invoiced > 0 else 0,
    }


def get_daily_collection(target_date=None):
    """Collection total for a specific date."""
    if target_date is None:
        target_date = date.today()
    total = db.session.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.payment_date == target_date
    ).scalar()
    payments = Payment.query.filter_by(payment_date=target_date).order_by(Payment.id.desc()).all()
    return {
        "date": target_date.isoformat(),
        "total": total,
        "payments": [p.to_dict(include_allocations=False) for p in payments],
    }
