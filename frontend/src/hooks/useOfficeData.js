import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createInitialDevices, tickSimulation } from "../data/simulator";
import { computePowerSnapshot } from "../utils/power";
import { deriveAlerts } from "../utils/alerts";
import { ROOMS } from "../data/officeConfig.js";

const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || "live";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 3000;
const OFFICE_HOURS_START = Number(import.meta.env.VITE_OFFICE_HOURS_START) || 9;
const OFFICE_HOURS_END = Number(import.meta.env.VITE_OFFICE_HOURS_END) || 17;
const CONTINUOUS_ON_HOURS =
  Number(import.meta.env.VITE_CONTINUOUS_ON_ALERT_HOURS) || 2;

const TICK_MS = 1200; // wall-clock cadence of the simulation loop
const DAY_ENERGY_RESET_KEY = "officePulseEnergyWh";

const SPEED_OPTIONS = [
  { label: "1x", value: 1 },
  { label: "30x", value: 30 },
  { label: "120x", value: 120 },
  { label: "600x", value: 600 },
];

/**
 * The FastAPI backend (see README.md `Device` schema) returns snake_case
 * fields that don't match the shape every component in this app was built
 * against (camelCase, epoch-ms timestamps, `status` instead of `is_on`,
 * etc). Rather than teach every consumer (RoomPanel, simulator.js,
 * alerts.js, power.js) two shapes, we normalize once at the network
 * boundary so `simulator.js` and the live poller both hand the rest of
 * the app the exact same internal shape.
 *
 * Backend field  -> Frontend field
 * is_on          -> status
 * room           -> roomId
 * rated_power_w  -> ratedWatts
 * last_changed   -> lastChangedAt (converted from ISO string to epoch ms)
 */
function normalizeDevice(d) {
  return {
    id: d.id,
    roomId: d.roomId ?? d.room,
    type: d.type,
    label: d.label,
    ratedWatts: d.ratedWatts ?? d.rated_power_w,
    status: d.status ?? d.is_on,
    lastChangedAt: new Date(d.lastChangedAt ?? d.last_changed).getTime(),
  };
}

function normalizeUsage(payload, fallbackDevices) {
  if (payload && typeof payload === "object") {
    const perRoom = Object.fromEntries(ROOMS.map((room) => [room.id, 0]));
    if (payload.per_room) {
      ROOMS.forEach((room) => {
        perRoom[room.id] = payload.per_room[room.id]?.watts_now ?? 0;
      });
    }

    return {
      totalWatts: payload.total_watts_now ?? 0,
      totalKwh: payload.total_kwh_today ?? 0,
      perRoom,
    };
  }

  const fallback = computePowerSnapshot(fallbackDevices);
  return {
    totalWatts: fallback.totalWatts,
    totalKwh: 0,
    perRoom: fallback.perRoom,
  };
}

function normalizeAlert(alert) {
  return {
    id: alert.id,
    roomId: alert.room,
    severity: alert.type === "continuous_on" ? "critical" : "warning",
    timestamp: new Date(alert.triggered_at).getTime(),
    message: alert.message,
  };
}

