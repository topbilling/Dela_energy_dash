export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // 1. Hit the "Products" endpoint (We know this works!)
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tesla API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // 2. Find the Battery in the list
    // We look for "resource_type": "battery"
    const battery = data.response.find(item => item.resource_type === 'battery');

    if (!battery) {
      throw new Error('No Powerwall found in Tesla account');
    }

    // 3. Return the percentage
    res.status(200).json({ 
      site_name: battery.site_name,
      battery_level: battery.percentage_charged, 
      status: "Active",
      timestamp: new Date().toISOString() 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
