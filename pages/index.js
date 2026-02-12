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
