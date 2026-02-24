export default async function handler(req, res) {
  const { period = 'day' } = req.query;

  let TOKEN = process.env.TESLA_ACCESS_TOKEN;
  const REFRESH_TOKEN = process.env.TESLA_REFRESH_TOKEN;
  const SITE_ID = '2715465'; 
  const BASE_URL = 'https://owner-api.teslamotors.com';

  const fetchData = async (accessToken) => {
    return fetch(
      `${BASE_URL}/api/1/energy_sites/${SITE_ID}/calendar_history?kind=energy&period=${period}`,
      {
        headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
      }
    );
  };

  try {
    let teslaRes = await fetchData(TOKEN);

    // --- SELF-HEALING TOKEN LOGIC ---
    if (teslaRes.status === 401) {
      console.log("Token expired. Refreshing...");
      const refreshRes = await fetch('https://auth.tesla.com/oauth2/v3/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: 'ownerapi',
          refresh_token: REFRESH_TOKEN,
          scope: 'openid email offline_access'
        })
      });

      const refreshJson = await refreshRes.json();
      if (refreshJson.access_token) {
        TOKEN = refreshJson.access_token; 
        teslaRes = await fetchData(TOKEN);
      } else {
        throw new Error("Critical: Refresh Token Invalid.");
      }
    }

    if (!teslaRes.ok) {
        const errorText = await teslaRes.text();
        return res.status(teslaRes.status).json({ error: "Tesla API Error", details: errorText });
    }

    const data = await teslaRes.json();
    const timeSeries = data.response?.time_series || [];
    
    // --- THE BUCKETING & GRANULARITY ENGINE ---
    let formatted = [];

    if (period === 'day') {
        // Force exactly 24 hourly bars (Midnight to 11 PM)
        formatted = Array.from({ length: 24 }, (_, i) => ({
            label: `${i}:00`,
            sold: 0, consumed: 0, purchased: 0
        }));

        timeSeries.forEach(item => {
            const date = new Date(item.timestamp);
            const hour = date.getHours(); // 0 to 23
            
            // Tesla returns Wh, divide by 1000 for kWh
            formatted[hour].sold += (item.solar_energy_exported || 0) / 1000;
            formatted[hour].purchased += (item.grid_energy_imported || 0) / 1000;
            formatted[hour].consumed += Math.max(0, ((item.home_energy_total || 0) - (item.grid_energy_imported || 0))) / 1000;
        });
    } 
    else if (period === 'week') {
        formatted = timeSeries.map(item => ({
            label: new Date(item.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
            sold: (item.solar_energy_exported || 0) / 1000,
            consumed: Math.max(0, ((item.home_energy_total || 0) - (item.grid_energy_imported || 0))) / 1000,
            purchased: (item.grid_energy_imported || 0) / 1000
        }));
    }
    else if (period === 'month') {
        formatted = timeSeries.map(item => ({
            label: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sold: (item.solar_energy_exported || 0) / 1000,
            consumed: Math.max(0, ((item.home_energy_total || 0) - (item.grid_energy_imported || 0))) / 1000,
            purchased: (item.grid_energy_imported || 0) / 1000
        }));
    }
    else if (period === 'year') {
        formatted = timeSeries.map(item => ({
            label: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short' }),
            sold: (item.solar_energy_exported || 0) / 1000,
            consumed: Math.max(0, ((item.home_energy_total || 0) - (item.grid_energy_imported || 0))) / 1000,
            purchased: (item.grid_energy_imported || 0) / 1000
        }));
    }
    else if (period === 'life') {
        formatted = timeSeries.map(item => ({
            label: new Date(item.timestamp).getFullYear().toString(),
            sold: (item.solar_energy_exported || 0) / 1000,
            consumed: Math.max(0, ((item.home_energy_total || 0) - (item.grid_energy_imported || 0))) / 1000,
            purchased: (item.grid_energy_imported || 0) / 1000
        }));
    }

    res.status(200).json(formatted);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
