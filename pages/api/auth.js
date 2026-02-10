// pages/api/tesla/auth.js
export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  try {
    const response = await fetch('https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: '9ff02a60-f283-464b-a471-a1f0a1fb8025',
        client_secret: process.env.TESLA_CLIENT_SECRET, // From Vercel Env
        code,
        redirect_uri: 'https://dela-energy-dash.vercel.app/api/tesla/auth',
        audience: 'https://fleet-api.prd.na.vn.cloud.tesla.com'
      })
    });

    const data = await response.json();
    // SUCCESS: Save these tokens to your DB or secure cookie
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
