# Discord Office Monitor Bot

Discord bot client for an existing FastAPI backend that exposes the office device state.

## Setup

Copy `.env.example` to `.env` and set:

- `DISCORD_BOT_TOKEN`
- `BACKEND_BASE_URL`
- `DISCORD_ALERT_CHANNEL_ID` if you want proactive alert posts

## Run

```bash
python -m app.bot
```

## Commands

- `!status` shows the office-wide summary.
- `!room drawing|work1|work2` shows the room's total wattage plus which fans and lights are ON/OFF.
- `!usage` shows current power and estimated daily usage.

## Backend contract

The bot expects these endpoints from your existing API:

- `GET /devices`
- `GET /rooms/{room_name}`
- `GET /usage`
- `GET /alerts`

The bot uses the backend as the source of truth for live room and usage data,
so commands reflect the current office state at the time they are called.
