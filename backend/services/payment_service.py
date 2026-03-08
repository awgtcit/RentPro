"""Payment service — collect, allocate, generate receipts."""

from datetime import date
from repositories import PaymentRepo, PaymentAllocationRepo, InvoiceRepo
from audit import log_action
from extensions import db


def collect_payment(data, actor):
    """Record a payment and allocate to invoices.

    Supports: full, partial, advance, and overpayment credit.
    data.allocations is an optional list of {invoice_id, amount} dicts.
    If omitted, auto-allocate to oldest unpaid invoices.
    """
    tenant_id = data['tenant_id']
    amount = data['amount']  # cents
    if amount <= 0:
        raise ValueError("Payment amount must be positive")

    receipt_number = PaymentRepo.get_next_receipt_number()
    payment = PaymentRepo.create(
        receipt_number=receipt_number,
        tenant_id=tenant_id,
        payment_date=data.get('payment_date', date.today()),
        amount=amount,
        payment_method=data['payment_method'],
        reference_number=data.get('reference_number'),
        collected_by=actor.id,
        remarks=data.get('remarks'),
    )
    db.session.flush()

    # Allocation
    allocations = data.get('allocations')
    remaining = amount

    if allocations:
        # Manual allocation
        for alloc in allocations:
            if remaining <= 0:
                break
            invoice = InvoiceRepo.get_by_id(alloc['invoice_id'])
            if not invoice or invoice.tenant_id != tenant_id:
                continue
            alloc_amount = min(alloc['amount'], remaining, invoice.balance)
            if alloc_amount <= 0:
                continue
            _apply_allocation(payment.id, invoice, alloc_amount)
            remaining -= alloc_amount
    else:
        # Auto-allocate to oldest unpaid invoices
        unpaid = InvoiceRepo.get_unpaid_for_tenant(tenant_id)
        for invoice in unpaid:
            if remaining <= 0:
                break
            alloc_amount = min(remaining, invoice.balance)
            if alloc_amount <= 0:
                continue
            _apply_allocation(payment.id, invoice, alloc_amount)
            remaining -= alloc_amount

    db.session.flush()
    log_action('payment.collect', 'payment', payment.id, new_value=payment.to_dict())
    return payment


def _apply_allocation(payment_id, invoice, amount):
    """Apply a payment allocation to an invoice and update invoice status."""
    PaymentAllocationRepo.create(
        payment_id=payment_id,
        invoice_id=invoice.id,
        amount=amount,
    )
    invoice.paid_amount += amount
    invoice.balance -= amount

    if invoice.balance <= 0:
        invoice.status = 'paid'
        invoice.balance = 0
    elif invoice.paid_amount > 0:
        invoice.status = 'partial'

    db.session.flush()


def get_receipt(payment_id):
    """Get printable receipt data."""
    payment = PaymentRepo.get_by_id(payment_id)
    if not payment:
        raise ValueError("Payment not found")
    return {
        "receipt_number": payment.receipt_number,
        "date": payment.payment_date.isoformat() if payment.payment_date else None,
        "tenant_name": payment.tenant.full_name if payment.tenant else None,
        "amount": payment.amount,
        "payment_method": payment.payment_method,
        "reference_number": payment.reference_number,
        "collected_by": f"{payment.collector.first_name} {payment.collector.last_name}" if payment.collector else None,
        "remarks": payment.remarks,
        "allocations": [
            {
                "invoice_number": a.invoice.invoice_number if a.invoice else None,
                "amount": a.amount,
            }
            for a in payment.allocations
        ],
    }


def list_payments(page=1, per_page=25, filters=None):
    return PaymentRepo.get_all(page=page, per_page=per_page, filters=filters)
