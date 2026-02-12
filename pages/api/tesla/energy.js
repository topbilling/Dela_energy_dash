import { kv } from '@vercel/kv';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // 1. Pull the stored token from your KV database
    let refreshToken = await kv.get('tesla_refresh_token');

    // SELF-HEALING: If DB is empty, use your valid token to start the engine
    if (!refreshToken) {
      refreshToken = "NA_75d9cadb879b81d3eae482e11dea672ff91253b2beac0354fb4ec66917e41a86";
      await kv.set('tesla_refresh_token', refreshToken);
    }

    // 2. Refresh the session with Tesla
    const tokenResponse = await fetch('https://auth.tesla.com/oauth2/v3/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.TESLA_CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });

    const tokenData = await tokenResponse.json();

    // 3. Update the database with the NEW refresh token (Tesla rotates them!)
    if (tokenData.refresh_token) {
      await kv.set('tesla_refresh_token', tokenData.refresh_token);
    }

    if (!tokenData.access_token) {
      throw new Error('Tesla authentication failed. Check your CLIENT_ID.');
    }

    // 4. Fetch the live Powerwall data
    const energyResponse = await fetch(
      `https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/energy_sites/2715465/site_status`,
      {
        headers: { 
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
      }
    );

    const energyData = await energyResponse.json();

    // 5. Send clean data to your Dashboard
    res.status(200).json({ 
      battery_level: energyData.response.percentage_charged, 
      status: energyData.response.battery_power < -100 ? "Discharging" : "Standby",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Dashboard Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
