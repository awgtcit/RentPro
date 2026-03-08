"""Deposit service — hold, deduct, refund workflows."""

from repositories import DepositRepo, DepositTransactionRepo
from audit import log_action
from extensions import db


def get_deposit(deposit_id):
    deposit = DepositRepo.get_by_id(deposit_id)
    if not deposit:
        raise ValueError("Deposit not found")
    return deposit


def deduct_from_deposit(deposit_id, amount, reason, actor):
    deposit = DepositRepo.get_by_id(deposit_id)
    if not deposit:
        raise ValueError("Deposit not found")
    if amount > deposit.balance:
        raise ValueError("Deduction exceeds deposit balance")

    old_snap = deposit.to_dict()
    deposit.balance -= amount
    if deposit.balance == 0:
        deposit.status = 'forfeited'
    else:
        deposit.status = 'partially_refunded'
    db.session.flush()

    DepositTransactionRepo.create(
        deposit_id=deposit_id,
        transaction_type='deduction',
        amount=amount,
        reason=reason,
        processed_by=actor.id,
    )
    db.session.flush()

    log_action('deposit.deduct', 'deposit', deposit_id,
               old_value=old_snap, new_value=deposit.to_dict())
    return deposit


def refund_deposit(deposit_id, amount, reason, actor):
    deposit = DepositRepo.get_by_id(deposit_id)
    if not deposit:
        raise ValueError("Deposit not found")
    if amount > deposit.balance:
        raise ValueError("Refund exceeds deposit balance")

    old_snap = deposit.to_dict()
    deposit.balance -= amount
    deposit.status = 'refunded' if deposit.balance == 0 else 'partially_refunded'
    db.session.flush()

    DepositTransactionRepo.create(
        deposit_id=deposit_id,
        transaction_type='refund',
        amount=amount,
        reason=reason,
        processed_by=actor.id,
    )
    db.session.flush()

    log_action('deposit.refund', 'deposit', deposit_id,
               old_value=old_snap, new_value=deposit.to_dict())
    return deposit
