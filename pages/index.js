import { useState, useEffect } from 'react';

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

  // --- Logic for Graph (Fixed for Time-Based X-Axis) ---
  const renderGraph = () => {
    if (!history || history.length === 0) return <p>Loading Graph...</p>;

    const width = 300;
    const height = 100;
    
    // 1. Get Midnight Timestamp for anchoring X-Axis
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const totalDayMillis = 24 * 60 * 60 * 1000; // 24 hours in ms

    // 2. Calculate Scales
    const maxSolar = Math.max(...history.map(d => d.solar_power), 8000); 

    // Helper to get X position based on Time (not index)
    const getX = (timestampStr) => {
      const time = new Date(timestampStr).getTime();
      const diff = time - startOfDay;
      // Clamp between 0 and width
      let x = (diff / totalDayMillis) * width;
      if (x < 0) x = 0; 
      if (x > width) x = width;
      return x;
    };

    // 3. Solar Path (Actual Data)
    // We filter out any data points not from "Today" just in case API returns overlapping days
    const todaysPoints = history.filter(d => new Date(d.timestamp).getTime() >= startOfDay);

    if (todaysPoints.length === 0) return <p style={{fontSize:'10px'}}>Waiting for sunrise...</p>;

    const solarPoints = todaysPoints.map(d => {
      const x = getX(d.timestamp);
      const y = height - (d.solar_power / maxSolar) * height;
      return `${x},${y}`;
    }).join(' ');

    // Close the area shape
    // Start at bottom-left of first point, end at bottom-right of last point
    const firstX = getX(todaysPoints[0].timestamp);
    const lastX = getX(todaysPoints[todaysPoints.length - 1].timestamp);
    const solarAreaPath = `${firstX},${height} ${solarPoints} ${lastX},${height} Z`;

    // 4. Irradiance Path (Forecast)
    let irradiancePath = null;
    if (irradiance && irradiance.hourly_ghi) {
      const ghiData = irradiance.hourly_ghi;
      const maxGHI = 1000; // Scale GHI to match graph height roughly
      
      irradiancePath = ghiData.map(d => {
        const x = getX(d.timestamp);
        const y = height - (d.ghi / maxGHI) * height; 
        return `${x},${y}`;
      }).join(' ');
    }

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{overflow: 'visible'}}>
        <defs>
          <linearGradient id="solarGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* The Solar Area (Gold) */}
        <path d={solarAreaPath} fill="url(#solarGradient)" />
        <polyline points={solarPoints} fill="none" stroke="#FFD700" strokeWidth="2" />

        {/* The Irradiance Line (White Dotted) */}
        {irradiancePath && (
          <polyline 
            points={irradiancePath} 
            fill="none" 
            stroke="#FFFFFF" 
            strokeWidth="1.5" 
            strokeDasharray="4,4" 
            opacity="0.5"
          />
        )}
        
        {/* Optional: Add a faint 'Noon' marker line */}
        <line x1={width/2} y1="0" x2={width/2} y2={height} stroke="#333" strokeDasharray="2,2" />
      </svg>
    );
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Possum Hollow Energy</h1>
      <p style={styles.timestamp}>Last update: {new Date(data.timestamp).toLocaleTimeString()}</p>

      {/* --- POWER FLOW DIAGRAM --- */}
      <div style={styles.diagram}>
        
        {/* IRRADIANCE MODULE */}
        {irradiance && (
          <div style={{ position: 'absolute', top: '15px', left: '15px', textAlign: 'left', zIndex: 5 }}>
            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Sky Intensity</span>
            <div style={{ fontSize: '18px', color: '#FFD700', fontWeight: 'bold' }}>
              {Math.round(irradiance.current_ghi)} W/m²
            </div>
            <div style={{ fontSize: '10px', color: '#555' }}>
               {irradiance.current_ghi > 800 ? "Peak Sun" : irradiance.current_ghi > 200 ? "Cloudy/Mixed" : "Low Light"}
            </div>
          </div>
        )}

        {/* SOLAR */}
        <div style={{...styles.node, top: '0', left: '50%', transform: 'translateX(-50%)'}}>
          <span style={styles.icon}>☀️</span>
          <div style={styles.value}>{kw(data.solar_power)}</div>
          <div style={styles.label}>Solar</div>
        </div>

        {/* HOUSE */}
        <div style={{...styles.node, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10}}>
          <span style={styles.icon}>🏠</span>
          <div style={styles.value}>{kw(data.load_power)}</div>
          <div style={styles.label}>Home</div>
        </div>

        {/* GRID */}
        <div style={{...styles.node, top: '50%', left: '10%', transform: 'translateY(-50%)'}}>
          <span style={styles.icon}>⚡</span>
          <div style={styles.value}>{kw(data.grid_power)}</div>
          <div style={styles.label}>{isGridExporting ? 'Exporting' : 'Grid'}</div>
        </div>

        {/* BATTERY */}
        <div style={{...styles.node, top: '50%', right: '10%', transform: 'translateY(-50%)'}}>
          <span style={{...styles.icon, color: data.battery_level > 20 ? '#4CAF50' : 'red'}}>🔋</span>
          <div style={styles.value}>{Math.round(data.battery_level)}%</div>
          <div style={styles.label}>{isBatteryCharging ? 'Charging' : isBatteryDischarging ? 'Draining' : 'Standby'}</div>
        </div>

        <svg style={styles.svg}>
          {isSolarProducing && <line x1="50%" y1="15%" x2="50%" y2="40%" stroke="#FFD700" strokeWidth="4" className="flow-line" />}
          {isGridImporting && <line x1="20%" y1="50%" x2="40%" y2="50%" stroke="#888" strokeWidth="4" className="flow-line" />}
          {isGridExporting && <line x1="40%" y1="50%" x2="20%" y2="50%" stroke="#4CAF50" strokeWidth="4" className="flow-line-reverse" />}
          {isBatteryDischarging && <line x1="80%" y1="50%" x2="60%" y2="50%" stroke="#4CAF50" strokeWidth="4" className="flow-line-reverse" />}
          {isBatteryCharging && <line x1="60%" y1="50%" x2="80%" y2="50%" stroke="#4CAF50" strokeWidth="4" className="flow-line" />}
        </svg>
      </div>

      {/* --- SOLAR GRAPH MODULE --- */}
      <div style={styles.graphContainer}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
          <h3 style={{color: '#888', margin: 0, fontSize: '14px'}}>Solar Output (24h)</h3>
          <div style={{fontSize:'10px', color:'#555'}}>
             <span style={{color:'#FFD700', marginRight:'10px'}}>— Actual</span>
             <span style={{color:'#999'}}>--- Sky Potential</span>
          </div>
        </div>
        
        <div style={{width: '100%', height: '100px', borderBottom: '1px solid #333'}}>
           {renderGraph()}
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '10px', color: '#555', marginTop: '5px'}}>
          <span>Midnight</span>
          <span>Noon</span>
          <span>Now</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes flow { 0% { stroke-dashoffset: 20; } 100% { stroke-dashoffset: 0; } }
        .flow-line { stroke-dasharray: 10; animation: flow 1s linear infinite; }
        .flow-line-reverse { stroke-dasharray: 10; animation: flow 1s linear infinite reverse; }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#111', color: '#eee', minHeight: '100vh', fontFamily: 'sans-serif',
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px',
  },
  title: { color: '#888', fontSize: '20px', marginBottom: '5px' },
  timestamp: { color: '#555', fontSize: '12px', marginBottom: '40px' },
  diagram: {
    position: 'relative', width: '100%', maxWidth: '500px', height: '300px',
    border: '1px solid #222', borderRadius: '20px', backgroundColor: '#1a1a1a', marginBottom: '20px'
  },
  node: {
    position: 'absolute', textAlign: 'center', backgroundColor: '#222', padding: '10px',
    borderRadius: '10px', border: '1px solid #333', minWidth: '80px',
  },
  icon: { fontSize: '24px', display: 'block', marginBottom: '5px' },
  value: { fontSize: '16px', fontWeight: 'bold', color: '#fff' },
  label: { fontSize: '10px', color: '#888' },
  svg: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  
  graphContainer: {
    width: '100%', maxWidth: '500px', padding: '20px', backgroundColor: '#1a1a1a',
    borderRadius: '20px', border: '1px solid #222'
  }
};
