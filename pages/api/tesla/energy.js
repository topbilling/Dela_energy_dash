export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/products',
      {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${process.env.TESLA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
      }
    );

    const data = await response.json();
    
    // DEBUG: Just show us EVERYTHING Tesla sent
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
