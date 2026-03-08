"""Assignment service — create, end, transfer, move-out workflows."""

from datetime import date
from repositories import AssignmentRepo, DepositRepo
from rules import validate_assignment, RuleViolation
from audit import log_action
from extensions import db


def create_assignment(data, actor):
    """Create a new tenant assignment with full rule validation."""
    assignment_type = data['assignment_type']
    flat_id = data['flat_id']
    room_id = data.get('room_id')
    bedspace_id = data.get('bedspace_id')
    tenant_id = data['tenant_id']
    start_date = data['start_date']
    end_date = data.get('end_date')

    # Validate business rules
    validate_assignment(assignment_type, flat_id, room_id, bedspace_id,
                        tenant_id, start_date, end_date)

    assignment = AssignmentRepo.create(
        tenant_id=tenant_id,
        assignment_type=assignment_type,
        building_id=data['building_id'],
        flat_id=flat_id,
        room_id=room_id,
        bedspace_id=bedspace_id,
        start_date=start_date,
        end_date=end_date,
        rent_amount=data['rent_amount'],
        deposit_amount=data.get('deposit_amount', 0),
        billing_cycle=data.get('billing_cycle', 'monthly'),
        billing_day=data.get('billing_day', 1),
        status='active',
        notes=data.get('notes'),
        created_by=actor.id if actor else None,
    )

    # Create deposit record if deposit amount > 0
    if assignment.deposit_amount and assignment.deposit_amount > 0:
        deposit = DepositRepo.create(
            tenant_id=tenant_id,
            assignment_id=assignment.id,
            amount=assignment.deposit_amount,
            balance=assignment.deposit_amount,
            status='held',
        )
        db.session.flush()

    log_action('assignment.create', 'assignment', assignment.id, new_value=assignment.to_dict())
    return assignment


def end_assignment(assignment_id, end_date_val=None, actor=None):
    """End an active assignment (move-out workflow)."""
    assignment = AssignmentRepo.get_by_id(assignment_id)
    if not assignment:
        raise ValueError("Assignment not found")
    if assignment.status != 'active':
        raise ValueError("Assignment is not active")

    old_snap = assignment.to_dict()
    assignment.status = 'ended'
    assignment.end_date = end_date_val or date.today()
    db.session.flush()

    log_action('assignment.end', 'assignment', assignment_id,
               old_value=old_snap, new_value=assignment.to_dict())
    return assignment


def transfer_tenant(old_assignment_id, new_data, actor):
    """Transfer: end current assignment and create new one atomically."""
    old_assignment = end_assignment(old_assignment_id, actor=actor)

    # Mark as transferred
    old_assignment.status = 'transferred'
    db.session.flush()

    new_assignment = create_assignment(new_data, actor)
    log_action('assignment.transfer', 'assignment', new_assignment.id,
               old_value={'from_assignment_id': old_assignment_id},
               new_value=new_assignment.to_dict())
    return new_assignment


def list_assignments(page=1, per_page=25, filters=None):
    return AssignmentRepo.get_all(page=page, per_page=per_page, filters=filters)
