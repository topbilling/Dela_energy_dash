export default async function handler(req, res) {
  // 1. Immediate Health Check
  const { code } = req.query;
  
  if (!code) {
    return res.status(200).json({ 
      status: "Online", 
      message: "The door is open! Now re-run your Tesla login link." 
    });
  }

  // 2. Logic to handle the code from Tesla
  try {
    const tokenResponse = await fetch('https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: '9ff02a60-f283-464b-a471-a1f0a1fb8025',
        client_secret: process.env.TESLA_CLIENT_SECRET, // Make sure this is in Vercel Env!
        code: code,
        redirect_uri: 'https://dela-energy-dash.vercel.app/api/tesla/auth',
        audience: 'https://fleet-api.prd.na.vn.cloud.tesla.com'
      })
    });

    const data = await tokenResponse.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
