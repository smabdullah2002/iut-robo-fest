export default function Footer({ dataSource }) {
  return (
    <footer className="app-footer">
      <p>
        Simulated Device Layer → Backend API → Web UI &amp; Discord Bot. This
        view currently reads from the{" "}
        <strong>{dataSource === "live" ? "shared backend" : "in-browser simulator"}</strong>{" "}
        — see <code>VITE_DATA_SOURCE</code> in <code>.env</code> to switch.
      </p>
      <p className="app-footer-meta">Office Pulse · Techathon Nationals &amp; Rover Summit</p>
    </footer>
  );
}
