import { ROOMS } from "../data/officeConfig";
import { isWithinOfficeHours, hoursBetween } from "./time";

/**
 * Derives the current set of alerts from device state + simulated clock.
 * Pure function: same inputs always produce the same alerts, so it's easy
 * to unit test independent of the UI or the timer driving simulatedNow.
 */
export function deriveAlerts({
  devices,
  simulatedNow,
  officeHoursStart,
  officeHoursEnd,
  continuousOnHours,
}) {
  const alerts = [];
  const simDate = new Date(simulatedNow);
  const afterHours = !isWithinOfficeHours(
    simDate,
    officeHoursStart,
    officeHoursEnd
  );

  // 1. Devices left on after office hours (grouped per room to avoid 18 spammy rows).
  if (afterHours) {
    ROOMS.forEach((room) => {
      const onDevices = devices.filter(
        (d) => d.roomId === room.id && d.status
      );
      if (onDevices.length > 0) {
        alerts.push({
          id: `after-hours-${room.id}`,
          severity: "warning",
          roomId: room.id,
          timestamp: simulatedNow,
          message: `${room.name}: ${onDevices.length} device${
            onDevices.length > 1 ? "s" : ""
          } still ON after office hours.`,
        });
      }
    });
  }

  // 2. A room where every device has been continuously ON for > threshold.
  ROOMS.forEach((room) => {
    const roomDevices = devices.filter((d) => d.roomId === room.id);
    const allOn = roomDevices.every((d) => d.status);
    if (!allOn) return;

    const longestSince = Math.max(...roomDevices.map((d) => d.lastChangedAt));
    const hoursOn = hoursBetween(simulatedNow, longestSince);
    if (hoursOn >= continuousOnHours) {
      alerts.push({
        id: `continuous-${room.id}`,
        severity: "critical",
        roomId: room.id,
        timestamp: simulatedNow,
        message: `${room.name}: all devices have been ON continuously for over ${continuousOnHours}h.`,
      });
    }
  });

  return alerts.sort((a, b) => b.timestamp - a.timestamp);
}
