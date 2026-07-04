from __future__ import annotations

import httpx

import discord
from discord.ext import commands

from .bot_client import OfficeApiClient
from .config import get_settings


settings = get_settings()
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)
api = OfficeApiClient(base_url=settings.backend_base_url)


ROOM_LABELS = {
    "drawing": "Drawing Room",
    "work1": "Work Room 1",
    "work2": "Work Room 2",
}


def extract_devices(payload: dict | list[dict], key: str) -> list[dict]:
    if isinstance(payload, list):
        return payload
    return payload.get(key, [])


def friendly_room_name(room_name: str) -> str:
    return ROOM_LABELS.get(room_name.lower(), room_name)


def format_status(summary: str) -> str:
    for raw, label in ROOM_LABELS.items():
        summary = summary.replace(raw, label)
    return summary


def summarize_devices(devices: list[dict]) -> str:
    rooms: dict[str, dict[str, int]] = {}
    for device in devices:
        room_name = str(device.get("room", "unknown"))
        room_entry = rooms.setdefault(room_name, {"fan": 0, "light": 0})
        if device.get("is_on"):
            device_type = str(device.get("type", "")).lower()
            if device_type in room_entry:
                room_entry[device_type] += 1

    summaries = []
    for room_name in ["drawing", "work1", "work2"]:
        room_entry = rooms.get(room_name, {"fan": 0, "light": 0})
        summaries.append(
            f"{friendly_room_name(room_name)}: {room_entry['fan']} fans ON, {room_entry['light']} lights ON"
        )
    return "; ".join(summaries)


def format_usage(payload: dict) -> str:
    total_watts = payload.get("total_watts_now", payload.get("total_power_watts", 0))
    total_kwh = payload.get("total_kwh_today", payload.get("estimated_daily_kwh", 0))
    return f"Total power right now: {total_watts}W. Today's estimated usage: {total_kwh} kWh."


async def groq_humanize(prompt: str, facts: str) -> str:
    if not settings.groq_api_key:
        return facts

    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You rewrite office device status messages for Discord. "
                    "Keep the answer short, friendly, and factual. "
                    "Do not invent numbers, rooms, or device states."
                ),
            },
            {"role": "user", "content": f"Task: {prompt}\n\nFacts:\n{facts}"},
        ],
        "temperature": 0.4,
    }

    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()


@bot.event
async def on_ready() -> None:
    print(f"Logged in as {bot.user}")


@bot.command(name="status")
async def status_command(ctx: commands.Context) -> None:
    try:
        payload = await api.fetch_devices()
        facts = summarize_devices(extract_devices(payload, "devices"))
        await ctx.reply(await groq_humanize("Rewrite this whole-office status into a friendly Discord reply.", facts))
    except httpx.HTTPError:
        await ctx.reply("I couldn’t reach the office backend just now.")


@bot.command(name="room")
async def room_command(ctx: commands.Context, room_name: str) -> None:
    normalized_room = room_name.lower().strip()
    if normalized_room not in ROOM_LABELS:
        await ctx.reply("Please use one of: drawing, work1, work2.")
        return
    try:
        payload = await api.fetch_room(normalized_room)
        room_devices = extract_devices(payload, "devices")
        room_label = friendly_room_name(normalized_room)
        facts = summarize_devices(room_devices).split("; ")
        room_summary = next((summary for summary in facts if summary.startswith(room_label + ":")), f"{room_label}: no data")
        await ctx.reply(
            await groq_humanize(
                f"Rewrite this room status for {room_label} into a friendly Discord reply.",
                room_summary,
            )
        )
    except httpx.HTTPError:
        await ctx.reply("I couldn’t reach the office backend just now.")


@bot.command(name="usage")
async def usage_command(ctx: commands.Context) -> None:
    try:
        payload = await api.fetch_usage()
        facts = format_usage(payload)
        await ctx.reply(await groq_humanize("Rewrite this energy usage summary for Discord.", facts))
    except httpx.HTTPError:
        await ctx.reply("I couldn’t reach the office backend just now.")


def run() -> None:
    if not settings.discord_bot_token:
        raise RuntimeError("DISCORD_BOT_TOKEN is required")
    bot.run(settings.discord_bot_token)


if __name__ == "__main__":
    run()

