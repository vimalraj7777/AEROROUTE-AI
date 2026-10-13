import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Navigation,
  Sliders,
  Zap,
  ShieldCheck,
  Fuel,
  Clock,
  CloudRain,
  Gauge,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api';
import { LeafletMap } from '../components/LeafletMap';
import {
  Airport,
  RouteWeights,
  RouteRecommendationResponse,
} from '../types';

export const RouteOptimizerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [origin, setOrigin] = useState<string>(searchParams.get('origin') || 'JFK');
  const [destination, setDestination] = useState<string>(searchParams.get('dest') || 'SFO');
  const [algorithm, setAlgorithm] = useState<'dijkstra' | 'astar' | 'both'>('both');

  // Weights
  const [weights, setWeights] = useState<RouteWeights>({
    distance: 0.3,
    time: 0.2,
    weather: 0.25,
    congestion: 0.15,
    delayRisk: 0.1,
  });

  const [activePreset, setActivePreset] = useState<string>('balanced');
  const [result, setResult] = useState<RouteRecommendationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAirports() {
      try {
        const apRes = await api.getAirports();
        setAirports(apRes.airports);
      } catch (err: any) {
        setError(err.message);
      }
    }
    loadAirports();
  }, []);

  const handlePresetSelect = (preset: string) => {
    setActivePreset(preset);
    let newWeights: RouteWeights = { distance: 0.3, time: 0.2, weather: 0.25, congestion: 0.15, delayRisk: 0.1 };

    if (preset === 'fuel') {
      newWeights = { distance: 0.55, time: 0.25, weather: 0.1, congestion: 0.05, delayRisk: 0.05 };
    } else if (preset === 'weather') {
      newWeights = { distance: 0.15, time: 0.1, weather: 0.55, congestion: 0.1, delayRisk: 0.1 };
    } else if (preset === 'congestion') {
      newWeights = { distance: 0.2, time: 0.15, weather: 0.15, congestion: 0.4, delayRisk: 0.1 };
    } else if (preset === 'punctuality') {
      newWeights = { distance: 0.15, time: 0.15, weather: 0.2, congestion: 0.1, delayRisk: 0.4 };
    }
    setWeights(newWeights);
    handleOptimize(origin, destination, newWeights, algorithm);
  };

  const handleOptimize = async (
    orig = origin,
    dest = destination,
    w = weights,
    algo = algorithm
  ) => {
    if (orig === dest) {
      setError('Origin and destination cannot be identical.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.optimizeRoute({
        origin: orig,
        destination: dest,
        algorithm: algo,
        weights: w,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Route optimization failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextOrigin = searchParams.get('origin')?.toUpperCase() || 'JFK';
    const nextDestination = searchParams.get('dest')?.toUpperCase() || 'SFO';
    setOrigin(nextOrigin);
    setDestination(nextDestination);
    handleOptimize(nextOrigin, nextDestination, weights, algorithm);
  }, [searchParams]);

  const currentMapWaypoints = airports.map((a) => ({
    iata: a.iata,
    lat: a.latitude,
    lon: a.longitude,
    name: a.name,
    weather_risk: a.weather_risk,
    congestion_index: a.congestion_index,
  }));

  const altRoutesForMap = result?.alternatives.map((alt, idx) => ({
    name: alt.algorithm,
    path: alt.path,
    color: idx === 0 ? '#f59e0b' : '#a855f7',
  })) || [];

  return (
    <div className="p-5 sm:p-8 lg:p-10 space-y-7 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
              MULTI-OBJECTIVE FLIGHT CORRIDOR OPTIMIZER
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
              DIJKSTRA / A* ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Dynamic graph search balancing Great-Circle distance, time, weather risk, terminal congestion, and historical delay risk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOptimize()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-mono text-xs font-semibold tracking-wider transition-colors cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>RUN OPTIMIZATION</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800/60 p-3 rounded text-xs font-mono text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Control Panel: Hubs, Objective Presets, Weights, Algorithm */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Origin/Destination & Preset Selection */}
        <div className="bg-[#0c121d] border border-slate-800 rounded p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Navigation className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              Flight Parameters
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">ORIGIN</label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {airports.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.iata} ({a.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">DESTINATION</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {airports.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.iata} ({a.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Swap Hubs */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                const temp = origin;
                setOrigin(destination);
                setDestination(temp);
              }}
              className="text-[11px] font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Swap City-Pair</span>
            </button>
          </div>

          {/* Optimization Objective Presets */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
              OBJECTIVE POLICY
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'balanced', label: 'Balanced OPS' },
                { id: 'fuel', label: 'Min Fuel/Distance' },
                { id: 'weather', label: 'Avoid Weather' },
                { id: 'congestion', label: 'Low Congestion' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id)}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-mono transition-colors text-left ${
                    activePreset === p.id
                      ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Algorithm Selector */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
              ALGORITHM SELECTION
            </label>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
              {(['dijkstra', 'astar', 'both'] as const).map((algo) => (
                <button
                  key={algo}
                  onClick={() => setAlgorithm(algo)}
                  className={`py-1.5 px-2 rounded text-center text-[11px] transition-colors ${
                    algorithm === algo
                      ? 'bg-cyan-600 text-slate-950 font-bold'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {algo === 'both' ? 'Benchmark Both' : algo.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Interactive Weight Sliders */}
        <div className="lg:col-span-2 bg-[#0c121d] border border-slate-800 rounded p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
                Multi-Objective Cost Weights
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              Normalized Edge Cost Model
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Weight 1 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-cyan-400" /> Distance / Fuel
                </span>
                <span className="text-cyan-400 font-bold">{Math.round(weights.distance * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.distance}
                onChange={(e) => {
                  setWeights({ ...weights, distance: parseFloat(e.target.value) });
                  setActivePreset('custom');
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Weight 2 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" /> Flight Time Proxy
                </span>
                <span className="text-sky-400 font-bold">{Math.round(weights.time * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.time}
                onChange={(e) => {
                  setWeights({ ...weights, time: parseFloat(e.target.value) });
                  setActivePreset('custom');
                }}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            {/* Weight 3 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-amber-400" /> Weather METAR Risk
                </span>
                <span className="text-amber-400 font-bold">{Math.round(weights.weather * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.weather}
                onChange={(e) => {
                  setWeights({ ...weights, weather: parseFloat(e.target.value) });
                  setActivePreset('custom');
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Weight 4 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-purple-400" /> Airspace Congestion
                </span>
                <span className="text-purple-400 font-bold">{Math.round(weights.congestion * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.congestion}
                onChange={(e) => {
                  setWeights({ ...weights, congestion: parseFloat(e.target.value) });
                  setActivePreset('custom');
                }}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            {/* Weight 5 */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Historical Delay Risk
                </span>
                <span className="text-emerald-400 font-bold">{Math.round(weights.delayRisk * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.delayRisk}
                onChange={(e) => {
                  setWeights({ ...weights, delayRisk: parseFloat(e.target.value) });
                  setActivePreset('custom');
                }}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Visualization */}
      <div className="bg-[#0c121d] border border-slate-800 rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-sm font-bold font-mono text-slate-200">
              OPTIMIZED AIRSPACE TRAJECTORY: {origin} &rarr; {destination}
            </h2>
          </div>
          {result && (
            <div className="text-xs font-mono text-slate-400 flex items-center gap-3">
              <span>Waypoints: {result.recommended.path.join(' &rarr; ')}</span>
              <span>Total Distance: {result.recommended.metrics.totalDistanceNm} NM</span>
            </div>
          )}
        </div>

        <LeafletMap
          waypoints={currentMapWaypoints}
          activeRoute={result ? result.recommended.path : [origin, destination]}
          alternativeRoutes={altRoutesForMap}
          height="400px"
        />
      </div>

      {/* Results Section */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recommended Route Card */}
          <div className="lg:col-span-2 bg-[#0c121d] border border-cyan-500/30 rounded p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold font-mono text-slate-100">
                    RECOMMENDED PRIMARY CORRIDOR
                  </h3>
                  <p className="text-[11px] font-mono text-cyan-400">
                    Solved via {result.recommended.algorithm} Search (Total Score: {result.recommended.totalScore})
                  </p>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs text-slate-400">Path:</span>
                <div className="text-sm font-bold text-slate-100">
                  {result.recommended.path.join(' → ')}
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded font-mono">
                <div className="text-[10px] text-slate-400">DISTANCE</div>
                <div className="text-lg font-bold text-slate-100">
                  {result.recommended.metrics.totalDistanceNm}{' '}
                  <span className="text-xs font-normal text-slate-500">NM</span>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded font-mono">
                <div className="text-[10px] text-slate-400">TIME PROXY</div>
                <div className="text-lg font-bold text-slate-100">
                  {result.recommended.metrics.estimatedTimeMin}{' '}
                  <span className="text-xs font-normal text-slate-500">MIN</span>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded font-mono">
                <div className="text-[10px] text-slate-400">FUEL PROXY</div>
                <div className="text-lg font-bold text-slate-100">
                  {result.recommended.metrics.fuelProxyGal}{' '}
                  <span className="text-xs font-normal text-slate-500">GAL</span>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded font-mono">
                <div className="text-[10px] text-slate-400">WEATHER RISK</div>
                <div className="text-lg font-bold text-amber-400">
                  {result.recommended.metrics.weatherRiskScore} / 100
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded font-mono">
                <div className="text-[10px] text-slate-400">CONGESTION LOAD</div>
                <div className="text-lg font-bold text-purple-400">
                  {result.recommended.metrics.congestionRiskScore}%
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded font-mono">
                <div className="text-[10px] text-slate-400">DELAY RISK</div>
                <div className="text-lg font-bold text-emerald-400">
                  {result.recommended.metrics.delayRiskScore}%
                </div>
              </div>
            </div>

            {/* Why this route? Human Explainability Panel */}
            <div className="bg-cyan-950/20 border border-cyan-800/40 p-3.5 rounded font-mono text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <HelpCircle className="w-4 h-4" />
                <span>EXPLAINABLE DECISION FACTORS</span>
              </div>
              <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside">
                {result.recommended.explanation.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Alternative Corridors */}
            {result.alternatives.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-mono font-bold text-slate-300">
                  EVALUATED ALTERNATIVE CORRIDORS
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.alternatives.map((alt, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/50 border border-slate-800 p-2.5 rounded font-mono text-xs space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200">{alt.algorithm}</span>
                        <span className="text-[10px] text-slate-400">{alt.totalScore} pts</span>
                      </div>
                      <div className="text-[11px] text-cyan-400">{alt.path.join(' → ')}</div>
                      <div className="text-[10px] text-slate-400">
                        {alt.metrics.totalDistanceNm} NM · WX: {alt.metrics.weatherRiskScore}/100 · Cong: {alt.metrics.congestionRiskScore}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Algorithm Performance Benchmark */}
          <div className="bg-[#0c121d] border border-slate-800 rounded p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">
                ALGORITHM BENCHMARK
              </h3>
            </div>

            <p className="text-xs font-mono text-slate-400 leading-relaxed">
              Comparison between uninformed graph search (Dijkstra) and heuristic-guided search (A* with admissible Haversine).
            </p>

            {result.benchmark && (
              <div className="space-y-3 font-mono text-xs">
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded space-y-2">
                  <div className="text-[11px] font-bold text-slate-300">SEARCH SPACE EXPLORATION</div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Dijkstra Explored:</span>
                    <span className="text-slate-200 font-bold">{result.benchmark.dijkstraExplored} nodes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">A* Explored:</span>
                    <span className="text-cyan-400 font-bold">{result.benchmark.astarExplored} nodes</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Search Space Gain:</span>
                    <span className="text-emerald-400 font-bold">
                      +{result.benchmark.efficiencyGainPct}%
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded space-y-2">
                  <div className="text-[11px] font-bold text-slate-300">EXECUTION LATENCY</div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Dijkstra Time:</span>
                    <span className="text-slate-200">{result.benchmark.dijkstraTimeMs} ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">A* Time:</span>
                    <span className="text-cyan-400">{result.benchmark.astarTimeMs} ms</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-850 rounded text-[11px] text-slate-500 space-y-1">
                  <div className="font-bold text-slate-400">HEURISTIC ADMISSIBILITY</div>
                  <p>
                    h(n) = GreatCircle(n, Dest) &times; min(Cost/NM). Since h(n) &le; h*(n) for all nodes, A* is mathematically guaranteed to find an identical optimal path.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
