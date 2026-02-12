export default async function handler(req, res) {
  const { period = 'day' } = req.query;

  // In a real setup, you would map 'period' to Tesla's 'calendar_history' API
  // For now, we will provide the structured data your widget needs to render
  const mockData = {
    day: Array.from({ length: 24 }, (_, i) => ({
      label: `${i}:00`,
      sold: Math.random() * 2,
      consumed: Math.random() * 5,
      purchased: Math.random() * 3
    })),
    week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => ({
      label: d,
      sold: Math.random() * 10,
      consumed: Math.random() * 20,
      purchased: Math.random() * 15
    })),
    // ... month, year, lifetime follow the same structure
  };

  res.status(200).json(mockData[period] || mockData.day);
}
