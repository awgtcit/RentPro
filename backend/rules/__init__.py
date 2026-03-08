"""Business rules engine — assignment hierarchy blocking, capacity, and overlap rules."""

from datetime import date
from models.assignment import Assignment
from models.property import Bedspace


class RuleViolation(Exception):
    """Raised when a business rule is violated."""
    def __init__(self, message, code='RULE_VIOLATION'):
        self.message = message
        self.code = code
        super().__init__(message)


def check_flat_rental_blocks_room(flat_id, start_date, end_date):
    """Rule: If a flat is rented as a whole, no room-level or bedspace-level assignments are allowed."""
    flat_assignment = Assignment.query.filter(
        Assignment.assignment_type == 'flat',
        Assignment.flat_id == flat_id,
        Assignment.status == 'active',
        Assignment.start_date <= (end_date or date(9999, 12, 31)),
        (Assignment.end_date.is_(None)) | (Assignment.end_date >= start_date),
    ).first()
    if flat_assignment:
        raise RuleViolation(
            f"Flat is rented as a whole to tenant #{flat_assignment.tenant_id} "
            f"from {flat_assignment.start_date}. Cannot assign rooms or bedspaces.",
            code='FLAT_RENTED_WHOLE'
        )


def check_room_rental_blocks_bedspace(room_id, start_date, end_date):
    """Rule: If a room is rented as a whole, no bedspace-level assignments are allowed."""
    room_assignment = Assignment.query.filter(
        Assignment.assignment_type == 'room',
        Assignment.room_id == room_id,
        Assignment.status == 'active',
        Assignment.start_date <= (end_date or date(9999, 12, 31)),
        (Assignment.end_date.is_(None)) | (Assignment.end_date >= start_date),
    ).first()
    if room_assignment:
        raise RuleViolation(
            f"Room is rented as a whole to tenant #{room_assignment.tenant_id} "
            f"from {room_assignment.start_date}. Cannot assign bedspaces.",
            code='ROOM_RENTED_WHOLE'
        )


def check_room_or_bedspace_blocks_flat(flat_id, start_date, end_date):
    """Rule: If any room or bedspace inside a flat is rented, cannot rent the whole flat."""
    sub_assignment = Assignment.query.filter(
        Assignment.assignment_type.in_(['room', 'bedspace']),
        Assignment.flat_id == flat_id,
        Assignment.status == 'active',
        Assignment.start_date <= (end_date or date(9999, 12, 31)),
        (Assignment.end_date.is_(None)) | (Assignment.end_date >= start_date),
    ).first()
    if sub_assignment:
        raise RuleViolation(
            f"Cannot rent flat as a whole — {sub_assignment.assignment_type} "
            f"assignment #{sub_assignment.id} exists for tenant #{sub_assignment.tenant_id}.",
            code='SUBUNIT_RENTED'
        )


def check_bedspace_blocks_room(room_id, start_date, end_date):
    """Rule: If any bedspace inside a room is rented, cannot rent the whole room."""
    bed_assignment = Assignment.query.filter(
        Assignment.assignment_type == 'bedspace',
        Assignment.room_id == room_id,
        Assignment.status == 'active',
        Assignment.start_date <= (end_date or date(9999, 12, 31)),
        (Assignment.end_date.is_(None)) | (Assignment.end_date >= start_date),
    ).first()
    if bed_assignment:
        raise RuleViolation(
            f"Cannot rent room as a whole — bedspace assignment #{bed_assignment.id} "
            f"exists for tenant #{bed_assignment.tenant_id}.",
            code='BEDSPACE_RENTED'
        )


def check_bedspace_capacity(room_id, bedspace_id, start_date, end_date, exclude_assignment_id=None):
    """Rule: A bedspace can only be occupied by one tenant at a time."""
    query = Assignment.query.filter(
        Assignment.assignment_type == 'bedspace',
        Assignment.bedspace_id == bedspace_id,
        Assignment.status == 'active',
        Assignment.start_date <= (end_date or date(9999, 12, 31)),
        (Assignment.end_date.is_(None)) | (Assignment.end_date >= start_date),
    )
    if exclude_assignment_id:
        query = query.filter(Assignment.id != exclude_assignment_id)
    if query.first():
        raise RuleViolation("Bedspace is already occupied during this period.", code='BEDSPACE_OCCUPIED')


def check_tenant_no_overlap(tenant_id, start_date, end_date, exclude_assignment_id=None):
    """Rule: A tenant cannot have overlapping active assignments."""
    query = Assignment.query.filter(
        Assignment.tenant_id == tenant_id,
        Assignment.status == 'active',
        Assignment.start_date <= (end_date or date(9999, 12, 31)),
        (Assignment.end_date.is_(None)) | (Assignment.end_date >= start_date),
    )
    if exclude_assignment_id:
        query = query.filter(Assignment.id != exclude_assignment_id)
    existing = query.first()
    if existing:
        raise RuleViolation(
            f"Tenant already has an active assignment (#{existing.id}) "
            f"from {existing.start_date} that overlaps.",
            code='TENANT_OVERLAP'
        )


def check_room_capacity(room_id, start_date, end_date, exclude_assignment_id=None):
    """Rule: Bedspace occupancy must not exceed room capacity."""
    from models.property import Room
    room = Room.query.get(room_id)
    if not room:
        raise RuleViolation("Room not found.", code='ROOM_NOT_FOUND')

    total_bedspaces = Bedspace.query.filter_by(room_id=room_id, is_active=True).count()
    occupied_query = Assignment.query.filter(
        Assignment.assignment_type == 'bedspace',
        Assignment.room_id == room_id,
        Assignment.status == 'active',
        Assignment.start_date <= (end_date or date(9999, 12, 31)),
        (Assignment.end_date.is_(None)) | (Assignment.end_date >= start_date),
    )
    if exclude_assignment_id:
        occupied_query = occupied_query.filter(Assignment.id != exclude_assignment_id)
    occupied = occupied_query.count()

    if occupied >= room.capacity:
        raise RuleViolation(
            f"Room capacity ({room.capacity}) reached. {occupied} bedspaces already assigned.",
            code='ROOM_CAPACITY_EXCEEDED'
        )


def validate_assignment(assignment_type, flat_id, room_id, bedspace_id,
                        tenant_id, start_date, end_date,
                        exclude_assignment_id=None):
    """Run all applicable rules for a new or updated assignment."""
    # Tenant overlap check
    check_tenant_no_overlap(tenant_id, start_date, end_date, exclude_assignment_id)

    if assignment_type == 'flat':
        # Cannot rent flat if sub-units are rented
        check_room_or_bedspace_blocks_flat(flat_id, start_date, end_date)

    elif assignment_type == 'room':
        # Flat-level rental blocks room assignments
        check_flat_rental_blocks_room(flat_id, start_date, end_date)
        # Cannot rent room if bedspaces inside are rented
        check_bedspace_blocks_room(room_id, start_date, end_date)

    elif assignment_type == 'bedspace':
        # Flat-level rental blocks
        check_flat_rental_blocks_room(flat_id, start_date, end_date)
        # Room-level rental blocks
        check_room_rental_blocks_bedspace(room_id, start_date, end_date)
        # Bedspace occupancy
        check_bedspace_capacity(room_id, bedspace_id, start_date, end_date, exclude_assignment_id)
        # Room capacity
        check_room_capacity(room_id, start_date, end_date, exclude_assignment_id)
