export default async function handler(req, res) {
  const { code } = req.query;

  const response = await fetch('https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.TESLA_CLIENT_ID,
      client_secret: process.env.TESLA_CLIENT_SECRET,
      code,
      redirect_uri: 'https://dela-energy-dash.vercel.app/api/tesla/auth',
      audience: 'https://fleet-api.prd.na.vn.cloud.tesla.com'
    })
  });

  const data = await response.json();
  // This will display your tokens on the screen so you can save them
  res.status(200).json(data);
}
