import { instantaneousDraw } from "../data/simulator.js";
import { timeAgo } from "../utils/time.js";

function getDeviceStateLabel(device) {
  if (device.type === "fan") {
    return device.status ? "RUN" : "OFF";
  }

  return device.status ? "ON" : "OFF";
}

export default function RoomPanel({
  room,
  devices,
  simulatedNow,
}) {
  const onCount = devices.filter((d) => d.status).length;
  const roomWatts = devices.reduce((sum, d) => sum + instantaneousDraw(d), 0);

  return (
    <div className="room-panel">
      <div className="room-panel-head">
        <div>
          <h3 className="room-panel-title">{room.name}</h3>
          <p className="room-panel-subtitle">{room.subtitle}</p>
        </div>
        <div className="room-panel-meta">
          <span className="room-panel-oncount">
            {onCount}/{devices.length} on
          </span>
          <span className="room-panel-watts">{Math.round(roomWatts)} W</span>
        </div>
      </div>

      <ul className="device-list">
        {devices.map((device) => (
          <li
            key={device.id}
            className={`device-row ${device.status ? "is-on" : "is-off"}`}
          >
            <span className="device-icon" aria-hidden="true">
              {device.type === "fan" ? "⟳" : "●"}
            </span>
            <span className="device-name">{device.label}</span>
            <span className="device-status-pill">
              {getDeviceStateLabel(device)}
            </span>
            <span className="device-changed">
              {timeAgo(device.lastChangedAt, simulatedNow)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
