export default async function handler(req, res) {
  const { token } = req.query; // Use the User Access Token here
  const siteId = process.env.TESLA_ENERGY_SITE_ID;

  const response = await fetch(`https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/energy_sites/${siteId}/live_status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();
  res.status(200).json(data);
}
