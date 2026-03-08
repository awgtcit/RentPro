"""Property management services — buildings, flats, rooms, bedspaces."""

from repositories import BuildingRepo, FlatRepo, RoomRepo, BedspaceRepo
from audit import log_action


# ── Buildings ────────────────────────────────────────────────

def create_building(data, actor):
    building = BuildingRepo.create(**data)
    log_action('building.create', 'building', building.id, new_value=building.to_dict())
    return building


def update_building(building_id, data, actor):
    old = BuildingRepo.get_by_id(building_id)
    if not old:
        raise ValueError("Building not found")
    old_snap = old.to_dict()
    building = BuildingRepo.update(building_id, **data)
    log_action('building.update', 'building', building_id, old_value=old_snap, new_value=building.to_dict())
    return building


def list_buildings(page=1, per_page=25, filters=None):
    return BuildingRepo.get_all(page=page, per_page=per_page, filters=filters)


# ── Flats ────────────────────────────────────────────────────

def create_flat(data, actor):
    building = BuildingRepo.get_by_id(data['building_id'])
    if not building:
        raise ValueError("Building not found")
    flat = FlatRepo.create(**data)
    log_action('flat.create', 'flat', flat.id, new_value=flat.to_dict())
    return flat


def update_flat(flat_id, data, actor):
    old = FlatRepo.get_by_id(flat_id)
    if not old:
        raise ValueError("Flat not found")
    old_snap = old.to_dict()
    flat = FlatRepo.update(flat_id, **data)
    log_action('flat.update', 'flat', flat_id, old_value=old_snap, new_value=flat.to_dict())
    return flat


def list_flats(page=1, per_page=25, filters=None):
    return FlatRepo.get_all(page=page, per_page=per_page, filters=filters)


# ── Rooms ────────────────────────────────────────────────────

def create_room(data, actor):
    flat = FlatRepo.get_by_id(data['flat_id'])
    if not flat:
        raise ValueError("Flat not found")
    room = RoomRepo.create(**data)
    log_action('room.create', 'room', room.id, new_value=room.to_dict())
    return room


def update_room(room_id, data, actor):
    old = RoomRepo.get_by_id(room_id)
    if not old:
        raise ValueError("Room not found")
    old_snap = old.to_dict()
    room = RoomRepo.update(room_id, **data)
    log_action('room.update', 'room', room_id, old_value=old_snap, new_value=room.to_dict())
    return room


def list_rooms(page=1, per_page=25, filters=None):
    return RoomRepo.get_all(page=page, per_page=per_page, filters=filters)


# ── Bedspaces ────────────────────────────────────────────────

def create_bedspace(data, actor):
    room = RoomRepo.get_by_id(data['room_id'])
    if not room:
        raise ValueError("Room not found")
    bedspace = BedspaceRepo.create(**data)
    log_action('bedspace.create', 'bedspace', bedspace.id, new_value=bedspace.to_dict())
    return bedspace


def update_bedspace(bedspace_id, data, actor):
    old = BedspaceRepo.get_by_id(bedspace_id)
    if not old:
        raise ValueError("Bedspace not found")
    old_snap = old.to_dict()
    bedspace = BedspaceRepo.update(bedspace_id, **data)
    log_action('bedspace.update', 'bedspace', bedspace_id, old_value=old_snap, new_value=bedspace.to_dict())
    return bedspace


def list_bedspaces(page=1, per_page=25, filters=None):
    return BedspaceRepo.get_all(page=page, per_page=per_page, filters=filters)
