import React, { useState, useEffect } from 'react';
import { Sun, BatteryCharging, Zap, Home } from 'lucide-react';

const EnergyDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This calls the API route you just created in pages/api/tesla/status.js
    const getEnergyData = async () => {
      try {
        // In a real flow, you'd pass your token/site_id here
        const response = await fetch('/api/tesla/status?site_id=2715465');
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching PowerWall data:", error);
        setLoading(false);
      }
    };

    getEnergyData();
    // Refresh every 5 minutes to stay well within the $10 Tesla credit
    const interval = setInterval(getEnergyData, 300000); 
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Initializing Energy Command...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Residant Energy Command
          </h1>
          <p className="text-slate-400 text-sm">Delaplane, VA • 10.8 kW System</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">System Status</span>
          <div className="text-green-400 font-bold">ONLINE</div>
        </div>
      </header>

      {/* Real-Time Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard 
          icon={<Sun className="text-yellow-400" />} 
          label="Solar Production" 
          value={`${(data?.solar_power / 1000 || 0).toFixed(1)} kW`} 
          sub="Live PV Generation" 
        />
        <StatCard 
          icon={<BatteryCharging className="text-green-400" />} 
          label="PowerWall" 
          value={`${data?.percentage_charged.toFixed(0) || 0}%`} 
          sub={data?.battery_power > 0 ? "Charging" : "Discharging"} 
        />
        <StatCard 
          icon={<Home className="text-blue-400" />} 
          label="Home Load" 
          value={`${(data?.load_power / 1000 || 0).toFixed(1)} kW`} 
          sub="Lumin Panel Active" 
        />
        <StatCard 
          icon={<Zap className="text-purple-400" />} 
          label="Grid Net" 
          value={`${(data?.grid_power / 1000 || 0).toFixed(1)} kW`} 
          sub={data?.grid_power < 0 ? "Exporting to Dominion" : "Importing"} 
        />
      </div>

      {/* The Visual "Vibe" - Interactive Flow */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-500/5 opacity-20 animate-pulse" />
        <p className="text-slate-500 font-mono text-xs uppercase mb-4 z-10">Energy Flow Visualization</p>
        <div className="text-center z-10">
           <div className="text-6xl font-bold mb-2">{(data?.solar_power / 1000 || 0).toFixed(1)} <span className="text-2xl text-slate-500 text-slate-500 uppercase">kW</span></div>
           <p className="text-orange-400 font-medium tracking-wide">Solar is powering {(((data?.solar_power - data?.grid_power) / data?.load_power) * 100 || 0).toFixed(0)}% of your home</p>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, sub }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-orange-500/30 transition-all cursor-default group">
    <div className="flex items-center gap-3 mb-4">
      {icon}
      <span className="text-sm font-medium text-slate-400 uppercase tracking-wider group-hover:text-slate-200">{label}</span>
    </div>
    <div className="text-3xl font-bold mb-1 font-mono">{value}</div>
    <div className="text-xs text-slate-500 font-medium">{sub}</div>
  </div>
);

export default EnergyDashboard;
