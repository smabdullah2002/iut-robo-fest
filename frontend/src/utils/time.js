export function formatClock(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatShortTime(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function isWithinOfficeHours(date, startHour, endHour) {
  const h = date.getHours() + date.getMinutes() / 60;
  return h >= startHour && h < endHour;
}

export function hoursBetween(msA, msB) {
  return Math.abs(msA - msB) / (1000 * 60 * 60);
}

export function timeAgo(fromMs, toMs) {
  const diffMs = Math.max(0, toMs - fromMs);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins ? `${hrs}h ${remMins}m ago` : `${hrs}h ago`;
}
