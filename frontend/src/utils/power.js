import { ROOMS } from "../data/officeConfig";
import { instantaneousDraw } from "../data/simulator";

export function computePowerSnapshot(devices) {
  const perRoom = Object.fromEntries(ROOMS.map((r) => [r.id, 0]));
  let totalWatts = 0;

  devices.forEach((d) => {
    const draw = instantaneousDraw(d);
    perRoom[d.roomId] += draw;
    totalWatts += draw;
  });

  return { totalWatts, perRoom };
}

export function devicesOnCount(devices) {
  return devices.filter((d) => d.status).length;
}
