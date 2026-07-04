# Office Pulse

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue)](backend/requirements.txt)
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61DAFB)](frontend/package.json)

Office Pulse is a real-time office monitoring platform for the hackathon brief. It tracks simulated device state across three rooms, exposes a FastAPI backend as the single source of truth, streams live updates to a web dashboard, and serves Discord bot commands for quick status checks.

## What the project does

The project models an office with fans and lights in three rooms and presents that state through three coordinated surfaces:

- a FastAPI backend that stores device state, usage, alerts, and websocket updates
- a React/Vite dashboard that shows live device state, power usage, alerts, and the office layout
- a Discord bot that answers `!status`, `!room`, and `!usage` from the same backend data

The backend also runs a simulator so the system stays active even without physical hardware.

## Why it is useful

Office Pulse is useful because it gives one live view of the same office state from different clients:

- it shows current device status, power draw, and estimated daily usage at a glance
- it flags office-hours and continuous-on alerts automatically
- it keeps Discord and the dashboard aligned with the same backend data
- it works in simulation mode for demos, but can also switch to live backend polling

## Repository layout

```text
backend/       FastAPI app, simulator, models, REST routes, websocket manager
frontend/      React dashboard built with Vite
discord-bot/   Discord command client for the backend
markdowns/     Architecture and problem statement notes
Diagrams/      Supporting visuals and system diagrams
```

## How to get started

### 1. Prerequisites

- Python 3.11 or newer
- Node.js 18 or newer
- `pip`

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

The backend runs at `http://127.0.0.1:8000` by default.

Useful endpoints:

- `GET /` health check
- `GET /devices` all devices
- `GET /rooms/{room}` room-specific devices
- `GET /usage` current watts and daily usage
- `GET /alerts` active alerts
- `WS /ws/devices` live state updates

You can also open the interactive API docs at `http://127.0.0.1:8000/docs`.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

By default the dashboard uses the live backend at `http://127.0.0.1:8000`. If you want to run it in browser-only simulation mode, copy `frontend/.env.example` to `.env` and change `VITE_DATA_SOURCE=simulation`.

### 4. Start the Discord bot

```bash
cd discord-bot
pip install -r requirements.txt
python -m app.bot
```

Set the bot environment variables in `discord-bot/.env` first. The example file is `discord-bot/.env.example`.

## Usage examples

### Backend API

```bash
curl http://127.0.0.1:8000/devices
curl http://127.0.0.1:8000/usage
curl -X POST http://127.0.0.1:8000/devices/drawing-fan-1/toggle
```

### Discord bot commands

- `!status` shows the whole office summary
- `!room drawing`, `!room work1`, or `!room work2` shows the selected room total wattage plus fan and light state
- `!usage` shows current wattage and estimated daily usage

### Frontend commands

```bash
cd frontend
npm run build
npm run lint
```

The frontend and bot READMEs document their own environment variables, modes, and run commands in more detail.

## Maintainers and contributions

This project is maintained by the hackathon team working on Office Pulse.

If you want to contribute:

- keep changes aligned with the current backend-first architecture
- update the relevant service README when behavior changes
- open a pull request with a short summary of what changed and how you verified it



## License

See [LICENSE](LICENSE).
