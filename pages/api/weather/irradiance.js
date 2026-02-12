export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // Coordinates for Zip 20144 (Leesburg/Hamilton, VA)
    const lat = 39.115;
    const lon = -77.564;

    // Fetch BOTH current status AND today's hourly forecast (24h)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=shortwave_radiation&hourly=shortwave_radiation&timezone=America%2FNew_York&forecast_days=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.current || !data.hourly) throw new Error("No weather data found");

    // Format the hourly data for the graph
    // Open-Meteo returns two arrays: time[] and shortwave_radiation[]
    const hourlyData = data.hourly.time.map((time, index) => ({
      timestamp: time,
      ghi: data.hourly.shortwave_radiation[index] // Watts/m²
    }));

    res.status(200).json({
      current_ghi: data.current.shortwave_radiation,
      hourly_ghi: hourlyData,
      unit: "W/m²"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
