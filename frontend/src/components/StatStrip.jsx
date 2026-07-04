import AnimatedNumber from "./AnimatedNumber.jsx";
import { devicesOnCount } from "../utils/power.js";
import { TOTAL_DEVICE_COUNT } from "../data/officeConfig.js";

export default function StatStrip({ devices, power, energyKwh, alertCount }) {
  const onCount = devicesOnCount(devices);

  const stats = [
    {
      label: "Devices ON",
      value: onCount,
      total: TOTAL_DEVICE_COUNT,
      accent: "cyan",
    },
    {
      label: "Total power draw",
      value: power.totalWatts,
      suffix: " W",
      accent: "amber",
    },
    {
      label: "Estimated usage today",
      value: energyKwh,
      decimals: 2,
      suffix: " kWh",
      accent: "amber",
    },
    {
      label: "Active alerts",
      value: alertCount,
      accent: alertCount > 0 ? "red" : "green",
    },
  ];

  return (
    <section className="stat-strip" aria-label="Key metrics">
      {stats.map((s) => (
        <div className={`stat-card accent-${s.accent}`} key={s.label}>
          <span className="stat-label">{s.label}</span>
          <span className="stat-value">
            <AnimatedNumber value={s.value} decimals={s.decimals || 0} suffix={s.suffix || ""} />
            {s.total && <span className="stat-value-total"> / {s.total}</span>}
          </span>
        </div>
      ))}
    </section>
  );
}
