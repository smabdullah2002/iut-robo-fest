import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createInitialDevices, tickSimulation } from "../data/simulator";
import { computePowerSnapshot } from "../utils/power";
import { deriveAlerts } from "../utils/alerts";

const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || "simulation";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
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
    roomId: d.room,
    type: d.type,
    label: d.label,
    ratedWatts: d.rated_power_w,
    status: d.is_on,
    lastChangedAt: new Date(d.last_changed).getTime(),
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

  // ---- LIVE MODE: poll the shared backend instead of simulating locally ----
  useEffect(() => {
    if (DATA_SOURCE !== "live") return undefined;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/devices`);
        if (!res.ok) throw new Error(`Backend responded ${res.status}`);
        const payload = await res.json();
        if (cancelled) return;
        setDevices(payload.devices.map(normalizeDevice));
        setSimulatedNow(payload.serverTime ?? Date.now());
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
  const power = useMemo(() => computePowerSnapshot(devices), [devices]);

  // Accumulate energy (Wh) so the "today's estimated usage" figure is real,
  // not decorative — integrates instantaneous watts over simulated time.
  const lastEnergyTick = useRef(simulatedNow);
  const [energyWh, setEnergyWh] = useState(0);
  useEffect(() => {
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

  const resetEnergyCounter = useCallback(() => {
    energyWhRef.current = 0;
    setEnergyWh(0);
  }, []);

  return {
    devices,
    simulatedNow,
    power,
    alerts,
    energyKwh: energyWh / 1000,
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