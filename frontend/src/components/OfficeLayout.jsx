import { ROOMS } from "../data/officeConfig.js";

// Fixed pixel layout (viewBox 900x460) mirroring the floor plan in the brief:
// Drawing Room | Work Room 1 | Work Room 2, single entry at the bottom.
const ROOM_BOUNDS = {
  drawing: { x: 20, w: 280 },
  work1: { x: 320, w: 280 },
  work2: { x: 620, w: 280 },
};

// Relative device anchor points inside each room's local (0-280, 0-360) box.
const ANCHORS = {
  fan: [
    { x: 70, y: 300 },
    { x: 200, y: 300 },
  ],
  light: [
    { x: 55, y: 100 },
    { x: 140, y: 100 },
    { x: 225, y: 100 },
  ],
};

function FanIcon({ device }) {
  return (
    <g className={`device-fan ${device.status ? "is-on" : "is-off"}`}>
      <circle r="20" className="fan-hub" />
      <g className="fan-blades">
        <path d="M0,0 L0,-18 A9,9 0 0 1 9,-9 Z" />
        <path d="M0,0 L15.6,9 A9,9 0 0 1 6.6,16.7 Z" />
        <path d="M0,0 L-15.6,9 A9,9 0 0 1 -6.6,16.7 Z" />
      </g>
      <circle r="3.5" className="fan-pin" />
      <text y="34" textAnchor="middle" className="device-state-label">
        {device.status ? "ON" : "OFF"}
      </text>
    </g>
  );
}

function LightIcon({ device }) {
  return (
    <g className={`device-light ${device.status ? "is-on" : "is-off"}`}>
      <circle r="16" className="light-glow" />
      <circle r="9" className="light-bulb" />
      <text y="28" textAnchor="middle" className="device-state-label">
        {device.status ? "ON" : "OFF"}
      </text>
    </g>
  );
}

export default function OfficeLayout({ devicesByRoom }) {
  return (
    <div className="office-layout-card">
      <div className="office-layout-heading">
        <h2 className="section-title">Office floor — top view</h2>
        <div className="legend">
          <span className="legend-item">
            <span className="legend-swatch swatch-on" /> ON
          </span>
          <span className="legend-item">
            <span className="legend-swatch swatch-off" /> OFF
          </span>
        </div>
      </div>

      <svg
        viewBox="0 0 900 460"
        className="office-svg"
        role="img"
        aria-label="Top-view diagram of the office showing live light and fan states"
      >
        {/* Outer shell */}
        <rect
          x="10"
          y="10"
          width="880"
          height="360"
          rx="14"
          className="office-shell"
        />

        {ROOMS.map((room) => {
          const bounds = ROOM_BOUNDS[room.id];
          const devices = devicesByRoom[room.id] || [];
          const fans = devices.filter((d) => d.type === "fan");
          const lights = devices.filter((d) => d.type === "light");

          return (
            <g key={room.id} transform={`translate(${bounds.x}, 20)`}>
              <rect
                width={bounds.w}
                height="340"
                rx="10"
                className="room-rect"
              />
              <text
                x={bounds.w / 2}
                y="26"
                textAnchor="middle"
                className="room-label"
              >
                {room.name.toUpperCase()}
              </text>

              {fans.map((device, i) => (
                <g
                  key={device.id}
                  transform={`translate(${ANCHORS.fan[i].x}, ${ANCHORS.fan[i].y})`}
                >
                  <FanIcon device={device} />
                </g>
              ))}
              {lights.map((device, i) => (
                <g
                  key={device.id}
                  transform={`translate(${ANCHORS.light[i].x}, ${ANCHORS.light[i].y})`}
                >
                  <LightIcon device={device} />
                </g>
              ))}
            </g>
          );
        })}

      </svg>
    </div>
  );
}
