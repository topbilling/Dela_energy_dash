export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // 1. Get the list of products from Tesla
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
        throw new Error(`Tesla API Error: ${response.status}`);
    }

    const data = await response.json();

    // 2. Find the Powerwall in the list
    const battery = data.response.find(item => item.resource_type === 'battery');

    if (!battery) {
      throw new Error('No Powerwall found');
    }

    // 3. Determine Status (Charging, Discharging, or Standby)
    let status = "Standby";
    if (battery.battery_power < -100) status = "Discharging";
    if (battery.battery_power > 100) status = "Charging";

    // 4. Return the clean data to your dashboard
    res.status(200).json({ 
      battery_level: battery.percentage_charged, 
      status: status,
      site_name: battery.site_name
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
