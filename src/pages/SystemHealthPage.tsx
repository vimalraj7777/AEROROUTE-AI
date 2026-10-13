import React, { useState, useEffect } from 'react';
import {
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  ShieldAlert,
  Clock,
  Database,
  Cpu,
  Network,
  CloudRain,
} from 'lucide-react';
import { api } from '../api';
import { SystemHealthData, LogEntry } from '../types';

export const SystemHealthPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchHealthAndLogs = async () => {
    try {
      const [hRes, lRes] = await Promise.all([
        api.getSystemHealth(),
        api.getSystemLogs(50, logFilter !== 'ALL' ? logFilter : undefined),
      ]);
      setHealth(hRes);
      setLogs(lRes.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndLogs();
    const interval = setInterval(fetchHealthAndLogs, 15000);
    return () => clearInterval(interval);
  }, [logFilter]);

  if (loading || !health) {
    return <div className="p-8 text-cyan-400 font-mono text-xs">QUERYING SUBSYSTEM HEALTH...</div>;
  }

  return (
    <div className="p-5 sm:p-8 lg:p-10 space-y-7 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
              SYSTEM HEALTH & OBSERVABILITY
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
              {health.system_status}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Backend status and the bundled datasets and engines currently loaded by this demo.
          </p>
        </div>

        <button
          onClick={fetchHealthAndLogs}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>POLL STATUS</span>
        </button>
      </div>

      {/* Subsystem Health Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
        {/* Backend API */}
        <div className="bg-[#0c121d] border border-slate-800 p-4 rounded space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="flex items-center gap-1.5">
              <Server className="w-4 h-4 text-cyan-400" /> Express REST Engine
            </span>
            <span className="text-emerald-400 font-bold">{health.subsystems.backend_api?.status}</span>
          </div>
          <div className="text-lg font-bold text-slate-100">Port 3000</div>
          <div className="text-[11px] text-slate-500">
            Latency: {health.subsystems.backend_api?.latency_ms || 1.2} ms · Uptime: {health.uptime_seconds}s
          </div>
        </div>

        {/* Database */}
        <div className="bg-[#0c121d] border border-slate-800 p-4 rounded space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-sky-400" /> Data Storage & Cache
            </span>
            <span className="text-emerald-400 font-bold">{health.subsystems.local_dataset_store?.status}</span>
          </div>
          <div className="text-lg font-bold text-slate-100">Local JSON Snapshots</div>
          <div className="text-[11px] text-slate-500">Loaded into memory at server startup</div>
        </div>

        {/* BTS Dataset */}
        <div className="bg-[#0c121d] border border-slate-800 p-4 rounded space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-400" /> BTS On-Time Dataset
            </span>
            <span className="text-emerald-400 font-bold">{health.subsystems.bts_flight_dataset?.status}</span>
          </div>
          <div className="text-lg font-bold text-slate-100">
            {Number(health.subsystems.bts_flight_dataset?.records ?? 0).toLocaleString()} Flights
          </div>
          <div className="text-[11px] text-slate-500">
            {health.subsystems.bts_flight_dataset?.sampled
              ? `${Number(health.subsystems.bts_flight_dataset?.sample_records ?? 0).toLocaleString()} sample rows · ${health.subsystems.bts_flight_dataset?.source}`
              : 'Bundled historical sample records'}
          </div>
        </div>

        {/* METAR Feed */}
        <div className="bg-[#0c121d] border border-slate-800 p-4 rounded space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="flex items-center gap-1.5">
              <CloudRain className="w-4 h-4 text-amber-400" /> METAR Weather Service
            </span>
            <span className="text-emerald-400 font-bold">{health.subsystems.metar_snapshot?.status}</span>
          </div>
          <div className="text-lg font-bold text-slate-100">
            {health.subsystems.metar_snapshot?.stations} Stations Loaded
          </div>
          <div className="text-[11px] text-slate-500">Stored observations; no live provider connection</div>
        </div>

        {/* ML Inference */}
        <div className="bg-[#0c121d] border border-slate-800 p-4 rounded space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" /> Delay Scoring Engine
            </span>
            <span className="text-emerald-400 font-bold">{health.subsystems.delay_scoring_engine?.status}</span>
          </div>
          <div className="text-lg font-bold text-slate-100">
            Model {health.subsystems.ml_inference_engine?.model_version || 'v1.4.0'}
          </div>
          <div className="text-[11px] text-slate-500">Deterministic weighted-score demonstration</div>
        </div>

        {/* Routing Graph */}
        <div className="bg-[#0c121d] border border-slate-800 p-4 rounded space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="flex items-center gap-1.5">
              <Network className="w-4 h-4 text-emerald-400" /> Graph Routing Core
            </span>
            <span className="text-emerald-400 font-bold">{health.subsystems.graph_routing_engine?.status}</span>
          </div>
          <div className="text-lg font-bold text-slate-100">
            {health.subsystems.graph_routing_engine?.nodes} Nodes / {health.subsystems.graph_routing_engine?.edges} Edges
          </div>
          <div className="text-[11px] text-slate-500">Dijkstra & A* search engines active</div>
        </div>
      </div>

      {/* Structured System Activity Logs */}
      <div className="bg-[#0c121d] border border-slate-800 rounded p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              Structured Operations Log Stream
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">FILTER LEVEL:</span>
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
            >
              <option value="ALL">ALL LEVELS</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-950/90 rounded border border-slate-850 p-3 h-72 overflow-y-auto font-mono text-xs space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
              <span className="text-slate-600 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span
                className={`px-1 rounded text-[10px] font-bold shrink-0 ${
                  log.level === 'INFO'
                    ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/40'
                    : log.level === 'WARN'
                    ? 'bg-amber-950/80 text-amber-400 border border-amber-800/40'
                    : 'bg-rose-950/80 text-rose-400 border border-rose-800/40'
                }`}
              >
                {log.level}
              </span>
              <span className="text-slate-500 shrink-0">[{log.subsystem}]</span>
              <span className="text-slate-300">{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Academic Safety Boundary Card */}
      <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded font-mono text-xs text-amber-300 space-y-2">
        <div className="flex items-center gap-2 font-bold">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>ACADEMIC SAFETY & CERTIFICATION NOTICE</span>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-200/80">
          AeroRoute AI is an academic decision-support prototype. It does not provide certified air-traffic-control authorization, tactical safety clearance, or autonomous flight guidance. All route recommendations and delay forecasts are intended solely for academic demonstration and research benchmarking.
        </p>
      </div>
    </div>
  );
};
