import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Plane,
  ArrowRight,
  Navigation,
  CloudRain,
  Gauge,
  BarChart3,
  Cpu,
  Network,
  Server,
  ShieldCheck,
  Zap,
  Sparkles,
  MapPin,
  TrendingUp,
  CheckCircle2,
  Database,
  GitBranch,
  Layers,
} from 'lucide-react';
import { Reveal } from '../../components/public/Reveal';

/* ------------------------------------------------------------------ */
/* Hero visual: animated airspace graph                                */
/* ------------------------------------------------------------------ */
const nodes: { id: string; x: number; y: number; major?: boolean }[] = [
  { id: 'SEA', x: 90, y: 70 },
  { id: 'SFO', x: 60, y: 205 },
  { id: 'LAX', x: 100, y: 262 },
  { id: 'DEN', x: 250, y: 172, major: true },
  { id: 'PHX', x: 152, y: 262 },
  { id: 'DFW', x: 300, y: 282, major: true },
  { id: 'ORD', x: 360, y: 138, major: true },
  { id: 'ATL', x: 432, y: 272, major: true },
  { id: 'JFK', x: 522, y: 150, major: true },
  { id: 'MIA', x: 500, y: 342 },
  { id: 'BOS', x: 548, y: 118 },
];

const corridors: [string, string][] = [
  ['SEA', 'DEN'],
  ['SEA', 'ORD'],
  ['SFO', 'DEN'],
  ['SFO', 'LAX'],
  ['LAX', 'DFW'],
  ['LAX', 'PHX'],
  ['PHX', 'DFW'],
  ['DEN', 'ORD'],
  ['DEN', 'DFW'],
  ['DFW', 'ATL'],
  ['DFW', 'MIA'],
  ['ORD', 'JFK'],
  ['ORD', 'ATL'],
  ['ATL', 'JFK'],
  ['ATL', 'MIA'],
  ['JFK', 'BOS'],
];

const nodeById = (id: string) => nodes.find((n) => n.id === id)!;
const mainRoute = ['JFK', 'ORD', 'DEN', 'SFO'];

