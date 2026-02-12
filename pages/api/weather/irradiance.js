export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    // Coordinates for Zip 20144 (Leesburg, VA)
    const lat = 39.115;
    const lon = -77.564;

    // Fetch current GHI (Global Horizontal Irradiance)
    // We also ask for 'direct_normal_irradiance' just in case you want it later
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=shortwave_radiation,direct_normal_irradiance,diffuse_radiation&timezone=America%2FNew_York&forecast_days=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.current) throw new Error("No weather data found");

    res.status(200).json({
      ghi: data.current.shortwave_radiation, // Watts/m² (The main number)
      dni: data.current.direct_normal_irradiance, // Direct sun (shadow casting)
      timestamp: data.current.time,
      unit: "W/m²"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
