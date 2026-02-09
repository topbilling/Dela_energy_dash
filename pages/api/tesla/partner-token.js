// pages/api/tesla/partner-token.js
export default async function handler(req, res) {
  const response = await fetch('https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.TESLA_CLIENT_ID,
      client_secret: process.env.TESLA_CLIENT_SECRET,
      scope: 'openid user_data energy_device_data',
      audience: 'https://fleet-api.prd.na.vn.cloud.tesla.com'
    })
  });
  const data = await response.json();
  res.status(200).json(data);
}
