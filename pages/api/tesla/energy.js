import { kv } from '@vercel/kv';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // 1. Get the Refresh Token from our Vercel Database
    let refreshToken = await kv.get('tesla_refresh_token');

    // --- EMERGENCY SELF-HEALING START ---
    // If the DB is empty (because we couldn't run the CLI command),
    // use this hardcoded token to "seed" the database right now.
    if (!refreshToken) {
      console.log("Database empty. Performing emergency seed...");
      // Your specific token:
      refreshToken = "NA_75d9cadb879b81d3eae482e11dea672ff91253b2beac0354fb4ec66917e41a86";
      
      // Save it to the database forever so we don't need this block again
      await kv.set('tesla_refresh_token', refreshToken);
    }
    // --- EMERGENCY SELF-HEALING END ---

    // 2. Exchange it for a new Access Token
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

    // 3. IF we got a new Refresh Token, SAVE IT immediately to the DB
    if (tokenData.refresh_token) {
      await kv.set('tesla_refresh_token', tokenData.refresh_token);
      console.log('Token rotated and saved to Vercel KV.');
    }

    if (!tokenData.access_token) {
         // If refresh failed, print why (likely token expired)
         throw new Error('Failed to refresh token: ' + JSON.stringify(tokenData));
    }

    // 4. Use the new Access Token to get your Powerwall data
    const energyResponse = await fetch(
      'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/products',
      {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
      }
    );

    const energyData = await energyResponse.json();
    const battery = energyData.response.find(item => item.resource_type === 'battery');

    if (!battery) throw new Error('No Powerwall found');

    // 5. Success! Return the data
    res.status(200).json({ 
      battery_level: battery.percentage_charged, 
      status: battery.battery_power < -100 ? "Discharging" : battery.battery_power > 100 ? "Charging" : "Standby",
      site_name: battery.site_name
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
