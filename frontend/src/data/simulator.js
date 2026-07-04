import { buildDeviceRoster } from "./officeConfig";

// This module simulates the "Simulated Device Layer" from the architecture
// diagram: [Simulated Device Layer] -> [Backend API] -> [Web UI] && [Discord Bot].
// It intentionally exposes the exact shape a real backend/API would return
// (status, ratedWatts, roomId, lastChangedAt) so this file is the ONLY thing
// that needs to change when a teammate's real API is ready (see useOfficeData).

function seedInitialState() {
  const now = Date.now();
  const roster = buildDeviceRoster();
  return roster.map((device, idx) => {
    // Stagger initial on/off so the office doesn't look artificially uniform.
    const startsOn = idx % 3 !== 0; // ~66% start on, some already off
    return {
      ...device,
      status: startsOn,
      // Spread "since when" across the last 0-3 simulated hours.
      lastChangedAt: now - Math.floor(Math.random() * 3 * 60 * 60 * 1000),
    };
  });
}

/**
 * Advances the simulated world by one tick.
 * @param {Array} devices current device array
 * @param {number} simulatedNow current simulated timestamp (ms)
 * @returns {Array} new device array (immutable update)
 */
export function tickSimulation(devices, simulatedNow) {
  // Occasionally flip 0-2 random devices, mimicking real human behaviour
  // (someone switches a light on/off) rather than everything changing at once.
  const shouldFlip = Math.random() < 0.35;
  if (!shouldFlip) return devices;

  const flips = Math.random() < 0.85 ? 1 : 2;
  const next = [...devices];

  for (let f = 0; f < flips; f += 1) {
    const idx = Math.floor(Math.random() * next.length);
    const device = next[idx];
    next[idx] = {
      ...device,
      status: !device.status,
      lastChangedAt: simulatedNow,
    };
  }
  return next;
}

export function createInitialDevices() {
  return seedInitialState();
}

/**
 * Adds small, realistic jitter (+/-4%) to a device's rated wattage so the
 * live power meter doesn't look like a static, fake number.
 */
export function instantaneousDraw(device) {
  if (!device.status) return 0;
  const jitter = 0.96 + Math.random() * 0.08; // 0.96 - 1.04
  return device.ratedWatts * jitter;
}
