export default async function handler(req, res) {
  const { period = 'day' } = req.query;

  let TOKEN = process.env.TESLA_ACCESS_TOKEN;
  const REFRESH_TOKEN = process.env.TESLA_REFRESH_TOKEN;
  const SITE_ID = '2715465'; 
  const BASE_URL = 'https://owner-api.teslamotors.com';
  const TIMEZONE = 'America/New_York';

  const fetchData = async (accessToken) => {
    return fetch(
      `${BASE_URL}/api/1/energy_sites/${SITE_ID}/calendar_history?kind=energy&period=${period}`,
      {
        headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
      }
    );
  };

  try {
    let teslaRes = await fetchData(TOKEN);

    // --- SELF-HEALING TOKEN LOGIC ---
    if (teslaRes.status === 401) {
      console.log("Token expired. Refreshing...");
      const refreshRes = await fetch('https://auth.tesla.com/oauth2/v3/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: 'ownerapi',
          refresh_token: REFRESH_TOKEN,
          scope: 'openid email offline_access'
        })
      });

      const refreshJson = await refreshRes.json();
      if (refreshJson.access_token) {
        TOKEN = refreshJson.access_token; 
        teslaRes = await fetchData(TOKEN);
      } else {
        throw new Error("Critical: Refresh Token Invalid.");
      }
    }

    if (!teslaRes.ok) {
        const errorText = await teslaRes.text();
        return res.status(teslaRes.status).json({ error: "Tesla API Error", details: errorText });
    }

    const data = await teslaRes.json();
    const timeSeries = data.response?.time_series || [];
    
    // --- ESTABLISH CURRENT TIME IN ET ---
    const nowStr = new Date().toLocaleString('en-US', { timeZone: TIMEZONE });
    const nowET = new Date(nowStr);
    
    let formatted = [];

    // Helper to get a clean formatted date string for matching
    const getMatchDate = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

    // --- STRICT BUCKETING ENGINE ---

    if (period === 'day') {
        // 24 Hours: Midnight to 11 PM
        formatted = Array.from({ length: 24 }, (_, i) => ({
            label: `${i}:00`, sold: 0, consumed: 0, purchased: 0
        }));

        timeSeries.forEach(item => {
            const etDateStr = new Date(item.timestamp).toLocaleString('en-US', { timeZone: TIMEZONE });
            const etDate = new Date(etDateStr);
            
            // Only aggregate if the data point belongs to today
            if (getMatchDate(etDate) === getMatchDate(nowET)) {
                const hour = etDate.getHours(); 
                formatted[hour].sold += (item.solar_energy_exported || 0) / 1000;
                formatted[hour].purchased += (item.grid_energy_imported || 0) / 1000;
                formatted[hour].consumed += Math.max(0, ((item.home_energy_total || 0) - (item.grid_energy_imported || 0))) / 1000;
            }
        });
    } 
    else if (period === 'week') {
        // Exactly Last 7 Days ending today
        const todayAtMidnight = new Date(nowET);
        todayAtMidnight.setHours(0, 0, 0, 0);

        for (let i = 6; i >= 0; i--) {
            const d = new Date(todayAtMidnight);
            d.setDate(d.getDate() - i);
            formatted.push({
                label: d.toLocaleDateString('en-US', { weekday: 'short' }),
                matchDate: getMatchDate(d),
                sold: 0, consumed: 0, purchased: 0
            });
        }

        timeSeries.forEach(item => {
            const etDateStr = new Date(item.timestamp).toLocaleString('en-US', { timeZone: TIMEZONE });
            const etDate = new Date(etDateStr);
            const matchString = getMatchDate(etDate);

            const target = formatted.find(f => f.matchDate === matchString);
            if (target) {
                target.sold += (item.solar_energy_exported || 0) / 1000;
                target.purchased += (item.grid_energy_imported || 0) / 1000;
                target.consumed += Math.max(0, ((item.home_energy_total || 0) - (item.grid_energy_imported || 0))) / 1000;
            }
        });
    }
    else if (period === 'month') {
        // Current Calendar Month (Day 1 to Last Day of this month)
        const year = nowET.getFullYear();
        const month = nowET.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            formatted.push({
                label: `${d.toLocaleDateString('en-US', { month: 'short' })} ${i}`,
                matchDate: getMatchDate(d),
                sold: 0, consumed: 0, purchased: 0
            });
        }

        timeSeries.forEach(item => {
            const etDateStr = new Date(item.timestamp).toLocaleString('en-US', { timeZone: TIMEZONE });
            const etDate = new Date(etDateStr);
            const matchString = getMatchDate(etDate);

            const target = formatted.find(f => f.matchDate === matchString);
            if (target) {
                target.sold += (item.solar_energy_exported || 0) / 1000;
                target.purchased += (item.grid_energy_imported || 0) / 1000;
                target.consumed += Math.max(0, ((item.home_energy_total || 0) - (item.grid_energy_imported || 0))) / 1000;
            }
        });
    }
    else if (period === 'year') {
        // Last 12 Months ending this month
        const currentYear = nowET.getFullYear();
        const currentMonth = nowET.getMonth();

        for (let i = 11; i >= 0; i--) {
            let d = new Date(currentYear, currentMonth - i, 1);
            formatted.push({
                label: d.toLocaleDateString('en-US', { month: 'short' }),
                matchMonth: d.getMonth(),
                matchYear: d.getFullYear(),
                sold: 0, consumed: 0, purchased: 0
            });
        }

        timeSeries.forEach(item => {
            const etDateStr = new Date(item.timestamp).toLocaleString('en-US', { timeZone: TIMEZONE });
            const etDate = new Date(etDateStr);
            
            const target = formatted.find(f => f.matchMonth === etDate.getMonth() && f.matchYear === etDate.getFullYear());
            if (target) {
                target.sold += (item.solar_energy_exported || 0) / 1000;
                target.purchased += (item.grid_energy_imported || 0) / 1000;
                target.consumed += Math.max(0, ((item.home_energy_total || 0) - (item.grid_energy_imported || 0))) / 1000;
            }
        });
    }
    else if (period === 'life') {
        // Yearly Data Since Inception
        const lifeMap = {};
        timeSeries.forEach(item => {
            const etDateStr = new Date(item.timestamp).toLocaleString('en-US', { timeZone: TIMEZONE });
            const etDate = new Date(etDateStr);
            const year = etDate.getFullYear().toString();
            
            if (!lifeMap[year]) {
                lifeMap[year] = { label: year, matchYear: parseInt(year), sold: 0, consumed: 0, purchased: 0 };
            }
            lifeMap[year].sold += (item.solar_energy_exported || 0) / 1000;
            lifeMap[year].purchased += (item.grid_energy_imported || 0) / 1000;
            lifeMap[year].consumed += Math.max(0, ((item.home_energy_total || 0) - (item.grid_energy_imported || 0))) / 1000;
        });
        
        formatted = Object.values(lifeMap).sort((a, b) => a.matchYear - b.matchYear);
    }

    // Clean up temporary matching fields before sending to the chart
    const cleanData = formatted.map(({ label, sold, consumed, purchased }) => ({ label, sold, consumed, purchased }));

    res.status(200).json(cleanData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
