"""Property routes — Buildings, Flats, Rooms, Bedspaces CRUD."""

from flask import Blueprint, request, jsonify, g
from middlewares import require_auth
from middlewares.authorization import require_permission
from services import property_service
from repositories import BuildingRepo, FlatRepo, RoomRepo, BedspaceRepo
from db import transaction

property_bp = Blueprint('properties', __name__)


# ── Buildings ────────────────────────────────────────────────

@property_bp.route('/buildings', methods=['GET'])
@require_auth
def list_buildings():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    filters = {}
    if request.args.get('is_active') is not None:
        filters['is_active'] = request.args.get('is_active', 'true').lower() == 'true'
    return jsonify(property_service.list_buildings(page, per_page, filters))


@property_bp.route('/buildings/<int:bid>', methods=['GET'])
@require_auth
def get_building(bid):
    b = BuildingRepo.get_by_id(bid)
    if not b:
        return jsonify({"error": "Building not found"}), 404
    return jsonify(b.to_dict(include_flats=True))


@property_bp.route('/buildings', methods=['POST'])
@require_auth
@require_permission('properties.manage')
def create_building():
    data = request.get_json(silent=True)
    if not data or not data.get('name'):
        return jsonify({"error": "Building name required"}), 400
    with transaction():
        b = property_service.create_building(data, g.actor)
    return jsonify(b.to_dict()), 201


@property_bp.route('/buildings/<int:bid>', methods=['PUT'])
@require_auth
@require_permission('properties.manage')
def update_building(bid):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body required"}), 400
    try:
        with transaction():
            b = property_service.update_building(bid, data, g.actor)
        return jsonify(b.to_dict())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ── Flats ────────────────────────────────────────────────────

@property_bp.route('/flats', methods=['GET'])
@require_auth
def list_flats():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    filters = {}
    if request.args.get('building_id'):
        filters['building_id'] = int(request.args['building_id'])
    return jsonify(property_service.list_flats(page, per_page, filters))


@property_bp.route('/flats/<int:fid>', methods=['GET'])
@require_auth
def get_flat(fid):
    f = FlatRepo.get_by_id(fid)
    if not f:
        return jsonify({"error": "Flat not found"}), 404
    return jsonify(f.to_dict(include_rooms=True))


@property_bp.route('/flats', methods=['POST'])
@require_auth
@require_permission('properties.manage')
def create_flat():
    data = request.get_json(silent=True)
    if not data or not data.get('building_id') or not data.get('flat_number'):
        return jsonify({"error": "building_id and flat_number required"}), 400
    try:
        with transaction():
            f = property_service.create_flat(data, g.actor)
        return jsonify(f.to_dict()), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@property_bp.route('/flats/<int:fid>', methods=['PUT'])
@require_auth
@require_permission('properties.manage')
def update_flat(fid):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body required"}), 400
    try:
        with transaction():
            f = property_service.update_flat(fid, data, g.actor)
        return jsonify(f.to_dict())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ── Rooms ────────────────────────────────────────────────────

@property_bp.route('/rooms', methods=['GET'])
@require_auth
def list_rooms():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    filters = {}
    if request.args.get('flat_id'):
        filters['flat_id'] = int(request.args['flat_id'])
    return jsonify(property_service.list_rooms(page, per_page, filters))


@property_bp.route('/rooms/<int:rid>', methods=['GET'])
@require_auth
def get_room(rid):
    r = RoomRepo.get_by_id(rid)
    if not r:
        return jsonify({"error": "Room not found"}), 404
    return jsonify(r.to_dict(include_bedspaces=True))


@property_bp.route('/rooms', methods=['POST'])
@require_auth
@require_permission('properties.manage')
def create_room():
    data = request.get_json(silent=True)
    if not data or not data.get('flat_id') or not data.get('room_number'):
        return jsonify({"error": "flat_id and room_number required"}), 400
    try:
        with transaction():
            r = property_service.create_room(data, g.actor)
        return jsonify(r.to_dict()), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@property_bp.route('/rooms/<int:rid>', methods=['PUT'])
@require_auth
@require_permission('properties.manage')
def update_room(rid):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body required"}), 400
    try:
        with transaction():
            r = property_service.update_room(rid, data, g.actor)
        return jsonify(r.to_dict())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ── Bedspaces ────────────────────────────────────────────────

@property_bp.route('/bedspaces', methods=['GET'])
@require_auth
def list_bedspaces():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    filters = {}
    if request.args.get('room_id'):
        filters['room_id'] = int(request.args['room_id'])
    return jsonify(property_service.list_bedspaces(page, per_page, filters))


@property_bp.route('/bedspaces/<int:bsid>', methods=['GET'])
@require_auth
def get_bedspace(bsid):
    bs = BedspaceRepo.get_by_id(bsid)
    if not bs:
        return jsonify({"error": "Bedspace not found"}), 404
    return jsonify(bs.to_dict())


@property_bp.route('/bedspaces', methods=['POST'])
@require_auth
@require_permission('properties.manage')
def create_bedspace():
    data = request.get_json(silent=True)
    if not data or not data.get('room_id') or not data.get('bedspace_code'):
        return jsonify({"error": "room_id and bedspace_code required"}), 400
    try:
        with transaction():
            bs = property_service.create_bedspace(data, g.actor)
        return jsonify(bs.to_dict()), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@property_bp.route('/bedspaces/<int:bsid>', methods=['PUT'])
@require_auth
@require_permission('properties.manage')
def update_bedspace(bsid):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body required"}), 400
    try:
        with transaction():
            bs = property_service.update_bedspace(bsid, data, g.actor)
        return jsonify(bs.to_dict())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
