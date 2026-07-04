import { formatClock } from "../utils/time.js";

const CONNECTION_LABEL = {
  simulated: "Simulated feed",
  live: "Live backend",
  connecting: "Connecting…",
  offline: "Backend unreachable",
};

export default function Header({
  simulatedNow,
  connection,
  dataSource,
  officeHours,
}) {
  const simDate = new Date(simulatedNow);

  return (
    <header className="header">
      <div className="header-brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M13 2L4 14h6l-1.5 8L20 10h-6l-1-8z" fill="currentColor" />
          </svg>
        </span>
        <div>
          <h1 className="brand-title">Office Pulse</h1>
          <p className="brand-subtitle">Live device &amp; power monitor</p>
        </div>
      </div>

      <div className="header-clock">
        <span className="clock-value">{formatClock(simDate)}</span>
        <span className="clock-caption">
          simulated time · office hours {officeHours.start}:00–{officeHours.end}
          :00
        </span>
      </div>

      <div className="header-controls">
        <div className={`status-pill status-${connection}`}>
          <span className="status-dot" />
          {CONNECTION_LABEL[connection] || connection}
        </div>
      </div>
    </header>
  );
}
