export default async function handler(req, res) {
  const { period = 'day' } = req.query;

  const TOKEN = process.env.TESLA_ACCESS_TOKEN;
  const SITE_ID = '2715465'; 
  
  // --- THE FIX: Reverted to the Owner API server that matches your token ---
  const BASE_URL = 'https://owner-api.teslamotors.com';

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
    res.status(500).json({ error: err.message });
  }
}
