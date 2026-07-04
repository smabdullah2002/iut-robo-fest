import { useMemo } from "react";
import Header from "./components/Header.jsx";
import OfficeLayout from "./components/OfficeLayout.jsx";
import RoomPanel from "./components/RoomPanel.jsx";
import PowerMeter from "./components/PowerMeter.jsx";
import AlertsPanel from "./components/AlertsPanel.jsx";
import StatStrip from "./components/StatStrip.jsx";
import Footer from "./components/Footer.jsx";
import { useOfficeData } from "./hooks/useOfficeData.js";
import { ROOMS } from "./data/officeConfig.js";

export default function App() {
  const {
    devices,
    simulatedNow,
    power,
    alerts,
    energyKwh,
    connection,
    dataSource,
    officeHours,
    toggleDevice,
  } = useOfficeData();

  const devicesByRoom = useMemo(() => {
    const map = Object.fromEntries(ROOMS.map((r) => [r.id, []]));
    devices.forEach((d) => map[d.roomId].push(d));
    return map;
  }, [devices]);

  return (
    <main className="app-shell">
      <div className="ambient-glow" aria-hidden="true" />

      <Header
        simulatedNow={simulatedNow}
        connection={connection}
        dataSource={dataSource}
        officeHours={officeHours}
      />

      <StatStrip
        devices={devices}
        power={power}
        energyKwh={energyKwh}
        alertCount={alerts.length}
      />

      <section className="layout-section" aria-label="Office floor layout">
        <OfficeLayout
          devicesByRoom={devicesByRoom}
          simulatedNow={simulatedNow}
        />
      </section>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <h2 className="section-title">Live device status</h2>
          <div className="room-grid">
            {ROOMS.map((room) => (
              <RoomPanel
                key={room.id}
                room={room}
                devices={devicesByRoom[room.id]}
                simulatedNow={simulatedNow}
                onToggleDevice={toggleDevice}
              />
            ))}
          </div>
        </div>

        <aside className="dashboard-side">
          <PowerMeter power={power} energyKwh={energyKwh} />
          <AlertsPanel alerts={alerts} simulatedNow={simulatedNow} />
        </aside>
      </div>

      <Footer dataSource={dataSource} />
    </main>
  );
}
