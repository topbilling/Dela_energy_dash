export default async function handler(req, res) {
  const { period = 'day' } = req.query;

  // The Site ID for Possum Hollow
  const SITE_ID = process.env.TESLA_SITE_ID || '2715465'; 

  try {
    const teslaRes = await fetch(
      `https://owner-api.teslamotors.com/api/1/energy_sites/${SITE_ID}/calendar_history?kind=energy&period=${period}`,
      {
        headers: { 
          'Authorization': `Bearer ${process.env.TESLA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!teslaRes.ok) {
      const errorText = await teslaRes.text();
      return res.status(teslaRes.status).json({ error: "Tesla API Error", details: errorText });
    }

    const data = await teslaRes.json();
    const timeSeries = data.response.time_series;

    // Format the data for the stacked bar chart
    const formattedData = timeSeries.map(item => {
      const date = new Date(item.timestamp);
      let label = "";

      // Logic for Granularity Labels
      if (period === 'day') {
        label = date.getHours() + ":00";
      } else if (period === 'week' || period === 'month') {
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (period === 'year') {
        label = date.toLocaleDateString('en-US', { month: 'short' });
      } else if (period === 'life') {
        label = date.getFullYear().toString();
      }

      /**
       * CALCULATIONS (Tesla returns Wh, we convert to kWh)
       * 1. Sold: solar_energy_exported
       * 2. Purchased: grid_energy_imported
       * 3. Consumed: (Home Total - Grid Imported) = Solar used directly by the house
       */
      const imported = (item.grid_energy_imported || 0);
      const homeTotal = (item.home_energy_total || 0);
      
      return {
        label: label,
        sold: (item.solar_energy_exported || 0) / 1000,
        consumed: Math.max(0, (homeTotal - imported)) / 1000,
        purchased: imported / 1000
      };
    });

    res.status(200).json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
