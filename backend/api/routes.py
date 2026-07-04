from datetime import datetime

from fastapi import APIRouter, HTTPException

from models.alert import Alert
from models.device import Device, Room
from models.schemas import UsageResponse
from api.ws import manager
from store import (
    accumulate_energy_usage,
    alerts,
    devices,
    get_device,
    get_devices_by_room,
    toggle_device as store_toggle,
)

router = APIRouter()


def _serialize_devices(items: list[Device]) -> list[dict]:
    return [device.model_dump(mode="json") for device in items]


def _serialize_usage() -> dict:
    accumulate_energy_usage()
    total_watts = sum(device.current_power_w for device in devices)
    total_kwh = sum(device.total_energy_kwh_today for device in devices)
    per_room = {}
    for room in Room:
        room_devices = [device for device in devices if device.room == room]
        per_room[room.value] = {
            "watts_now": sum(device.current_power_w for device in room_devices),
            "kwh_today": sum(device.total_energy_kwh_today for device in room_devices),
        }
    return UsageResponse(
        total_watts_now=total_watts,
        total_kwh_today=total_kwh,
        per_room=per_room,
    ).model_dump(mode="json")


@router.get("/devices")
def list_devices():
    """All 15 devices with current state."""
    return {
        "devices": _serialize_devices(devices),
        "serverTime": int(datetime.now().timestamp() * 1000),
    }


@router.get("/health")
def health_check():
    """Health check endpoint for the dashboard and ops tooling."""
    return {"status": "ok", "devices": len(devices)}


@router.get("/rooms/{room}")
def get_room(room: str):
    """Devices in a room: `drawing`, `work1`, or `work2`."""
    try:
        room_enum = Room(room)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Room '{room}' not found")
    room_devices = get_devices_by_room(room_enum)
    return _serialize_devices(room_devices)


@router.get("/usage")
async def get_usage():
    """Current power draw (W) and accumulated energy (kWh) — total + per-room."""
    usage = _serialize_usage()
    await manager.broadcast_state()
    return usage


@router.get("/alerts")
def list_alerts():
    """Active alerts only."""
    return [a.model_dump(mode="json") for a in alerts if a.active]


@router.post("/devices/{device_id}/toggle")
async def toggle_device(device_id: str):
    """Flip a device on/off. Use device IDs like `drawing-fan-1` or `work2-light-3`."""
    device = store_toggle(device_id)
    if device is None:
        raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found")
    await manager.broadcast_state()
    return device.model_dump(mode="json")
