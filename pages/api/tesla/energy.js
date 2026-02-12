import { kv } from '@vercel/kv';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // 1. Get Access Token (Check Cache First)
    let accessToken = await kv.get('tesla_access_token');

    // 2. If no valid access token, use Refresh Token to get a new one
    if (!accessToken) {
      const refreshToken = await kv.get('tesla_refresh_token');
      if (!refreshToken) throw new Error('Database empty. Run SET in CLI.');

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
      if (!tokenData.access_token) throw new Error('Tesla Auth Failed');

      // Save new tokens (Access expires in 8h, we cache for 7h)
      await kv.set('tesla_refresh_token', tokenData.refresh_token);
      await kv.set('tesla_access_token', tokenData.access_token, { ex: 25200 });
      accessToken = tokenData.access_token;
    }

    // 3. Fetch LIVE Power Data (The "Power Flow" Endpoint)
    const liveResponse = await fetch(
      'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/energy_sites/2715465/live_status',
      {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      }
    );

    const liveData = await liveResponse.json();
    const d = liveData.response;

    // 4. Send Clean Data
    // Note: Tesla returns Watts. We convert to Kilowatts (kW) for display.
    res.status(200).json({ 
      solar_power: d.solar_power,       // Positive = Generating
      grid_power: d.grid_power,         // Positive = Import, Negative = Export
      battery_power: d.battery_power,   // Positive = Discharging, Negative = Charging
      load_power: d.load_power,         // House Consumption
      battery_level: d.percentage_charged,
      island_status: d.island_status,   // "island_status": "on_grid" or "off_grid"
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
