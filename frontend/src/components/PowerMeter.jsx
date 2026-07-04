import { ROOMS, DEVICE_RATINGS_W } from "../data/officeConfig.js";
import AnimatedNumber from "./AnimatedNumber.jsx";

const MAX_ROOM_WATTS =
  2 * DEVICE_RATINGS_W.fan + 3 * DEVICE_RATINGS_W.light; // 165W ceiling per room, for bar scaling

export default function PowerMeter({ power, energyKwh }) {
  return (
    <section className="panel power-meter" aria-label="Live power consumption">
      <h2 className="section-title">Power consumption</h2>

      <div className="power-total">
        <span className="power-total-value">
          <AnimatedNumber value={power.totalWatts} suffix=" W" />
        </span>
        <span className="power-total-caption">drawn right now, office-wide</span>
      </div>

      <div className="power-rooms">
        {ROOMS.map((room) => {
          const watts = power.perRoom[room.id] || 0;
          const pct = Math.min(100, (watts / MAX_ROOM_WATTS) * 100);
          return (
            <div className="power-room-row" key={room.id}>
              <div className="power-room-label">
                <span>{room.name}</span>
                <span className="power-room-watts">{Math.round(watts)} W</span>
              </div>
              <div className="power-bar-track">
                <div
                  className="power-bar-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="power-footer">
        <span>Estimated usage today</span>
        <strong>
          <AnimatedNumber value={energyKwh} decimals={4} suffix=" kWh" />
        </strong>
      </div>
    </section>
  );
}
