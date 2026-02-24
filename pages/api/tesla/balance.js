export default async function handler(req, res) {
  const { period = 'day' } = req.query;

  // --- HARDCODED TOKEN (Safe & Correct) ---
  const TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IkhnQWhQNnB1aVVXcGpISDdZUV9GY3U3WW9TSSIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X3R5cGUiOiJwZXJzb24iLCJhbXIiOlsicHdkIiwibWZhIiwib3RwIl0sImF1ZCI6WyJodHRwczovL2F1dGgudGVzbGEuY29tL29hdXRoMi92My91c2VyaW5mbyIsImh0dHBzOi8vZmxlZXQtYXBpLnByZC5ldS52bi5jbG91ZC50ZXNsYS5jb20iLCJodHRwczovL2ZsZWV0LWFwaS5wcmQubmEudm4uY2xvdWQudGVzbGEuY29tIl0sImF1dGhfdGltZSI6MTc3MDk0NDM2MSwiYXpwIjoiOWZmMDJhNjAtZjI4My00NjRiLWE0NzEtYTFmMGExZmI4MDI1IiwiZXhwIjoxNzcwOTczMTYyLCJpYXQiOjE3NzA5NDQzNjIsImlzcyI6Imh0dHBzOi8vYXV0aC50ZXNsYS5jb20vb2F1dGgyL3YzL250cyIsImxvY2FsZSI6ImVuLVVTIiwib3VfY29kZSI6Ik5BIiwic2NwIjpbIm9wZW5pZCIsIm9mZmxpbmVfYWNjZXNzIiwidXNlcl9kYXRhIiwiZW5lcmd5X2RldmljZV9kYXRhIl0sInN1YiI6IjMzNWRiNWIyLTJjZTEtNDE3Yi05OTBiLTg5NTdiMDlmNTc3MCJ9.jRyhrA66v0V7SuZBkNtXeapvQ8-7kNsE8-rzx5fD40hbgFxdU64fe8bcvGBzAi-Oggh4MpCLkM89G6CnKwqSAT9nLKc0D-yTKW-6Fca9gifGLRGU5gzYPZuPrZyglj8kLulM7KWQmAOaF3J3CRAVpfmrpd_LZbo3e90JHNfSfliXztrBCIPMgKrE54FDWnxibaA_ShRYS03TnWJf5aNbctlUGoEurk6MztD0GKftTp2-vrgi7s-jQndvoFpAuWxt3vivHqzfjOqHc3gI13dN9j8CPcnsLWC4OVquZxcDpT9lDU0Tm6IfIvqvrfI9mc75WWTyrwcoAshpSYZgH9TAbA";

  const SITE_ID = '2715465'; 

  // --- THE CRITICAL FIX: Use the Fleet API URL for North America ---
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
    
    if (!data.response || !data.response.time_series) {
        return res.status(500).json({ error: "No Data", details: JSON.stringify(data) });
    }

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
