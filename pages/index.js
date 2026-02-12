import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/tesla/energy');
      const json = await res.json();
      if (res.ok) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) return <div style={styles.container}>Loading Possum Hollow...</div>;
  if (!data) return <div style={styles.container}>Connection Error</div>;

  // --- Logic for Animations ---
  const isSolarProducing = data.solar_power > 100;
  const isGridImporting = data.grid_power > 100;
  const isGridExporting = data.grid_power < -100;
  const isBatteryCharging = data.battery_power < -100;
  const isBatteryDischarging = data.battery_power > 100;

  // Helper to format Watts to kW
  const kw = (watts) => (Math.abs(watts) / 1000).toFixed(1) + ' kW';

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Possum Hollow Energy</h1>
      <p style={styles.timestamp}>Last update: {new Date(data.timestamp).toLocaleTimeString()}</p>

      {/* --- POWER FLOW DIAGRAM --- */}
      <div style={styles.diagram}>
        
        {/* SOLAR (Top) */}
        <div style={{...styles.node, top: '0', left: '50%', transform: 'translateX(-50%)'}}>
          <span style={styles.icon}>☀️</span>
          <div style={styles.value}>{kw(data.solar_power)}</div>
          <div style={styles.label}>Solar</div>
        </div>

        {/* HOUSE (Middle) */}
        <div style={{...styles.node, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10}}>
          <span style={styles.icon}>🏠</span>
          <div style={styles.value}>{kw(data.load_power)}</div>
          <div style={styles.label}>Home</div>
        </div>

        {/* GRID (Left) */}
        <div style={{...styles.node, top: '50%', left: '10%', transform: 'translateY(-50%)'}}>
          <span style={styles.icon}>⚡</span>
          <div style={styles.value}>{kw(data.grid_power)}</div>
          <div style={styles.label}>{isGridExporting ? 'Exporting' : 'Grid'}</div>
        </div>

        {/* BATTERY (Right) */}
        <div style={{...styles.node, top: '50%', right: '10%', transform: 'translateY(-50%)'}}>
          <span style={{...styles.icon, color: data.battery_level > 20 ? '#4CAF50' : 'red'}}>🔋</span>
          <div style={styles.value}>{Math.round(data.battery_level)}%</div>
          <div style={styles.label}>{isBatteryCharging ? 'Charging' : isBatteryDischarging ? 'Draining' : 'Standby'}</div>
        </div>

        {/* --- ANIMATED LINES (SVG) --- */}
        <svg style={styles.svg}>
          {/* Solar to House */}
          {isSolarProducing && (
             <line x1="50%" y1="15%" x2="50%" y2="40%" stroke="#FFD700" strokeWidth="4" className="flow-line" />
          )}
          
          {/* Grid to House (Import) */}
          {isGridImporting && (
            <line x1="20%" y1="50%" x2="40%" y2="50%" stroke="#888" strokeWidth="4" className="flow-line" />
          )}

           {/* House to Grid (Export) */}
           {isGridExporting && (
            <line x1="40%" y1="50%" x2="20%" y2="50%" stroke="#4CAF50" strokeWidth="4" className="flow-line-reverse" />
          )}

          {/* Battery to House (Discharging) */}
          {isBatteryDischarging && (
            <line x1="80%" y1="50%" x2="60%" y2="50%" stroke="#4CAF50" strokeWidth="4" className="flow-line-reverse" />
          )}

          {/* Solar/Grid to Battery (Charging) */}
          {isBatteryCharging && (
            <line x1="60%" y1="50%" x2="80%" y2="50%" stroke="#4CAF50" strokeWidth="4" className="flow-line" />
          )}
        </svg>

      </div>

      {/* --- CSS FOR ANIMATIONS --- */}
      <style jsx global>{`
        @keyframes flow {
          0% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
        .flow-line {
          stroke-dasharray: 10;
          animation: flow 1s linear infinite;
        }
        .flow-line-reverse {
          stroke-dasharray: 10;
          animation: flow 1s linear infinite reverse;
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#111',
    color: '#eee',
    minHeight: '100vh',
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
  },
  title: { color: '#888', fontSize: '20px', marginBottom: '5px' },
  timestamp: { color: '#555', fontSize: '12px', marginBottom: '40px' },
  diagram: {
    position: 'relative',
    width: '100%',
    maxWidth: '500px',
    height: '400px',
    border: '1px solid #222',
    borderRadius: '20px',
    backgroundColor: '#1a1a1a',
  },
  node: {
    position: 'absolute',
    textAlign: 'center',
    backgroundColor: '#222',
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #333',
    minWidth: '80px',
  },
  icon: { fontSize: '30px', display: 'block', marginBottom: '5px' },
  value: { fontSize: '18px', fontWeight: 'bold', color: '#fff' },
  label: { fontSize: '12px', color: '#888' },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
};
