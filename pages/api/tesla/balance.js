export default async function handler(req, res) {
  const { period = 'day' } = req.query;

  // Use the variables you just updated in Vercel
  const TOKEN = process.env.TESLA_ACCESS_TOKEN;
  const SITE_ID = '2715465'; 
  const BASE_URL = 'https://fleet-api.prd.na.vn.cloud.tesla.com';

  try {
    const teslaRes = await fetch(
      `${BASE_URL}/api/1/energy_sites/${SITE_ID}/calendar_history?kind=energy&period=${period}`,
      {
        headers: { 
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        }
      }
    );

    if (!teslaRes.ok) {
        const errorText = await teslaRes.text();
        return res.status(teslaRes.status).json({ error: "Tesla Fleet API Error", details: errorText });
    }

    const data = await teslaRes.json();
    
    const formatted = data.response.time_series.map(item => ({
      label: new Date(item.timestamp).getHours() + ":00",
      sold: (item.solar_energy_exported || 0) / 1000,
      consumed: Math.max(0, (item.home_energy_total - (item.grid_energy_imported || 0))) / 1000,
      purchased: (item.grid_energy_imported || 0) / 1000
    }));

    res.status(200).json(formatted);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
