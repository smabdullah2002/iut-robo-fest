import { formatShortTime } from "../utils/time.js";

export default function AlertsPanel({ alerts, simulatedNow }) {
  return (
    <section className="panel alerts-panel" aria-label="Active alerts">
      <div className="alerts-head">
        <h2 className="section-title">Active alerts</h2>
        <span className={`alerts-count ${alerts.length ? "has-alerts" : ""}`}>
          {alerts.length}
        </span>
      </div>

      {alerts.length === 0 ? (
        <p className="alerts-empty">
          Nothing to flag right now — every room looks normal for the current time
          of day.
        </p>
      ) : (
        <ul className="alerts-list">
          {alerts.map((alert) => (
            <li key={alert.id} className={`alert-item severity-${alert.severity}`}>
              <span className="alert-marker" aria-hidden="true" />
              <div className="alert-body">
                <p className="alert-message">{alert.message}</p>
                <span className="alert-time">
                  {formatShortTime(new Date(alert.timestamp))} · simulated time
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="alerts-hint">
        Simulated clock: {formatShortTime(new Date(simulatedNow))}. Increase the
        speed control above to fast-forward past office hours and watch alerts
        trigger live.
      </p>
    </section>
  );
}
