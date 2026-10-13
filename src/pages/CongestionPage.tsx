import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Clock,
  AlertTriangle,
  Info,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';
import { api } from '../api';
import { AirportActivity } from '../types';

export const CongestionPage: React.FC = () => {
  const [activities, setActivities] = useState<AirportActivity[]>([]);
  const [selectedHub, setSelectedHub] = useState<string>('ORD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCongestion() {
      try {
        const res = await api.getCongestionSummary();
        setActivities(res.airports);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCongestion();
  }, []);

  const selectedActivity =
    activities.find((a) => a.airport === selectedHub) || activities[0];

  return (
    <div className="p-5 sm:p-8 lg:p-10 space-y-7 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
              AIRPORT CONGESTION & OPERATIONAL THROUGHPUT
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-500/30">
              DERIVED OPERATIONAL PROXY
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Airport runway load factors, rolling operations density, Ground Delay Program status, and average taxi-out delays.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Monitoring {activities.length} Airspace Hubs
        </div>
      </div>

      {selectedActivity && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selected Airport Summary */}
          <div className="lg:col-span-2 bg-[#0c121d] border border-slate-800 rounded p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold font-mono text-slate-100">
                    {selectedActivity.airport} — {selectedActivity.name}
                  </h2>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                      selectedActivity.congestion_band === 'Severe'
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                        : selectedActivity.congestion_band === 'High'
                        ? 'bg-purple-950/60 text-purple-400 border border-purple-800/40'
                        : 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40'
                    }`}
                  >
                    BAND: {selectedActivity.congestion_band}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400 mt-1">
                  Trend: {selectedActivity.trend.toUpperCase()} · GDP:{' '}
                  {selectedActivity.ground_delay_program ? (
                    <span className="text-rose-400 font-bold">ACTIVE IN EFFECT</span>
                  ) : (
                    <span className="text-emerald-400">NONE</span>
                  )}
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-xs text-slate-400">DERIVED CONGESTION INDEX</span>
                <div className="text-2xl font-bold text-purple-400">
                  {selectedActivity.derived_congestion_index}{' '}
                  <span className="text-xs font-normal text-slate-500">/ 100</span>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded">
                <div className="text-[10px] text-slate-400">HOURLY DEPARTURES</div>
                <div className="text-xl font-bold text-slate-100">
                  {selectedActivity.hourly_departures}
                </div>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded">
                <div className="text-[10px] text-slate-400">HOURLY ARRIVALS</div>
                <div className="text-xl font-bold text-slate-100">
                  {selectedActivity.hourly_arrivals}
                </div>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded">
                <div className="text-[10px] text-slate-400">RUNWAY CAPACITY LOAD</div>
                <div className="text-xl font-bold text-purple-400">
                  {Math.round(selectedActivity.load_factor * 100)}%
                </div>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded">
                <div className="text-[10px] text-slate-400">AVG TAXI-OUT</div>
                <div className="text-xl font-bold text-amber-400">
                  {selectedActivity.avg_taxi_out_min}m
                </div>
              </div>
            </div>

            {/* Capacity Bar Visualizer */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Runway Hourly Movements vs Declared Capacity</span>
                <span>
                  {selectedActivity.total_operations} / {selectedActivity.runway_capacity} ops
                </span>
              </div>
              <div className="w-full h-2.5 rounded bg-slate-900 overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all ${
                    selectedActivity.load_factor > 0.9
                      ? 'bg-rose-500'
                      : selectedActivity.load_factor > 0.75
                      ? 'bg-purple-500'
                      : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, selectedActivity.load_factor * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Methodology Panel */}
          <div className="bg-[#0c121d] border border-slate-800 rounded p-5 font-mono text-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-200">
              <Info className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-xs uppercase">Methodology Disclosure</h3>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              AeroRoute AI does <strong>not</strong> simulate live gate-occupancy telemetry or physical camera feeds.
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              The <em>Derived Congestion Index</em> is computed from:
            </p>
            <ul className="text-slate-300 text-[11px] space-y-1 list-disc list-inside">
              <li>Scheduled hourly flight movements (BTS)</li>
              <li>Engineered FAA runway acceptance capacity</li>
              <li>Rolling departure/arrival imbalance queue length</li>
              <li>Reported taxi-out delay time proxies</li>
            </ul>
          </div>
        </div>
      )}

      {/* Ranked Airport Congestion Table */}
      <div className="bg-[#0c121d] border border-slate-800 rounded p-4 space-y-3">
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
          RANKED AIRPORT THROUGHPUT & CONGESTION LEADERBOARD
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="py-2">HUB</th>
                <th className="py-2">NAME</th>
                <th className="py-2">DEPARTURES</th>
                <th className="py-2">ARRIVALS</th>
                <th className="py-2">CAPACITY LOAD</th>
                <th className="py-2">AVG TAXI</th>
                <th className="py-2">GDP STATUS</th>
                <th className="py-2">CONGESTION INDEX</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {activities.map((a) => (
                <tr
                  key={a.airport}
                  onClick={() => setSelectedHub(a.airport)}
                  className={`cursor-pointer transition-colors ${
                    a.airport === selectedHub
                      ? 'bg-cyan-950/50 text-slate-100'
                      : 'hover:bg-slate-900/40 text-slate-300'
                  }`}
                >
                  <td className="py-2.5 font-bold text-slate-200">{a.airport}</td>
                  <td className="py-2.5 text-slate-400">{a.name}</td>
                  <td className="py-2.5 text-slate-300">{a.hourly_departures}</td>
                  <td className="py-2.5 text-slate-300">{a.hourly_arrivals}</td>
                  <td className="py-2.5 text-slate-300">{Math.round(a.load_factor * 100)}%</td>
                  <td className="py-2.5 text-slate-300">{a.avg_taxi_out_min}m</td>
                  <td className="py-2.5">
                    {a.ground_delay_program ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/40">
                        GDP ACTIVE
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Normal</span>
                    )}
                  </td>
                  <td className="py-2.5 font-bold text-purple-400">
                    {a.derived_congestion_index}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