const HeroGraphic: React.FC = () => {
  const routeD = mainRoute
    .map((id, i) => {
      const n = nodeById(id);
      return `${i === 0 ? 'M' : 'L'} ${n.x} ${n.y}`;
    })
    .join(' ');

  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-cyan-500/10 via-indigo-500/10 to-violet-500/10 blur-2xl" />
      <div className="relative rounded-2xl border border-white/10 bg-[#0a0f1acc] glass p-4 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between px-2 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="font-mono text-[10px] tracking-wider text-slate-400">
            ROUTE OPTIMIZER · JFK → SFO
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> A* SOLVED
          </span>
        </div>

        <svg viewBox="0 0 600 380" className="w-full h-auto">
          <defs>
            <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="60%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {corridors.map(([a, b], i) => {
            const na = nodeById(a);
            const nb = nodeById(b);
            return (
              <line
                key={i}
                x1={na.x}
                y1={na.y}
                x2={nb.x}
                y2={nb.y}
                stroke="#334155"
                strokeWidth={1}
                strokeOpacity={0.55}
              />
            );
          })}

          <path id="mainRoute" d={routeD} fill="none" stroke="#0e7490" strokeWidth={6} strokeOpacity={0.25} filter="url(#glow)" />
          <path
            d={routeD}
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth={3}
            strokeLinecap="round"
            className="route-draw"
          />
          <path d={routeD} fill="none" stroke="#a5f3fc" strokeWidth={2} className="route-flow" />

          {nodes.map((n) => (
            <g key={n.id}>
              {n.major && (
                <circle cx={n.x} cy={n.y} r={11} fill="none" stroke="#22d3ee" strokeOpacity={0.35} strokeWidth={1.5} />
              )}
              <circle
                cx={n.x}
                cy={n.y}
                r={n.major ? 5.5 : 4}
                fill={mainRoute.includes(n.id) ? '#0891b2' : '#0f172a'}
                stroke={mainRoute.includes(n.id) ? '#67e8f9' : '#38bdf8'}
                strokeWidth={1.6}
              />
              <text x={n.x + 9} y={n.y + 4} fill="#94a3b8" fontSize="11" fontFamily="ui-monospace, monospace">
                {n.id}
              </text>
            </g>
          ))}

          <circle r="5" fill="#e0f2fe" filter="url(#glow)">
            <animateMotion dur="6.5s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
              <mpath href="#mainRoute" />
            </animateMotion>
          </circle>
        </svg>

        <div className="grid grid-cols-3 gap-3 px-2 pt-3 border-t border-white/5">
          {[
            { k: 'Distance', v: '2,586 NM' },
            { k: 'Weather Risk', v: '18/100' },
            { k: 'Explored', v: '9 nodes' },
          ].map((m) => (
            <div key={m.k} className="rounded-lg bg-white/[0.03] border border-white/5 p-2.5">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{m.k}</div>
              <div className="text-sm font-semibold text-slate-100 font-mono">{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="absolute -left-6 top-24 hidden lg:flex items-center gap-2 rounded-xl glass border border-white/10 px-3 py-2 shadow-xl animate-float"
      >
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-mono text-slate-300">Delay risk −32%</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.6 }}
        className="absolute -right-4 bottom-16 hidden lg:flex items-center gap-2 rounded-xl glass border border-white/10 px-3 py-2 shadow-xl animate-float-slow"
      >
        <Zap className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-mono text-slate-300">A* −41% search space</span>
      </motion.div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Feature data                                                        */
/* ------------------------------------------------------------------ */
const features = [
  {
    icon: Navigation,
    title: 'Multi-Objective Route Optimizer',
    desc: 'Balance distance, time, weather, congestion and historical delay risk with live weight sliders and explainable decision factors.',
    accent: 'cyan',
    to: '/app/routes',
  },
  {
    icon: GitBranch,
    title: 'Dijkstra & A* Engines',
    desc: 'Custom graph search on a 21-node / 60-corridor airspace graph, with an admissible Haversine heuristic and node-exploration benchmarking.',
    accent: 'sky',
    to: '/app/routes',
  },
  {
    icon: Plane,
    title: 'Flight Intelligence',
    desc: 'Search bundled flight records and inspect delay attribution decomposed into weather, NAS, carrier and late-aircraft causes.',
    accent: 'indigo',
    to: '/app/flights',
  },
  {
    icon: CloudRain,
    title: 'Weather Intelligence',
    desc: 'Stored METAR observations translated into winds, visibility, ceiling and phenomena risk factors for route comparison.',
    accent: 'amber',
    to: '/app/weather',
  },
  {
    icon: Gauge,
    title: 'Airport Congestion',
    desc: 'Derived runway load factors, throughput density, taxi-out proxies and Ground Delay Program flags across monitored hubs.',
    accent: 'violet',
    to: '/app/congestion',
  },
  {
    icon: Network,
    title: 'Network Topology',
    desc: 'Interactive Leaflet graph of airports and directed corridors with clickable hub telemetry and regional airspace filters.',
    accent: 'emerald',
    to: '/app/network',
  },
  {
    icon: Cpu,
    title: 'Model Metrics & Simulator',
    desc: 'Bundled evaluation artifacts, confusion matrix and feature importance, plus an interactive delay-risk scoring simulator.',
    accent: 'cyan',
    to: '/app/model',
  },
  {
    icon: BarChart3,
    title: 'Operations Analytics',
    desc: 'Delay-severity distributions, carrier on-time benchmarks and one-click CSV export for reporting and review.',
    accent: 'sky',
    to: '/app/analytics',
  },
];

const accentMap: Record<string, string> = {
  cyan: 'text-cyan-300 bg-cyan-500/10 border-cyan-400/20',
  sky: 'text-sky-300 bg-sky-500/10 border-sky-400/20',
  indigo: 'text-indigo-300 bg-indigo-500/10 border-indigo-400/20',
  amber: 'text-amber-300 bg-amber-500/10 border-amber-400/20',
  violet: 'text-violet-300 bg-violet-500/10 border-violet-400/20',
  emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20',
};

const pipeline = [
  { icon: Database, label: 'Ingestion', note: 'BTS · NOAA · FAA snapshots' },
  { icon: Layers, label: 'Feature Engineering', note: 'Derived risk proxies' },
  { icon: Network, label: 'Airspace Graph', note: '21 nodes · 60 corridors' },
  { icon: GitBranch, label: 'Dijkstra & A*', note: 'Multi-objective cost' },
  { icon: Cpu, label: 'Delay Scoring', note: 'Deterministic softmax' },
  { icon: Server, label: 'REST API', note: 'Express + TypeScript' },
];

const steps = [
  {
    n: '01',
    title: 'Pick a city pair',
    desc: 'Choose origin and destination hubs from the bundled national airspace network.',
  },
  {
    n: '02',
    title: 'Set your objective',
    desc: 'Slide the weights or pick a preset: fuel, weather avoidance, congestion or punctuality.',
  },
  {
    n: '03',
    title: 'Compare corridors',
    desc: 'Review the recommended corridor, alternatives and the explainable decision factors.',
  },
  {
    n: '04',
    title: 'Benchmark the search',
    desc: 'See Dijkstra vs A* explored nodes, latency and the resulting efficiency gain.',
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export const LandingPage: React.FC = () => {
  return (
    <div className="overflow-hidden">
      {/* ============================ HERO ============================ */}
      <section className="relative">
        <div className="absolute inset-0 aurora" />
        <div className="absolute inset-0 grid-overlay" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/5 px-3.5 py-1.5 text-xs font-medium text-cyan-300"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Aviation Operations & Route Intelligence
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.05 }}
                className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight"
              >
                Plan smarter corridors with
                <span className="text-gradient"> explainable route intelligence</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.15 }}
                className="mt-6 text-base sm:text-lg text-slate-400 leading-relaxed max-w-xl"
              >
                AeroRoute AI models the national airspace as a weighted graph and optimizes flight
                corridors with custom <span className="text-slate-200">Dijkstra</span> and{' '}
                <span className="text-slate-200">A*</span> search — balancing weather, congestion and
                historical delay risk into a single transparent decision.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.25 }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Link
                  to="/app/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:scale-[1.02] shadow-lg shadow-cyan-500/25"
                >
                  Launch Console
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/features"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] px-6 py-3 text-sm font-semibold text-slate-200 transition-colors"
                >
                  Explore Features
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4"
              >
                {[
                  { v: '21', l: 'Airspace nodes' },
                  { v: '60', l: 'Directed corridors' },
                  { v: '84.2%', l: 'Reported accuracy' },
                  { v: '2', l: 'Search engines' },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="text-2xl font-bold font-mono text-slate-100">{s.v}</div>
                    <div className="text-xs text-slate-500">{s.l}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <HeroGraphic />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ======================= TECH MARQUEE ========================= */}
      <section className="border-y border-white/5 bg-white/[0.015] py-6 overflow-hidden">
        <div className="flex w-max animate-marquee gap-14 px-6">
          {[...Array(2)].map((_, dup) => (
            <div key={dup} className="flex items-center gap-14">
              {['React 19', 'TypeScript', 'Vite', 'Tailwind CSS', 'Leaflet', 'Recharts', 'Express', 'Dijkstra / A*'].map(
                (t) => (
                  <span
                    key={t + dup}
                    className="text-sm font-mono tracking-wide text-slate-500 whitespace-nowrap"
                  >
                    {t}
                  </span>
                )
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ========================= FEATURES ========================== */}
      <section className="relative mx-auto max-w-7xl px-5 sm:px-8 py-20 lg:py-28">
        <Reveal className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            <Zap className="w-3.5 h-3.5" /> Capabilities
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
            Everything you need to reason about routes
          </h2>
          <p className="mt-4 text-slate-400 leading-relaxed">
            Eight integrated modules turn bundled snapshots into transparent, comparable operational
            decisions.
          </p>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={i * 0.05}>
                <Link
                  to={f.to}
                  className="group relative block h-full rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] p-6 transition-all hover:-translate-y-1 hover:border-cyan-400/30"
                >
                  <div
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center ${accentMap[f.accent]}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="mt-5 font-semibold text-slate-100">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open module <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ======================= ARCHITECTURE ======================== */}
      <section className="relative border-y border-white/5 bg-white/[0.015] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">
              <GitBranch className="w-3.5 h-3.5" /> Architecture
            </div>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
              From raw snapshots to an explainable recommendation
            </h2>
            <p className="mt-4 text-slate-400 leading-relaxed">
              A transparent pipeline you can inspect end to end — every stage maps to a bundled module
              and a REST endpoint.
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {pipeline.map((p, i) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.label} delay={i * 0.08} direction="up">
                  <div className="relative h-full rounded-2xl border border-white/8 bg-[#0a0f1a]/60 p-5 text-center">
                    <div className="mx-auto w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center text-cyan-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="mt-4 text-sm font-semibold text-slate-100">{p.label}</div>
                    <div className="mt-1 text-[11px] font-mono text-slate-500">{p.note}</div>
                    {i < pipeline.length - 1 && (
                      <ArrowRight className="hidden lg:block absolute top-1/2 -right-4 w-4 h-4 text-slate-600 -translate-y-1/2" />
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================= WORKFLOW ========================== */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <Reveal direction="right">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" /> Workflow
            </div>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
              Four steps from question to corridor
            </h2>
            <p className="mt-4 text-slate-400 leading-relaxed max-w-md">
              The console is built to feel light and direct — no clutter, no dead ends. Move from a
              city pair to a fully explained recommendation in seconds.
            </p>
            <Link
              to="/app/routes"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-5 py-3 text-sm font-semibold text-slate-100 transition-colors"
            >
              Try the optimizer <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>

          <div className="space-y-4">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08} direction="left">
                <div className="flex gap-5 rounded-2xl border border-white/8 bg-white/[0.02] p-5 hover:border-cyan-400/25 transition-colors">
                  <div className="text-2xl font-bold font-mono text-cyan-400/70 shrink-0">{s.n}</div>
                  <div>
                    <div className="font-semibold text-slate-100">{s.title}</div>
                    <div className="mt-1 text-sm text-slate-400 leading-relaxed">{s.desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== SAFETY / DISCLAIMER =================== */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.07] to-transparent p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/25 flex items-center justify-center text-amber-300 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">Academic decision-support prototype</h3>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-3xl">
                  AeroRoute AI is <strong className="text-slate-200">not certified aviation software</strong>.
                  It holds no ATC authority, flight-dispatch clearance or avionics guarantees. All paths,
                  risk indices and predictions are research and educational estimates built on bundled
                  local snapshots — not live provider feeds.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ========================== CTA ============================== */}
      <section className="relative mx-auto max-w-7xl px-5 sm:px-8 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/[0.12] via-indigo-500/[0.08] to-violet-500/[0.12] p-10 sm:p-14 text-center">
            <div className="absolute inset-0 grid-overlay opacity-60" />
            <div className="relative">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/25 flex items-center justify-center text-cyan-300 animate-pulse-ring">
                <Plane className="w-6 h-6 -rotate-45" />
              </div>
              <h2 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight">
                Ready to optimize your first corridor?
              </h2>
              <p className="mt-4 text-slate-400 max-w-xl mx-auto">
                Open the operations console and run a multi-objective route in under a minute.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  to="/app/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:scale-[1.02] shadow-lg shadow-cyan-500/25"
                >
                  Launch Console <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/docs"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] px-6 py-3 text-sm font-semibold text-slate-200 transition-colors"
                >
                  Read the Docs
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 font-mono">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> 21 hub nodes
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5" /> Dijkstra & A*
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Deterministic scoring
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
};
