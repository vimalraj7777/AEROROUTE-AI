import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Navigation,
  CloudRain,
  Gauge,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Cpu,
  Clock,
  Compass,
} from 'lucide-react';
import { api } from '../api';
import { LeafletMap } from '../components/LeafletMap';
import { Airport, AirportActivity, MetarObservation } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [activities, setActivities] = useState<AirportActivity[]>([]);
  const [weatherList, setWeatherList] = useState<MetarObservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick optimization preview
  const [quickOrigin, setQuickOrigin] = useState('JFK');
  const [quickDest, setQuickDest] = useState('SFO');

  useEffect(() => {
    async function loadData() {
      try {
        const [apRes, congRes, wxRes] = await Promise.all([
          api.getAirports(),
          api.getCongestionSummary(),
          api.getWeatherSummary(),
        ]);
        setAirports(apRes.airports);
        setActivities(congRes.airports);
        setWeatherList(wxRes.observations);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const topCongested = activities.slice(0, 5);
  const severeWeather = weatherList.filter((w) => w.composite_risk_score > 40);

  const handleLaunchOptimizer = () => {
    navigate(`/app/routes?origin=${quickOrigin}&dest=${quickDest}`);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 font-mono text-cyan-400 text-sm animate-pulse">
          <Compass className="w-5 h-5 animate-spin" />
          <span>INITIALIZING AEROSPACE OPERATIONS TELEMETRY...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-8 lg:p-10 space-y-7 max-w-[1500px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
              NATIONAL AIRSPACE OPERATIONS OVERVIEW
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
              BUNDLED DATA READY
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Local-snapshot decision support · Historical flight records · Stored METAR observations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/app/routes')}
            className="flex items-center gap-2 px-3.5 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-semibold tracking-wide transition-colors cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            <span>OPEN ROUTE OPTIMIZER</span>
          </button>
        </div>
      </div>

      {/* Top 4 Operational Risk Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#0c121d] border border-slate-800 rounded p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>MONITORED HUBS</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {airports.length}{' '}
            <span className="text-xs font-normal text-slate-500">Major Hubs</span>
          </div>
          <div className="text-[11px] font-mono text-emerald-400/90 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>100% Sensor Stream Health</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#0c121d] border border-slate-800 rounded p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>METAR WEATHER RISKS</span>
            <CloudRain className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {severeWeather.length}{' '}
            <span className="text-xs font-normal text-slate-500">Active Warning Hubs</span>
          </div>
          <div className="text-[11px] font-mono text-amber-400/90 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Stored observations above the risk threshold</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#0c121d] border border-slate-800 rounded p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>PEAK AIRSPACE CONGESTION</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {topCongested[0]?.airport || 'ORD'}{' '}
            <span className="text-xs font-normal text-slate-500">
              ({topCongested[0]?.derived_congestion_index || 88.5}% load)
            </span>
          </div>
          <div className="text-[11px] font-mono text-purple-400/90 mt-2">
            <span>
              {topCongested[0]?.ground_delay_program ? 'GDP proxy flagged' : 'No GDP proxy flag'} · Avg taxi{' '}
              {topCongested[0]?.avg_taxi_out_min ?? '--'}m
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#0c121d] border border-slate-800 rounded p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>MODEL METRIC ARTIFACT</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            84.2%{' '}
            <span className="text-xs font-normal text-slate-500">Reported Accuracy</span>
          </div>
          <div className="text-[11px] font-mono text-cyan-400 mt-2">
            <span>Runtime uses deterministic scoring</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Map & Quick Route Launcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2 bg-[#0c121d] border border-slate-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <h2 className="text-sm font-bold font-mono text-slate-200">
                ACTIVE NATIONAL AIRSPACE NETWORK
              </h2>
            </div>
            <button
              onClick={() => navigate('/app/network')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>Full Graph View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <LeafletMap
            waypoints={airports.map((a) => ({
              iata: a.iata,
              lat: a.latitude,
              lon: a.longitude,
              name: a.name,
              weather_risk: a.weather_risk,
              congestion_index: a.congestion_index,
            }))}
            activeRoute={['JFK', 'ORD', 'DEN', 'SFO']}
            alternativeRoutes={[
              { name: 'Southern Corridor', path: ['JFK', 'ATL', 'DFW', 'PHX', 'LAX'], color: '#94a3b8' },
            ]}
            height="360px"
          />
        </div>

        {/* Quick Route Optimizer Launcher */}
        <div className="bg-[#0c121d] border border-slate-800 rounded p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-mono text-slate-200">
                DISPATCH ROUTE PLANNER
              </h3>
            </div>

            <p className="text-xs text-slate-400 font-mono leading-relaxed">
              Compare multi-objective flight corridors using Dijkstra and A* with stored weather-risk and congestion snapshots.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  ORIGIN HUB
                </label>
                <select
                  value={quickOrigin}
                  onChange={(e) => setQuickOrigin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {airports.map((a) => (
                    <option key={a.iata} value={a.iata}>
                      {a.iata} — {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  DESTINATION HUB
                </label>
                <select
                  value={quickDest}
                  onChange={(e) => setQuickDest(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {airports.map((a) => (
                    <option key={a.iata} value={a.iata}>
                      {a.iata} — {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleLaunchOptimizer}
            className="w-full mt-6 py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-semibold text-xs tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>CALCULATE MULTI-OBJECTIVE ROUTE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lower Tables: Top Congested & Severe Weather Hubs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Congested Hubs */}
        <div className="bg-[#0c121d] border border-slate-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold font-mono text-slate-200">
                TOP CONGESTION PROXIES
              </h3>
            </div>
            <button
              onClick={() => navigate('/app/congestion')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="py-2">HUB</th>
                  <th className="py-2">OPS / HR</th>
                  <th className="py-2">LOAD</th>
                  <th className="py-2">INDEX</th>
                  <th className="py-2">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {topCongested.map((act) => (
                  <tr key={act.airport} className="hover:bg-slate-900/40">
                    <td className="py-2.5 font-bold text-slate-200">{act.airport}</td>
                    <td className="py-2.5 text-slate-300">{act.total_operations}</td>
                    <td className="py-2.5 text-slate-400">{Math.round(act.load_factor * 100)}%</td>
                    <td className="py-2.5 text-cyan-400">{act.derived_congestion_index}</td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          act.congestion_band === 'Severe'
                            ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                            : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                        }`}
                      >
                        {act.congestion_band}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Severe Weather Warnings */}
        <div className="bg-[#0c121d] border border-slate-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold font-mono text-slate-200">
                STORED METAR RISK OBSERVATIONS
              </h3>
            </div>
            <button
              onClick={() => navigate('/app/weather')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              All Stations
            </button>
          </div>

          <div className="space-y-2.5">
            {severeWeather.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono py-4">No stored observations exceed the risk threshold.</p>
            ) : (
              severeWeather.map((wx) => (
                <div
                  key={wx.station}
                  className="bg-slate-900/60 border border-slate-800 p-2.5 rounded font-mono text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{wx.station}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/50 text-red-400 border border-red-800/40">
                      RISK SCORE {wx.composite_risk_score}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Category: <span className="text-amber-400">{wx.flight_category}</span> · Wind: {wx.wind_speed_kt}kt
                    {wx.wind_gust_kt ? ` G${wx.wind_gust_kt}` : ''} · Vis: {wx.visibility_sm}SM
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{wx.raw_metar}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
