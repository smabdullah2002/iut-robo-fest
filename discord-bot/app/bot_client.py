from __future__ import annotations

from dataclasses import dataclass

import httpx


@dataclass
class OfficeApiClient:
    base_url: str

    async def fetch_devices(self) -> dict:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=10) as client:
            response = await client.get("/devices")
            response.raise_for_status()
            return response.json()

    async def fetch_room(self, room_name: str) -> dict:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=10) as client:
            response = await client.get(f"/rooms/{room_name}")
            response.raise_for_status()
            return response.json()

    async def fetch_usage(self) -> dict:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=10) as client:
            response = await client.get("/usage")
            response.raise_for_status()
            return response.json()

    async def fetch_alerts(self) -> list[dict]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=10) as client:
            response = await client.get("/alerts")
            response.raise_for_status()
            return response.json()
