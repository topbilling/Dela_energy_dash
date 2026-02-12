import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tesla/energy');
      if (!res.ok) throw new Error('Failed to fetch data');
      const jsonData = await res.json();
      setData(jsonData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on load AND every 60 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); 
    return () => clearInterval(interval);
  }, []);

  // Format the date nicely
  const formattedTime = data?.timestamp 
    ? new Date(data.timestamp).toLocaleString('en-US', {
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit'
      })
    : '';

  return (
    <div style={{ 
      fontFamily: 'sans-serif', 
      textAlign: 'center', 
      padding: '50px',
      backgroundColor: '#111', 
      color: '#fff',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ fontSize: '24px', color: '#888', marginBottom: '10px' }}>
        Possum Hollow Energy
      </h1>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      {loading && !data && <p>Loading Powerwall...</p>}

      {data && (
        <>
          {/* Big Percentage */}
          <div style={{ 
            fontSize: '120px', 
            fontWeight: 'bold', 
            color: data.battery_level > 20 ? '#4CAF50' : '#f44336',
            lineHeight: '1'
          }}>
            {Math.round(data.battery_level)}%
          </div>

          {/* Status (Charging/Standby) */}
          <p style={{ fontSize: '24px', margin: '20px 0', color: '#ccc' }}>
            {data.status}
          </p>

          {/* The New Timestamp */}
          <p style={{ fontSize: '14px', color: '#666', marginTop: '40px' }}>
            Last updated: {formattedTime}
          </p>
        </>
      )}
      
      {/* Manual Refresh Button */}
      <button 
        onClick={fetchData}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: 'transparent',
          border: '1px solid #444',
          color: '#888',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Refresh Now
      </button>
    </div>
  );
}
