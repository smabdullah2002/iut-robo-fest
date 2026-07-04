# Office Pulse — Frontend (Web Dashboard)

Frontend module for the **"Lights, Fans, Discord: The Boss's Big Idea"** hackathon
problem statement. This covers deliverable #4 (The Web Dashboard) and the frontend
half of the architecture requirement — it does **not** include the backend API or
Discord bot, which are separate teammates' modules.

No API keys or secrets are required to run this.

---

## 1. Quick start

```bash
npm install
npm run dev
```

Then open the URL Vite prints (defaults to `http://localhost:5173`).

```bash
npm run build     # production build -> dist/
npm run preview   # serve the production build locally
npm run lint      # eslint
```

## 2. Environment variables

Copy `.env.example` to `.env` (already done for you) and adjust if needed:

| Variable | Purpose | Default |
|---|---|---|
| `VITE_DATA_SOURCE` | `live` (fetches from the team's local backend) or `simulation` (browser-only fallback) | `live` |
| `VITE_API_BASE_URL` | Base URL of the backend, only used when `VITE_DATA_SOURCE=live` | `http://127.0.0.1:8000` |
| `VITE_POLL_INTERVAL_MS` | Poll frequency in live mode | `3000` |
| `VITE_OFFICE_HOURS_START` / `VITE_OFFICE_HOURS_END` | Office hours used by the alerts logic | `9` / `17` |
| `VITE_CONTINUOUS_ON_ALERT_HOURS` | Threshold for the "room on too long" alert | `2` |

No keys/secrets are needed in either mode — `live` mode just expects the
backend to be reachable, unauthenticated, at `VITE_API_BASE_URL`.

In live mode the dashboard updates from the backend's `/devices`, `/usage`,
and `/alerts` endpoints, and it also listens to the office websocket so the UI
can refresh immediately when Discord or another client triggers a backend
change.

## 3. Why "simulation mode" exists (and how to swap to the real backend)

The problem statement's architecture is:

```
[Simulated Device Layer] -> [Backend API] -> [ Web UI ] && [ Discord Bot ]
```

The frontend shouldn't care *where* device state comes from — only that it gets
an array of devices shaped like:

```js
{
  id: "work1-fan-1",
  roomId: "work1",
  type: "fan" | "light",
  label: "Fan 1",
  ratedWatts: 60,
  status: true,
  lastChangedAt: 1735699200000 // epoch ms
}
```

`src/hooks/useOfficeData.js` is the **single seam** between the UI and the data
source:

- In `simulation` mode it runs `src/data/simulator.js` entirely in the browser —
  useful for building/demoing the frontend before the backend exists, and as a
  fallback if the backend is down during judging.
- In `live` mode it polls `GET {VITE_API_BASE_URL}/devices`, `/usage`, and
  `/alerts` on an interval and expects the backend's JSON shapes.

No component (`RoomPanel`, `OfficeLayout`, `PowerMeter`, `AlertsPanel`, …) knows
or cares which mode is active — swap the env var and everything keeps working.
This is the "shared backend, one source of truth" requirement from the brief,
satisfied on the frontend side.

## 4. Feature checklist against the brief

- **Live Device Status Panel** — `RoomPanel.jsx`, one card per room, all 18
  devices, live on/off state, no page refresh (interval-driven state).
- **Live Power Consumption Meter** — `PowerMeter.jsx`: total wattage + per-room
  breakdown, animated bars and count-up numbers. The daily kWh display follows
  the backend usage endpoint in live mode.
- **Active Alerts Panel** — `AlertsPanel.jsx` + `utils/alerts.js`: flags devices
  left on after office hours, and rooms where every device has been
  continuously on beyond the configured threshold. Each alert is timestamped.
- **Top-view office layout (bonus)** — `OfficeLayout.jsx`: SVG floor plan with
  glowing lights and spinning fans reflecting live state, matching the
  Drawing Room / Work Room 1 / Work Room 2 layout from the brief.
- **Simulated device data** — `data/simulator.js`: status, wattage, room,
  last-changed timestamp per device, changing over time.
- **Simulation speed control** — a demo convenience (1x/30x/120x/600x) so
  after-hours and "on for 2h+" alerts can be observed live during a short demo
  instead of waiting real hours. Purely a frontend/demo aid, not part of the
  scored architecture.

## 5. Project structure

```
src/
  components/       UI components (Header, OfficeLayout, RoomPanel, PowerMeter,
                     AlertsPanel, StatStrip, AnimatedNumber, Footer)
  data/
    officeConfig.js Static room/device roster (3 rooms, 18 devices, wattage)
    simulator.js     Client-side "device layer" stand-in
  hooks/
    useOfficeData.js Data-source seam (simulation <-> live backend), derived stats
  utils/
    time.js          Clock formatting, office-hours check
    power.js          Wattage aggregation
    alerts.js         Alert derivation rules
  styles/
    tokens.css        Design tokens (color, type, spacing, motion)
    app.css           Component styles + animation
```

## 6. Design notes

- **Typography:** Space Grotesk (display) + Roboto Mono (data/body) — loaded via
  Google Fonts in `index.html`. ("Roboto Maris" isn't a real typeface; Roboto
  Mono was used instead since it reads cleanly for the live numeric data this
  dashboard is built around.)
- **Palette:** dark control-room base with amber as the "live power" accent and
  cyan as the "device on" accent, so the two live signals (energy vs. device
  state) stay visually distinct at a glance.
- **Motion:** GSAP-driven count-up on all live numbers, CSS keyframe spin/glow
  on fan and light icons tied directly to device state, and staggered
  entrance animation on load. Respects `prefers-reduced-motion`.

## 7. Known frontend-only limitations

- `!status`, `!room`, `!usage` Discord commands and the proactive alert
  message are implemented by the bot module, not here — this dashboard is the
  data/UI half of the shared backend contract.
- The circuit schematic (Wokwi/Tinkercad) and system diagram are separate
  deliverables handled outside this codebase; this README only documents the
  frontend's piece of the architecture.
