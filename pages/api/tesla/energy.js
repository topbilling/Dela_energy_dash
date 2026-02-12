import { kv } from '@vercel/kv';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // 1. Check if we already have a valid ACCESS token in the DB
    // This prevents hitting Tesla's refresh limit on every page load
    let accessToken = await kv.get('tesla_access_token');
    
    if (accessToken) {
      return fetchEnergyData(accessToken, res);
    }

    // 2. No access token? Get the REFRESH token
    let refreshToken = await kv.get('tesla_refresh_token');
    if (!refreshToken) throw new Error('Database empty. Seed via CLI.');

    // 3. Exchange for new tokens
    const response = await fetch('https://auth.tesla.com/oauth2/v3/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.TESLA_CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!data.access_token) throw new Error('Tesla Auth Failed: ' + JSON.stringify(data));

    // 4. SAVE BOTH tokens. 
    // We set the Access Token to expire in the DB in 7 hours (Tesla gives 8)
    await kv.set('tesla_refresh_token', data.refresh_token);
    await kv.set('tesla_access_token', data.access_token, { ex: 25200 }); 

    return fetchEnergyData(data.access_token, res);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function fetchEnergyData(token, res) {
  const response = await fetch(
    'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/energy_sites/2715465/site_status',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  res.status(200).json({ 
    battery_level: data.response.percentage_charged, 
    status: data.response.battery_power < -100 ? "Discharging" : "Standby" 
  });
}
