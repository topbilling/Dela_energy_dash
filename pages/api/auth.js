export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    // 1. Exchange the Authorization Code for User Tokens
    const tokenResponse = await fetch('https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.TESLA_CLIENT_ID,
        client_secret: process.env.TESLA_CLIENT_SECRET,
        code: code,
        redirect_uri: `https://${process.env.VERCEL_URL}/api/tesla/auth`,
        audience: 'https://fleet-api.prd.na.vn.cloud.tesla.com'
      })
    });

    const data = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Tesla Token Exchange Error:', data);
      return res.status(tokenResponse.status).json(data);
    }

    // 2. Logic to store tokens (e.g., in a database or secure cookie)
    // For now, we will return them so you can verify they work.
    // In production, NEVER expose the refresh_token to the browser.
    
    res.status(200).json({
      message: 'Authentication Successful',
      access_token: data.access_token,
      refresh_token: data.refresh_token, // Save this! You'll need it every 8 hours.
      expires_in: data.expires_in
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
