import { kv } from '@vercel/kv';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // 1. Get Access Token (Check KV Cache First, fallback to Env Var)
    let accessToken = await kv.get('tesla_access_token') || process.env.TESLA_ACCESS_TOKEN;

    // 2. We do a quick test fetch to see if the token is actually alive
    let liveResponse = await fetch(
      'https://owner-api.teslamotors.com/api/1/energy_sites/2715465/live_status',
      {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      }
    );

    // 3. If token is missing or dead (401), execute the refresh!
    if (!accessToken || liveResponse.status === 401) {
      console.log("Token dead or missing. Refreshing via KV/Env...");
      
      // Pull backup refresh token from KV, or fallback to the Env Var we just saved
      const refreshToken = await kv.get('tesla_refresh_token') || process.env.TESLA_REFRESH_TOKEN;
      if (!refreshToken) throw new Error('No refresh token found anywhere.');

      const tokenResponse = await fetch('https://auth.tesla.com/oauth2/v3/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: 'ownerapi',
          refresh_token: refreshToken
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) throw new Error('Tesla Auth Failed. Token generator output invalid.');

      // Save new tokens to KV so it stays fast for the next 7 hours
      await kv.set('tesla_refresh_token', tokenData.refresh_token);
      await kv.set('tesla_access_token', tokenData.access_token, { ex: 25200 });
      accessToken = tokenData.access_token;

      // Retry the live data fetch with the shiny new key
      liveResponse = await fetch(
        'https://owner-api.teslamotors.com/api/1/energy_sites/2715465/live_status',
        {
          headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
        }
      );
    }

    // 4. Send Clean Data
    const liveData = await liveResponse.json();
    const d = liveData.response;

    res.status(200).json({ 
      solar_power: d.solar_power,       
      grid_power: d.grid_power,         
      battery_power: d.battery_power,   
      load_power: d.load_power,         
      battery_level: d.percentage_charged,
      island_status: d.island_status,   
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
