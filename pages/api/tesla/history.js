import { kv } from '@vercel/kv';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // 1. Get Access Token (reuse your existing logic)
    let accessToken = await kv.get('tesla_access_token');

    // If missing, refresh it (Safety fallback)
    if (!accessToken) {
      const refreshToken = await kv.get('tesla_refresh_token');
      if (!refreshToken) throw new Error('Database empty.');

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
      if (tokenData.access_token) {
        await kv.set('tesla_refresh_token', tokenData.refresh_token);
        await kv.set('tesla_access_token', tokenData.access_token, { ex: 25200 });
        accessToken = tokenData.access_token;
      }
    }

    // 2. Fetch History (Granularity: 15 mins)
    // We request the "day" period with "power" kind.
    const endDate = new Date().toISOString().split('.')[0]+"Z"; // Current UTC time
    
    const historyResponse = await fetch(
      `https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/energy_sites/2715465/calendar_history?kind=power&period=day&end_date=${endDate}`,
      {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      }
    );

    const historyData = await historyResponse.json();
    
    if (historyData.error) throw new Error(JSON.stringify(historyData));

    // 3. Extract just the Solar data for the graph
    // time_series is an array of objects. We map it to a simpler format.
    const solarData = historyData.response.time_series.map(point => ({
      timestamp: point.timestamp,
      solar_power: point.solar_power, // Watts
    }));

    res.status(200).json({ solarData });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
