import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [energy, setEnergy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch data
  const fetchEnergy = async () => {
    try {
      const res = await fetch('/api/tesla/energy');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEnergy(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Connection Lost');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on load and refresh every 60 seconds
  useEffect(() => {
    fetchEnergy();
    const interval = setInterval(fetchEnergy, 60000);
    return () => clearInterval(interval);
  }, []);

  // Determine Battery Color
  const getBatteryColor = (level) => {
    if (level > 50) return '#10b981'; // Green
    if (level > 20) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#111', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Head>
        <title>Dela Energy Dash</title>
      </Head>

      <main style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem', opacity: 0.8 }}>Possum Hollow Energy</h1>

        {loading ? (
          <p>Connecting to Tesla...</p>
        ) : error ? (
          <div style={{ color: '#ef4444' }}>⚠️ {error}</div>
        ) : (
          <div style={{ 
            border: '2px solid #333', 
            borderRadius: '20px', 
            padding: '3rem', 
            background: '#222',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            minWidth: '300px'
          }}>
            
            {/* Battery Icon & Percentage */}
            <div style={{ fontSize: '5rem', fontWeight: 'bold', color: getBatteryColor(energy.battery_level) }}>
              {energy.battery_level}%
            </div>
            
            <div style={{ fontSize: '1.2rem', marginTop: '1rem', color: '#888', textTransform: 'uppercase', letterSpacing: '2px' }}>
              {energy.status}
            </div>

            {/* Last Updated Timestamp */}
            <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#555' }}>
              Updated: {new Date().toLocaleTimeString()}
            </div>

            {/* Manual Refresh Button */}
            <button 
              onClick={() => { setLoading(true); fetchEnergy(); }}
              style={{
                marginTop: '2rem',
                padding: '10px 20px',
                background: '#333',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Refresh Now
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
