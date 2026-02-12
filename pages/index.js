import { useState, useEffect } from 'react';

const COLORS = {
  blue: '#006BB6',      // Knicks Blue
  orange: '#F58426',    // Knicks Orange
  white: '#FFFFFF',
  silver: '#BEC0C2',
  bg: '#0B162A',
  panel: 'rgba(21, 36, 59, 0.8)',
  danger: '#FF3B30'
};

export default function Home() {
  const [data, setData] = useState(null);
  const [balancePeriod, setBalancePeriod] = useState('day');
  const [balanceData, setBalanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveData = async () => {
    try {
      const res = await fetch('/api/tesla/energy');
      const json = await res.json();
      if (res.ok) setData(json);
    } catch (err) { console.error("Live fetch error:", err); }
    finally { setLoading(false); }
  };

  const fetchBalanceData = async (period) => {
    try {
      const res = await fetch(`/api/tesla/balance?period=${period}`);
      const json = await res.json();
      if (res.ok) setBalanceData(json);
    } catch (err) { console.error("Balance fetch error:", err); }
  };

  useEffect(() => {
    fetchLiveData();
    fetchBalanceData(balancePeriod);
    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchBalanceData(balancePeriod);
  }, [balancePeriod]);

  if (loading && !data) return <div style={styles.container}>Loading Possum Hollow...</div>;
  if (!data) return <div style={styles.container}>Connection Error</div>;

  const kw = (watts) => (Math.abs(watts) / 1000).toFixed(1) + ' kW';

  const renderBalanceChart = () => {
    const maxVal = Math.max(...balanceData.map(d => (d.sold || 0) + (d.consumed || 0) + (d.purchased || 0)), 1);
    const chartHeight = 140;

    return (
      <div style={styles.balanceBody}>
        <div style={styles.chartArea}>
          {balanceData.map((d, i) => (
            <div key={i} style={styles.barColumn}>
              <div style={styles.barStack}>
                <div style={{ height: `${((d.purchased || 0) / maxVal) * chartHeight}px`, backgroundColor: COLORS.blue, width: '100%' }} />
                <div style={{ height: `${((d.consumed || 0) / maxVal) * chartHeight}px`, backgroundColor: COLORS.orange, width: '100%' }} />
                <div style={{ height: `${((d.sold || 0) / maxVal) * chartHeight}px`, backgroundColor: COLORS.white, width: '100%' }} />
              </div>
              <span style={styles.barLabel}>{d.label}</span>
            </div>
          ))}
        </div>
        
        {/* TIME SELECTOR COLUMN - Now Inside the Flex Body */}
        <div style={styles.selectorColumn}>
          {['day', 'week', 'month', 'year', 'life'].map(p => (
            <button key={p} onClick={() => setBalancePeriod(p)} style={{
              ...styles.periodBtn,
              backgroundColor: balancePeriod === p ? COLORS.orange : 'transparent',
              borderColor: balancePeriod === p ? COLORS.orange : COLORS.blue,
              color: balancePeriod === p ? COLORS.white : COLORS.silver
            }}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>POSSUM HOLLOW</h1>
      <p style={styles.timestamp}>LAST UPDATE: {new Date(data.timestamp).toLocaleTimeString().toUpperCase()}</p>

      {/* --- LIVE FLOW --- */}
      <div style={styles.diagram}>
        <div style={{...styles.node, top: '5%', left: '50%', transform: 'translateX(-50%)', borderColor: COLORS.orange}}>
          <span style={styles.icon}>🏀</span>
          <div style={{...styles.value, color: COLORS.orange}}>{kw(data.solar_power)}</div>
          <div style={styles.label}>SOLAR</div>
        </div>
        <div style={{...styles.node, top: '55%', left: '50%', transform: 'translate(-50%, -50%)', borderColor: COLORS.white}}>
          <span style={styles.icon}>🏠</span>
          <div style={styles.value}>{kw(data.load_power)}</div>
          <div style={styles.label}>HOME</div>
        </div>
        <div style={{...styles.node, top: '55%', left: '10%', transform: 'translateY(-50%)', borderColor: COLORS.blue}}>
          <span style={styles.icon}>⚡</span>
          <div style={{...styles.value, color: COLORS.blue}}>{kw(data.grid_power)}</div>
          <div style={styles.label}>{data.grid_power < 0 ? 'EXPORTING' : 'GRID'}</div>
        </div>
        <div style={{...styles.node, top: '55%', right: '10%', transform: 'translateY(-50%)', borderColor: COLORS.blue}}>
          <span style={styles.icon}>🔋</span>
          <div style={{...styles.value, color: COLORS.blue}}>{Math.round(data.battery_level)}%</div>
          <div style={styles.label}>BATTERY</div>
        </div>
        <svg style={styles.svg}>
          {data.solar_power > 100 && <line x1="50%" y1="18%" x2="50%" y2="42%" stroke={COLORS.orange} strokeWidth="4" className="flow-line" />}
          {data.grid_power > 100 && <line x1="20%" y1="55%" x2="40%" y2="55%" stroke={COLORS.blue} strokeWidth="4" className="flow-line" />}
          {data.grid_power < -100 && <line x1="40%" y1="55%" x2="20%" y2="55%" stroke={COLORS.orange} strokeWidth="4" className="flow-line-reverse" />}
        </svg>
      </div>

      {/* --- ENERGY BALANCE WIDGET --- */}
      <div style={styles.graphContainer}>
        <div style={styles.balanceHeader}>
          <h3 style={{color: COLORS.silver, margin: 0, fontSize: '14px', letterSpacing: '1px'}}>ENERGY BALANCE (kWh)</h3>
          <div style={styles.legend}>
            <span style={{color: COLORS.white}}>● Sold</span>
            <span style={{color: COLORS.orange, marginLeft: '10px'}}>● Solar Consumed</span>
            <span style={{color: COLORS.blue, marginLeft: '10px'}}>● Purchased</span>
          </div>
        </div>
        {renderBalanceChart()}
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
    backgroundColor: COLORS.bg,
    backgroundImage: `linear-gradient(rgba(11, 22, 42, 0.3), rgba(11, 22, 42, 0.3)), url("/background.webp")`,
    backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    color: COLORS.white, minHeight: '100vh', fontFamily: 'Helvetica Neue, Arial, sans-serif',
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px',
  },
  title: { fontSize: '24px', fontWeight: '900', letterSpacing: '2px', textShadow: `2px 2px 0px ${COLORS.blue}` },
  timestamp: { color: COLORS.silver, fontSize: '12px', marginBottom: '40px' },
  diagram: {
    position: 'relative', width: '100%', maxWidth: '500px', height: '350px',
    border: `2px solid ${COLORS.blue}`, borderRadius: '10px', backgroundColor: COLORS.panel, marginBottom: '20px'
  },
  node: { position: 'absolute', textAlign: 'center', backgroundColor: 'rgba(11, 22, 42, 0.9)', padding: '10px', borderRadius: '8px', borderWidth: '2px', borderStyle: 'solid', minWidth: '80px' },
  icon: { fontSize: '24px', display: 'block' },
  value: { fontSize: '18px', fontWeight: 'bold' },
  label: { fontSize: '10px', color: COLORS.silver },
  svg: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  graphContainer: {
    width: '100%', maxWidth: '520px', padding: '20px', backgroundColor: COLORS.panel,
    borderRadius: '10px', border: `2px solid ${COLORS.orange}`
  },
  balanceHeader: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' },
  legend: { fontSize: '9px', display: 'flex' },
  balanceBody: { display: 'flex', alignItems: 'flex-end', gap: '20px', minHeight: '180px' },
  chartArea: { flex: 1, display: 'flex', alignItems: 'flex-end', gap: '2px', borderBottom: `1px solid ${COLORS.blue}`, paddingBottom: '25px', height: '100%' },
  barColumn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' },
  barStack: { width: '100%', display: 'flex', flexDirection: 'column-reverse' },
  barLabel: { fontSize: '7px', color: COLORS.silver, marginTop: '5px', transform: 'rotate(-45deg)', height: '20px', whiteSpace: 'nowrap' },
  selectorColumn: { display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '25px' },
  periodBtn: {
    padding: '8px 12px', fontSize: '9px', fontWeight: 'bold', border: '1px solid',
    borderRadius: '4px', cursor: 'pointer', transition: '0.2s', width: '60px'
  }
};
