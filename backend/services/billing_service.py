"""Billing service — invoice generation, proration, late fees, and scheduled generation."""

from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from repositories import InvoiceRepo, InvoiceItemRepo, AssignmentRepo
from models.assignment import Assignment
from models.billing import Invoice
from audit import log_action
from extensions import db


def _prorate_amount(full_amount, period_start, period_end, actual_start, actual_end):
    """Calculate prorated rent in cents."""
    total_days = (period_end - period_start).days + 1
    if total_days <= 0:
        return 0
    eff_start = max(period_start, actual_start)
    eff_end = min(period_end, actual_end) if actual_end else period_end
    occupied_days = (eff_end - eff_start).days + 1
    if occupied_days <= 0:
        return 0
    return int(full_amount * occupied_days / total_days)


def _compute_period(billing_cycle, billing_day, reference_date):
    """Compute billing period (start, end) for a given cycle."""
    if billing_cycle == 'monthly':
        start = reference_date.replace(day=min(billing_day, 28))
        end = start + relativedelta(months=1) - timedelta(days=1)
    elif billing_cycle == 'weekly':
        start = reference_date - timedelta(days=reference_date.weekday())
        start += timedelta(days=max(0, billing_day - 1))
        end = start + timedelta(days=6)
    else:  # custom — treat as monthly
        start = reference_date.replace(day=1)
        end = start + relativedelta(months=1) - timedelta(days=1)
    return start, end


def generate_invoice(assignment_id, period_start=None, period_end=None, actor=None):
    """Generate a single invoice for an assignment."""
    assignment = AssignmentRepo.get_by_id(assignment_id)
    if not assignment:
        raise ValueError("Assignment not found")
    if assignment.status != 'active':
        raise ValueError("Assignment is not active")

    # Determine period
    if not period_start or not period_end:
        today = date.today()
        period_start, period_end = _compute_period(
            assignment.billing_cycle, assignment.billing_day, today
        )

    # Check for duplicate invoice
    existing = Invoice.query.filter_by(
        assignment_id=assignment_id,
        billing_period_start=period_start,
        billing_period_end=period_end,
    ).first()
    if existing:
        raise ValueError(f"Invoice already exists for this period: {existing.invoice_number}")

    # Proration check
    rent = assignment.rent_amount
    if assignment.start_date > period_start or (assignment.end_date and assignment.end_date < period_end):
        rent = _prorate_amount(
            assignment.rent_amount, period_start, period_end,
            assignment.start_date, assignment.end_date
        )

    invoice_number = InvoiceRepo.get_next_invoice_number()
    due_date = period_start + timedelta(days=5)  # 5 days after period start

    invoice = InvoiceRepo.create(
        invoice_number=invoice_number,
        tenant_id=assignment.tenant_id,
        assignment_id=assignment_id,
        billing_period_start=period_start,
        billing_period_end=period_end,
        rent_amount=rent,
        extra_charges=0,
        discount=0,
        late_fee=0,
        total_due=rent,
        paid_amount=0,
        balance=rent,
        status='sent',
        due_date=due_date,
        created_by=actor.id if actor else None,
    )
    db.session.flush()
    log_action('invoice.generate', 'invoice', invoice.id, new_value=invoice.to_dict())
    return invoice


def apply_late_fee(invoice_id, fee_amount, actor=None):
    """Apply late fee to an overdue invoice."""
    invoice = InvoiceRepo.get_by_id(invoice_id)
    if not invoice:
        raise ValueError("Invoice not found")

    old_snap = invoice.to_dict()
    invoice.late_fee += fee_amount
    invoice.total_due += fee_amount
    invoice.balance += fee_amount
    if invoice.status == 'sent':
        invoice.status = 'overdue'
    db.session.flush()

    # Add invoice item for tracking
    InvoiceItemRepo.create(
        invoice_id=invoice_id,
        description='Late fee',
        amount=fee_amount,
        item_type='late_fee',
    )
    db.session.flush()

    log_action('invoice.late_fee', 'invoice', invoice_id,
               old_value=old_snap, new_value=invoice.to_dict())
    return invoice


def add_extra_charge(invoice_id, description, amount, actor=None):
    """Add an extra charge to an invoice."""
    invoice = InvoiceRepo.get_by_id(invoice_id)
    if not invoice:
        raise ValueError("Invoice not found")

    old_snap = invoice.to_dict()
    invoice.extra_charges += amount
    invoice.total_due += amount
    invoice.balance += amount
    db.session.flush()

    InvoiceItemRepo.create(
        invoice_id=invoice_id,
        description=description,
        amount=amount,
        item_type='charge',
    )
    db.session.flush()

    log_action('invoice.extra_charge', 'invoice', invoice_id,
               old_value=old_snap, new_value=invoice.to_dict())
    return invoice


def apply_discount(invoice_id, description, amount, actor=None):
    """Apply a discount to an invoice."""
    invoice = InvoiceRepo.get_by_id(invoice_id)
    if not invoice:
        raise ValueError("Invoice not found")

    old_snap = invoice.to_dict()
    invoice.discount += amount
    invoice.total_due -= amount
    invoice.balance -= amount
    db.session.flush()

    InvoiceItemRepo.create(
        invoice_id=invoice_id,
        description=description,
        amount=-amount,
        item_type='discount',
    )
    db.session.flush()

    log_action('invoice.discount', 'invoice', invoice_id,
               old_value=old_snap, new_value=invoice.to_dict())
    return invoice


def generate_monthly_invoices(actor=None):
    """Batch: generate invoices for all active assignments for the current period."""
    today = date.today()
    active_assignments = Assignment.query.filter_by(status='active').all()
    generated = []
    for assignment in active_assignments:
        period_start, period_end = _compute_period(
            assignment.billing_cycle, assignment.billing_day, today
        )
        # Skip if invoice already exists
        existing = Invoice.query.filter_by(
            assignment_id=assignment.id,
            billing_period_start=period_start,
            billing_period_end=period_end,
        ).first()
        if existing:
            continue
        try:
            inv = generate_invoice(assignment.id, period_start, period_end, actor)
            generated.append(inv)
        except ValueError:
            continue
    return generated