export function useOfficeData() {
  const [devices, setDevices] = useState(() => createInitialDevices());
  const [simulatedNow, setSimulatedNow] = useState(() => Date.now());
  const [speed, setSpeed] = useState(SPEED_OPTIONS[1].value); // default 30x so a full day of alerts is visible in minutes
  const [connection, setConnection] = useState(
    DATA_SOURCE === "live" ? "connecting" : "simulated"
  );
  const energyWhRef = useRef(0);
  const lastTickWallClock = useRef(Date.now());
  const [liveUsage, setLiveUsage] = useState(() => ({
    totalWatts: computePowerSnapshot(devices).totalWatts,
    totalKwh: 0,
    perRoom: computePowerSnapshot(devices).perRoom,
  }));
  const [liveAlerts, setLiveAlerts] = useState([]);
  const websocketRef = useRef(null);

  // ---- LIVE MODE: poll the shared backend instead of simulating locally ----
  useEffect(() => {
    if (DATA_SOURCE !== "live") return undefined;

    let cancelled = false;
    const poll = async () => {
      try {
        const [devicesRes, usageRes, alertsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/devices`),
          fetch(`${API_BASE_URL}/usage`),
          fetch(`${API_BASE_URL}/alerts`),
        ]);

        if (!devicesRes.ok) throw new Error(`Backend responded ${devicesRes.status}`);
        if (!usageRes.ok) throw new Error(`Backend responded ${usageRes.status}`);
        if (!alertsRes.ok) throw new Error(`Backend responded ${alertsRes.status}`);

        const [devicesPayload, usagePayload, alertsPayload] = await Promise.all([
          devicesRes.json(),
          usageRes.json(),
          alertsRes.json(),
        ]);
        if (cancelled) return;
        const nextDevices = Array.isArray(devicesPayload)
          ? devicesPayload
          : devicesPayload.devices ?? [];
        setDevices(nextDevices.map(normalizeDevice));
        const serverTime =
          (Array.isArray(devicesPayload) ? undefined : devicesPayload.serverTime) ??
          Date.now();
        setSimulatedNow(serverTime);

        const normalizedUsage = normalizeUsage(usagePayload, nextDevices.map(normalizeDevice));
        setLiveUsage(normalizedUsage);

        setLiveAlerts((Array.isArray(alertsPayload) ? alertsPayload : []).map(normalizeAlert));
        setConnection("live");
      } catch (err) {
        if (!cancelled) setConnection("offline");
        // eslint-disable-next-line no-console
        console.error("[office-pulse] live fetch failed:", err);
      }
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (DATA_SOURCE !== "live") return undefined;

    const apiUrl = new URL(API_BASE_URL);
    const wsProtocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
    const websocket = new WebSocket(`${wsProtocol}//${apiUrl.host}/ws/devices`);
    websocketRef.current = websocket;

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type !== "state_update") return;

        const nextDevices = Array.isArray(message.devices) ? message.devices : [];
        if (nextDevices.length > 0) {
          setDevices(nextDevices.map(normalizeDevice));
        }

        if (message.usage) {
          setLiveUsage(normalizeUsage(message.usage, nextDevices.map(normalizeDevice)));
        }

        if (Array.isArray(message.alerts)) {
          setLiveAlerts(message.alerts.map(normalizeAlert));
        }

        setSimulatedNow(Date.now());
        setConnection("live");
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[office-pulse] websocket parse failed:", err);
      }
    };

    websocket.onerror = () => {
      setConnection("offline");
    };

    return () => {
      websocket.close();
      websocketRef.current = null;
    };
  }, []);

  // Always-fresh ref of simulatedNow so the interval below never closes over
  // a stale value, without needing to restart the interval on every tick.
  const simulatedNowRef = useRef(simulatedNow);
  useEffect(() => {
    simulatedNowRef.current = simulatedNow;
  }, [simulatedNow]);

  // ---- SIMULATION MODE: local tick loop ----
  useEffect(() => {
    if (DATA_SOURCE === "live") return undefined;

    const id = setInterval(() => {
      const wallNow = Date.now();
      const wallDeltaMs = wallNow - lastTickWallClock.current;
      lastTickWallClock.current = wallNow;

      const nextSimulatedNow = simulatedNowRef.current + wallDeltaMs * speed;
      simulatedNowRef.current = nextSimulatedNow;

      setSimulatedNow(nextSimulatedNow);
      setDevices((prev) => tickSimulation(prev, nextSimulatedNow));
    }, TICK_MS);

    return () => clearInterval(id);
  }, [speed]);

  const toggleDevice = useCallback(async (deviceId) => {
    if (DATA_SOURCE === "live") {
      try {
        const res = await fetch(`${API_BASE_URL}/devices/${deviceId}/toggle`, {
          method: "POST",
        });
        if (!res.ok) throw new Error(`Backend responded ${res.status}`);
        const payload = await res.json();
        const updated = normalizeDevice(payload);
        setDevices((prev) =>
          prev.map((device) => (device.id === updated.id ? updated : device))
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[office-pulse] toggle failed:", err);
      }
      return;
    }

    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              status: !device.status,
              lastChangedAt: Date.now(),
            }
          : device
      )
    );
  }, []);

  // ---- Derived data (recomputed whenever devices/time change) ----
  const simulatedPower = useMemo(() => computePowerSnapshot(devices), [devices]);

  // Accumulate energy (Wh) so the "today's estimated usage" figure is real,
  // not decorative — integrates instantaneous watts over simulated time.
  const lastEnergyTick = useRef(simulatedNow);
  const [energyWh, setEnergyWh] = useState(0);
  useEffect(() => {
    if (DATA_SOURCE === "live") return undefined;

    const deltaHours = (simulatedNow - lastEnergyTick.current) / 3_600_000;
    lastEnergyTick.current = simulatedNow;
    if (deltaHours <= 0 || deltaHours > 1) return; // guard against resets/huge jumps
    energyWhRef.current += power.totalWatts * deltaHours;
    setEnergyWh(energyWhRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulatedNow]);

  const alerts = useMemo(
    () =>
      deriveAlerts({
        devices,
        simulatedNow,
        officeHoursStart: OFFICE_HOURS_START,
        officeHoursEnd: OFFICE_HOURS_END,
        continuousOnHours: CONTINUOUS_ON_HOURS,
      }),
    [devices, simulatedNow]
  );

  const power = DATA_SOURCE === "live" ? liveUsage : simulatedPower;
  const activeAlerts = DATA_SOURCE === "live" ? liveAlerts : alerts;

  const resetEnergyCounter = useCallback(() => {
    energyWhRef.current = 0;
    setEnergyWh(0);
  }, []);

  return {
    devices,
    simulatedNow,
    power,
    alerts: activeAlerts,
    energyKwh: DATA_SOURCE === "live" ? liveUsage.totalKwh : energyWh / 1000,
    connection,
    dataSource: DATA_SOURCE,
    speed,
    setSpeed,
    speedOptions: SPEED_OPTIONS,
    toggleDevice,
    resetEnergyCounter,
    officeHours: { start: OFFICE_HOURS_START, end: OFFICE_HOURS_END },
  };
}

export const _constants = { DAY_ENERGY_RESET_KEY };