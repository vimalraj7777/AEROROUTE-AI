import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { Download, BarChart3, TrendingUp, Filter, Calendar } from 'lucide-react';
import { api } from '../api';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await api.getAnalyticsSummary();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const handleExportCsv = () => {
    if (!data) return;
    let csv = 'Carrier,Total_Flights,On_Time_Percent,Avg_Delay_Min\n';
    data.carrier_performance.forEach((c: any) => {
      csv += `${c.carrier},${c.total},${c.onTimePct}%,${c.avgDelayMin}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aeroroute_carrier_analytics.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onTimeLeader = data?.carrier_performance.reduce(
    (leader: any, carrier: any) => !leader || carrier.onTimePct > leader.onTimePct ? carrier : leader,
    null
  );

  if (loading || !data) {
    return <div className="p-8 text-cyan-400 font-mono text-xs">LOADING ANALYTICS AGGREGATES...</div>;
  }

  return (
    <div className="p-5 sm:p-8 lg:p-10 space-y-7 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
              AVIATION OPERATIONS ANALYTICS & TRENDS
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
              TRANSTATS & NAS METRICS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Empirical statistical distributions of delay severity, carrier punctuality, and terminal throughput.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>EXPORT CSV</span>
        </button>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-[#0c121d] border border-slate-800 p-4 rounded">
          <div className="text-xs text-slate-500">AGGREGATE FLIGHT CORPUS</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {data.total_flights_analyzed} <span className="text-xs font-normal text-slate-500">Tracked Operations</span>
          </div>
        </div>

        <div className="bg-[#0c121d] border border-slate-800 p-4 rounded">
          <div className="text-xs text-slate-500">CARRIER ON-TIME LEADER (IN DATA)</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {onTimeLeader?.carrier ?? '--'}{' '}
            <span className="text-xs font-normal text-slate-500">
              ({onTimeLeader?.onTimePct ?? 0}% · {onTimeLeader?.total ?? 0} flights)
            </span>
          </div>
        </div>

        <div className="bg-[#0c121d] border border-slate-800 p-4 rounded">
          <div className="text-xs text-slate-500">MONITORED NAS HUBS</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            {data.airports_monitored} <span className="text-xs font-normal text-slate-500">Class B/C Hubs</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Delay Severity Distribution */}
        <div className="bg-[#0c121d] border border-slate-800 rounded p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              Delay Severity Category Distribution
            </h2>
            <span className="text-[10px] font-mono text-slate-500">5-Tier Scheme</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.delay_buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#070a0f', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.delay_buckets.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Carrier On-Time Performance */}
        <div className="bg-[#0c121d] border border-slate-800 rounded p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              Major Carrier On-Time Performance (%)
            </h2>
            <span className="text-[10px] font-mono text-slate-500">Historical Benchmarks</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.carrier_performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="carrier" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#070a0f', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="onTimePct" name="On-Time %" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabular Carrier Benchmark */}
      <div className="bg-[#0c121d] border border-slate-800 rounded p-4 space-y-3">
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
          Carrier Reliability Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="py-2">CARRIER</th>
                <th className="py-2">SAMPLED FLIGHTS</th>
                <th className="py-2">ON-TIME PERFORMANCE</th>
                <th className="py-2">AVG DELAY (MINUTES)</th>
                <th className="py-2">NETWORK STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {data.carrier_performance.map((c: any) => (
                <tr key={c.carrier} className="hover:bg-slate-900/40 text-slate-300">
                  <td className="py-2.5 font-bold text-cyan-400">{c.carrier}</td>
                  <td className="py-2.5 text-slate-400">{c.total}</td>
                  <td className="py-2.5 font-bold text-emerald-400">{c.onTimePct}%</td>
                  <td className="py-2.5 text-slate-200">{c.avgDelayMin}m</td>
                  <td className="py-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                      Standard Ops
                    </span>
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
