import { useState, useEffect } from 'react';

// --- KNICKS COLOR PALETTE ---
const COLORS = {
  blue: '#006BB6',      // Official Knicks Blue
  orange: '#F58426',    // Official Knicks Orange
  white: '#FFFFFF',
  silver: '#BEC0C2',
  bg: '#0B162A',        // Deep Navy Background
  panel: 'rgba(21, 36, 59, 0.8)', // Semi-transparent Navy
  danger: '#FF3B30'     // Keep Red for "Low Battery" warnings
};

export default function Home() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState(null);
  const [irradiance, setIrradiance] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // 1. Fetch Live Data
      const res = await fetch('/api/tesla/energy');
      const json = await res.json();
      if (res.ok) setData(json);

      // 2. Fetch History Data
      if (!history) {
        const histRes = await fetch('/api/tesla/history');
        const histJson = await histRes.json();
        if (histRes.ok) setHistory(histJson.solarData);
      }

      // 3. Fetch Irradiance Data
      try {
        const weatherRes = await fetch('/api/weather/irradiance');
        const weatherJson = await weatherRes.json();
        if (weatherRes.ok) setIrradiance(weatherJson);
      } catch (e) {
        console.warn("Weather fetch failed:", e);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Live update every 30s
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

  const kw = (watts) => (Math.abs(watts) / 1000).toFixed(1) + ' kW';

  // --- Logic for Graph ---
  const renderGraph = () => {
    if (!history || history.length === 0) return <p>Loading Graph...</p>;

    const width = 300;
    const height = 100;
    
    // 1. Get Midnight Timestamp
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const totalDayMillis = 24 * 60 * 60 * 1000;

    // 2. Scales
    const maxSolar = Math.max(...history.map(d => d.solar_power), 8000); 

    const getX = (timestampStr) => {
      const time = new Date(timestampStr).getTime();
      const diff = time - startOfDay;
      let x = (diff / totalDayMillis) * width;
      if (x < 0) x = 0; if (x > width) x = width;
      return x;
    };

    // 3. Solar Path (ORANGE)
    const todaysPoints = history.filter(d => new Date(d.timestamp).getTime() >= startOfDay);

    if (todaysPoints.length === 0) return <p style={{fontSize:'10px', color: COLORS.silver}}>Waiting for tip-off...</p>;

    const solarPoints = todaysPoints.map(d => {
      const x = getX(d.timestamp);
      const y = height - (d.solar_power / maxSolar) * height;
      return `${x},${y}`;
    }).join(' ');

    const firstX = getX(todaysPoints[0].timestamp);
    const lastX = getX(todaysPoints[todaysPoints.length - 1].timestamp);
    const solarAreaPath = `${firstX},${height} ${solarPoints} ${lastX},${height} Z`;

    // 4. Irradiance Path (WHITE Dotted)
    let irradiancePath = null;
    if (irradiance && irradiance.hourly_ghi) {
      const ghiData = irradiance.hourly_ghi;
      const maxGHI = 1000; 
      irradiancePath = ghiData.map(d => {
        const x = getX(d.timestamp);
        const y = height - (d.ghi / maxGHI) * height; 
        return `${x},${y}`;
      }).join(' ');
    }

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{overflow: 'visible'}}>
        <defs>
          <linearGradient id="knicksGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={COLORS.orange} stopOpacity="0.8" />
            <stop offset="100%" stopColor={COLORS.orange} stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Solar Area (Orange) */}
        <path d={solarAreaPath} fill="url(#knicksGradient)" />
        <polyline points={solarPoints} fill="none" stroke={COLORS.orange} strokeWidth="2" />

        {/* Irradiance Line (White/Silver) */}
        {irradiancePath && (
          <polyline 
            points={irradiancePath} 
            fill="none" 
            stroke={COLORS.silver} 
            strokeWidth="1.5" 
            strokeDasharray="4,4" 
            opacity="0.6"
          />
        )}
        
        {/* Noon Marker */}
        <line x1={width/2} y1="0" x2={width/2} y2={height} stroke={COLORS.blue} strokeDasharray="2,2" opacity="0.5" />
      </svg>
    );
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>POSSUM HOLLOW</h1>
      <p style={styles.timestamp}>LAST UPDATE: {new Date(data.timestamp).toLocaleTimeString().toUpperCase()}</p>

      {/* --- POWER FLOW DIAGRAM --- */}
      <div style={styles.diagram}>
        
        {/* IRRADIANCE MODULE */}
        {irradiance && (
          <div style={{ position: 'absolute', top: '15px', left: '15px', textAlign: 'left', zIndex: 5 }}>
            <span style={{ fontSize: '10px', color: COLORS.silver, textTransform: 'uppercase', letterSpacing: '1px' }}>SKY INTENSITY</span>
            <div style={{ fontSize: '18px', color: COLORS.white, fontWeight: 'bold' }}>
              {Math.round(irradiance.current_ghi)} W/m²
            </div>
            <div style={{ fontSize: '10px', color: COLORS.orange }}>
               {irradiance.current_ghi > 800 ? "PEAK SUN" : irradiance.current_ghi > 200 ? "CLOUDY" : "LOW LIGHT"}
            </div>
          </div>
        )}

        {/* SOLAR (Orange) */}
        <div style={{...styles.node, top: '0', left: '50%', transform: 'translateX(-50%)', borderColor: COLORS.orange}}>
          <span style={styles.icon}>🏀</span>
          <div style={{...styles.value, color: COLORS.orange}}>{kw(data.solar_power)}</div>
          <div style={styles.label}>SOLAR</div>
        </div>

        {/* HOUSE (White) */}
        <div style={{...styles.node, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, borderColor: COLORS.white}}>
          <span style={styles.icon}>🏠</span>
          <div style={styles.value}>{kw(data.load_power)}</div>
          <div style={styles.label}>HOME</div>
        </div>

        {/* GRID (Blue) */}
        <div style={{...styles.node, top: '50%', left: '10%', transform: 'translateY(-50%)', borderColor: COLORS.blue}}>
          <span style={styles.icon}>⚡</span>
          <div style={{...styles.value, color: COLORS.blue}}>{kw(data.grid_power)}</div>
          <div style={styles.label}>{isGridExporting ? 'EXPORTING' : 'GRID'}</div>
        </div>

        {/* BATTERY (Blue/Orange Logic) */}
        <div style={{...styles.node, top: '50%', right: '10%', transform: 'translateY(-50%)', borderColor: data.battery_level > 20 ? COLORS.blue : COLORS.danger}}>
          <span style={styles.icon}>🔋</span>
          <div style={{...styles.value, color: data.battery_level > 20 ? COLORS.blue : COLORS.danger}}>
            {Math.round(data.battery_level)}%
          </div>
          <div style={styles.label}>
            {isBatteryCharging ? 'CHARGING' : isBatteryDischarging ? 'DRAINING' : 'STANDBY'}
          </div>
        </div>

        <svg style={styles.svg}>
          {/* Solar -> House (Orange) */}
          {isSolarProducing && <line x1="50%" y1="15%" x2="50%" y2="40%" stroke={COLORS.orange} strokeWidth="4" className="flow-line" />}
          
          {/* Grid -> House (Blue) */}
          {isGridImporting && <line x1="20%" y1="50%" x2="40%" y2="50%" stroke={COLORS.blue} strokeWidth="4" className="flow-line" />}
          
          {/* House -> Grid (Orange - Selling back!) */}
          {isGridExporting && <line x1="40%" y1="50%" x2="20%" y2="50%" stroke={COLORS.orange} strokeWidth="4" className="flow-line-reverse" />}
          
          {/* Battery -> House (Orange - Powering from storage) */}
          {isBatteryDischarging && <line x1="80%" y1="50%" x2="60%" y2="50%" stroke={COLORS.orange} strokeWidth="4" className="flow-line-reverse" />}
          
          {/* Grid/Solar -> Battery (Blue - Charging up) */}
          {isBatteryCharging && <line x1="60%" y1="50%" x2="80%" y2="50%" stroke={COLORS.blue} strokeWidth="4" className="flow-line" />}
        </svg>
      </div>

      {/* --- SOLAR GRAPH MODULE --- */}
      <div style={styles.graphContainer}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
          <h3 style={{color: COLORS.silver, margin: 0, fontSize: '14px', letterSpacing: '1px'}}>SOLAR OUTPUT (24H)</h3>
          <div style={{fontSize:'10px', color: COLORS.silver}}>
             <span style={{color: COLORS.orange, marginRight:'10px'}}>— ACTUAL</span>
             <span style={{color: COLORS.white}}>--- POTENTIAL</span>
          </div>
        </div>
        
        <div style={{width: '100%', height: '100px', borderBottom: `1px solid ${COLORS.blue}`}}>
           {renderGraph()}
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '10px', color: COLORS.blue, marginTop: '5px'}}>
          <span>MIDNIGHT</span>
          <span>NOON</span>
          <span>NOW</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes flow { 0% { stroke-dashoffset: 20; } 100% { stroke-dashoffset: 0; } }
        .flow-line { stroke-dasharray: 10; animation: flow 1s linear infinite; }
        .flow-line-reverse { stroke-dasharray: 10; animation: flow 1s linear infinite reverse; }
        body { margin: 0; background-color: ${COLORS.bg}; }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    // --- BACKGROUND IMAGE UPDATE ---
    backgroundColor: COLORS.bg, 
    backgroundImage: `linear-gradient(rgba(11, 22, 42, 0.85), rgba(11, 22, 42, 0.35)), url("/background.webp")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed', // Parallax effect
    // -------------------------------
    color: COLORS.white, 
    minHeight: '100vh', 
    fontFamily: 'Helvetica Neue, Arial, sans-serif',
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    padding: '20px',
  },
  title: { 
    color: COLORS.white, 
    fontSize: '24px', 
    marginBottom: '5px', 
    fontWeight: '900', 
    letterSpacing: '2px',
    textShadow: `2px 2px 0px ${COLORS.blue}` 
  },
  timestamp: { color: COLORS.silver, fontSize: '12px', marginBottom: '40px', letterSpacing: '1px' },
  diagram: {
    position: 'relative', 
    width: '100%', 
    maxWidth: '500px', 
    height: '300px',
    border: `2px solid ${COLORS.blue}`, 
    borderRadius: '10px', 
    backgroundColor: COLORS.panel, 
    marginBottom: '20px',
    boxShadow: `0 0 15px ${COLORS.blue}40`,
    backdropFilter: 'blur(5px)' // Blurs background behind the box
  },
  node: {
    position: 'absolute', 
    textAlign: 'center', 
    backgroundColor: 'rgba(11, 22, 42, 0.9)', 
    padding: '10px',
    borderRadius: '8px', 
    borderWidth: '2px',
    borderStyle: 'solid',
    minWidth: '80px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
  },
  icon: { fontSize: '24px', display: 'block', marginBottom: '5px' },
  value: { fontSize: '18px', fontWeight: 'bold', color: COLORS.white },
  label: { fontSize: '10px', color: COLORS.silver, fontWeight: 'bold', letterSpacing: '0.5px' },
  svg: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  
  graphContainer: {
    width: '100%', 
    maxWidth: '500px', 
    padding: '20px', 
    backgroundColor: COLORS.panel,
    borderRadius: '10px', 
    border: `2px solid ${COLORS.orange}`,
    boxShadow: `0 0 15px ${COLORS.orange}40`,
    backdropFilter: 'blur(5px)'
  }
};
