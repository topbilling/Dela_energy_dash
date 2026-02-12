import { useState, useEffect } from 'react';

// --- KNICKS COLOR PALETTE ---
const COLORS = {
  blue: '#006BB6',      // Official Knicks Blue
  orange: '#F58426',    // Official Knicks Orange
  white: '#FFFFFF',
  silver: '#BEC0C2',
  bg: '#0B162A',        // Deep Navy Background
  panel: 'rgba(21, 36, 59, 0.8)', // Semi-transparent Navy
  danger: '#FF3B30'     // Red for "Low Battery" warnings
};

export default function Home() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState(null);
  const [irradiance, setIrradiance] = useState(null);
  const [balancePeriod, setBalancePeriod] = useState('day');
  const [balanceData, setBalanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveData = async () => {
    try {
      const res = await fetch('/api/tesla/energy');
      const json = await res.json();
      if (res.ok) setData(json);

      if (!history) {
        const histRes = await fetch('/api/tesla/history');
        const histJson = await histRes.json();
        if (histRes.ok) setHistory(histJson.solarData);
      }

      const weatherRes = await fetch('/api/weather/irradiance');
      const weatherJson = await weatherRes.json();
      if (weatherRes.ok) setIrradiance(weatherJson);

    } catch (err) {
      console.error("Live fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalanceData = async (period) => {
    try {
      const res = await fetch(`/api/tesla/balance?period=${period}`);
      const json = await res.json();
      if (res.ok) setBalanceData(json);
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
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
    const maxVal = Math.max(...balanceData.map(d => d.sold + d.consumed + d.purchased), 1);
    const chartHeight = 120;

    return (
      <div style={styles.balanceWrapper}>
        <div style={styles.chartArea}>
          {balanceData.map((d, i) => (
            <div key={i} style={styles.barColumn}>
              <div style={styles.barStack}>
                <div style={{ height: `${(d.purchased / maxVal) * chartHeight}px`, backgroundColor: COLORS.blue, width: '100%' }} />
                <div style={{ height: `${(d.consumed / maxVal) * chartHeight}px`, backgroundColor: COLORS.orange, width: '100%' }} />
                <div style={{ height: `${(d.sold / maxVal) * chartHeight}px`, backgroundColor: COLORS.white, width: '100%' }} />
              </div>
              <span style={styles.barLabel}>{d.label}</span>
            </div>
          ))}
        </div>
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

      <div style={styles.diagram}>
        {irradiance && (
          <div style={{ position: 'absolute', top: '15px', left: '15px', textAlign: 'left', zIndex: 5 }}>
            <span style={{ fontSize: '10px', color: COLORS.silver, textTransform: 'uppercase' }}>SKY INTENSITY</span>
            <div style={{ fontSize: '18px', color: COLORS.white, fontWeight: 'bold' }}>{Math.round(irradiance.current_ghi)} W/m²</div>
            <div style={{ fontSize: '10px', color: COLORS.orange }}>{irradiance.current_ghi > 800 ? "PEAK SUN" : "CLOUDY"}</div>
          </div>
        )}

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
          <div style={styles.label}>{data.grid_power < 0
