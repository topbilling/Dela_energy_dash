import { kv } from '@vercel/kv';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // 1. Pull the token from the KV database (the "Brain")
    let refreshToken = await kv.get('tesla_refresh_token');

    if (!refreshToken) {
      throw new Error('Database empty. Please run the SET command in Vercel Storage CLI.');
    }

    // 2. Exchange it for a new session
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

    // 3. IMMEDIATELY save the NEW refresh token back to the database
    if (tokenData.refresh_token) {
      await kv.set('tesla_refresh_token', tokenData.refresh_token);
    }

    if (!tokenData.access_token) {
      throw new Error('Tesla Auth Failed. The token in the database might be expired.');
    }

    // 4. Fetch the Powerwall status for Possum Hollow
    const energyResponse = await fetch(
      'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/energy_sites/2715465/site_status',
      {
        headers: { 
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
      }
    );

    const energyData = await energyResponse.json();

    // 5. Send clean data to the dashboard
    res.status(200).json({ 
      battery_level: energyData.response.percentage_charged, 
      status: energyData.response.battery_power < -100 ? "Discharging" : "Standby",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
}
