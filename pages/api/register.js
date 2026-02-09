// pages/api/tesla/register.js
export default async function handler(req, res) {
  // 1. Get the Partner Token (Machine-to-Machine)
  const tokenResponse = await fetch('https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials', // This MUST be client_credentials
      client_id: process.env.TESLA_CLIENT_ID,
      client_secret: process.env.TESLA_CLIENT_SECRET,
      scope: 'openid user_data energy_device_data',
      audience: 'https://fleet-api.prd.na.vn.cloud.tesla.com'
    })
  });

  const tokenData = await tokenResponse.json();

  // 2. Use that Partner Token to Register
  const regResponse = await fetch('https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ domain: "dela-energy-dash.vercel.app" })
  });

  const data = await regResponse.json();
  res.status(200).json(data);
}
