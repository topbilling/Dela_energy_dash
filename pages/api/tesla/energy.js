export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // 1. Get a fresh Access Token using your Refresh Token
    const tokenResponse = await fetch('https://auth.tesla.com/oauth2/v3/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.TESLA_CLIENT_ID,
        refresh_token: process.env.TESLA_REFRESH_TOKEN,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('Failed to refresh token');

    // 2. Use the new token to get Battery Data for your specific Site ID
    const energyResponse = await fetch(
      `https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/energy_sites/${process.env.TESLA_SITE_ID}/site_status`,
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    const energyData = await energyResponse.json();
    
    // 3. Return only the data your dashboard needs
    const percentage = energyData.response.percentage_charged;
    res.status(200).json({ 
      battery_level: percentage, 
      status: "Active",
      timestamp: new Date().toISOString() 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
