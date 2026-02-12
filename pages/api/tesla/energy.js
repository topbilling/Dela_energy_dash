import { kv } from '@vercel/kv';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // 1. Pull the fresh token you just manually set
    let refreshToken = await kv.get('tesla_refresh_token');
    
    if (!refreshToken) throw new Error('Database empty. Run SET in Vercel CLI.');

    // 2. Exchange it with Tesla
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

    // 3. Save the NEXT token Tesla just gave us (Rotation)
    if (tokenData.refresh_token) {
      await kv.set('tesla_refresh_token', tokenData.refresh_token);
    }

    if (!tokenData.access_token) throw new Error('Tesla Auth Failed - Token Expired');

    // 4. Get the Powerwall data
    const energyResponse = await fetch(
      'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/energy_sites/2715465/site_status',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    const energyData = await energyResponse.json();

    res.status(200).json({ 
      battery_level: energyData.response.percentage_charged, 
      status: energyData.response.battery_power < -100 ? "Discharging" : "Standby"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
