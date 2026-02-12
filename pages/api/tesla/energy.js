export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // DIRECT ACCESS: Use the valid token we already have in Vercel
    const response = await fetch(
      `https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/energy_sites/${process.env.TESLA_SITE_ID}/site_status`,
      {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${process.env.TESLA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tesla API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Send the battery percentage to your dashboard
    res.status(200).json({ 
      battery_level: data.response.percentage_charged, 
      status: "Active",
      timestamp: new Date().toISOString() 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
