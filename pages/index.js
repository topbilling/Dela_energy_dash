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
      // 1. Live Energy Data
      const res = await fetch('/api/tesla/energy');
      const json = await res.json();
      if (res.ok) setData(json);

      // 2. Solar History (for top graph)
      if (!history) {
        const histRes = await fetch('/api/tesla/history');
        const histJson = await histRes.json();
        if (histRes.ok) setHistory(histJson.solarData);
      }

      // 3. Irradiance/Weather
      const weatherRes = await fetch('/api/weather/irradiance');
      const weatherJson = await weatherRes.json();
      if (weatherRes.ok) setIrradiance(weatherJson);

    } catch (err) {
      console.error(err);
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
