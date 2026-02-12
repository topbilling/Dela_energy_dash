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
