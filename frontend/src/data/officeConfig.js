// Fixed office layout, per the problem statement.
// 3 rooms, each with 2 fans + 3 lights = 5 devices/room, 15 devices total.

export const DEVICE_RATINGS_W = {
  fan: 60, // realistic ceiling fan draw
  light: 15, // realistic LED panel draw
};

export const ROOMS = [
  {
    id: "drawing",
    name: "Drawing Room",
    subtitle: "Waiting area",
    fans: 2,
    lights: 3,
  },
  {
    id: "work1",
    name: "Work Room 1",
    subtitle: "Employee floor",
    fans: 2,
    lights: 3,
  },
  {
    id: "work2",
    name: "Work Room 2",
    subtitle: "Employee floor",
    fans: 2,
    lights: 3,
  },
];

// Builds the canonical 15-device list. Each device carries a stable id so
// the simulator (or, later, a live backend) can be swapped in without any
// component needing to change.
export function buildDeviceRoster() {
  const devices = [];
  ROOMS.forEach((room) => {
    for (let i = 1; i <= room.fans; i += 1) {
      devices.push({
        id: `${room.id}-fan-${i}`,
        roomId: room.id,
        type: "fan",
        label: `Fan ${i}`,
        ratedWatts: DEVICE_RATINGS_W.fan,
      });
    }
    for (let i = 1; i <= room.lights; i += 1) {
      devices.push({
        id: `${room.id}-light-${i}`,
        roomId: room.id,
        type: "light",
        label: `Light ${i}`,
        ratedWatts: DEVICE_RATINGS_W.light,
      });
    }
  });
  return devices;
}

export const TOTAL_DEVICE_COUNT = ROOMS.reduce(
  (sum, r) => sum + r.fans + r.lights,
  0
);
