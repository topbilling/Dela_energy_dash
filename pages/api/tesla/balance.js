export default async function handler(req, res) {
  const { period = 'day' } = req.query;

  // 1. Grab keys from Vercel Environment
  let TOKEN = process.env.TESLA_ACCESS_TOKEN;
  const REFRESH_TOKEN = process.env.TESLA_REFRESH_TOKEN;
  const SITE_ID = '2715465'; 
  const BASE_URL = 'https://owner-api.teslamotors.com';

  // Helper function to fetch data
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
    // 2. Try the request with the current token
    let teslaRes = await fetchData(TOKEN);

    // 3. If Token is Expired (401), perform the "Self-Healing" Refresh
    if (teslaRes.status === 401) {
      console.log("Token expired. Refreshing...");

      // Ask Tesla for a new token using the backup Refresh Token
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
        // We got a fresh key! Use it to retry the data fetch.
        TOKEN = refreshJson.access_token; 
        teslaRes = await fetchData(TOKEN);
      } else {
        // If even the backup fails, then we truly are stuck.
        throw new Error("Critical: Refresh Token Invalid. Please generate a new one.");
      }
    }

    // 4. Process the Data (Standard Logic)
    if (!teslaRes.ok) {
        const errorText = await teslaRes.text();
        return res.status(teslaRes.status).json({ error: "Tesla API Error", details: errorText });
    }

    const data = await teslaRes.json();
    const formatted = (data.response?.time_series || []).map(item => ({
      label: new Date(item.timestamp).getHours() + ":00",
      sold: (item.solar_energy_exported || 0) / 1000,
      consumed: Math.max(0, ((item.home_energy_total || 0) - (item.grid_energy_imported || 0))) / 1000,
      purchased: (item.grid_energy_imported || 0) / 1000
    }));

    res.status(200).json(formatted);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
