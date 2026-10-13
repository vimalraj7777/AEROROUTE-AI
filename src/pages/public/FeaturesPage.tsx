import React from 'react';
import { Link } from 'react-router-dom';
import {
  Navigation,
  GitBranch,
  Plane,
  CloudRain,
  Gauge,
  Network,
  Cpu,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { Reveal } from '../../components/public/Reveal';

const modules = [
  {
    icon: Navigation,
    tag: 'Optimization',
    title: 'Multi-Objective Route Optimizer',
    desc: 'Combine five normalized cost components into one transparent score. Adjust weight presets or fine-tune each slider, then compare the recommended corridor against evaluated alternatives.',
    points: [
      'Presets: Balanced, Min Fuel, Avoid Weather, Low Congestion',
      'Nine route metrics incl. fuel proxy and delay risk',
      'Explainable decision factors per recommendation',
    ],
    to: '/app/routes',
    accent: 'cyan',
  },
  {
    icon: GitBranch,
    tag: 'Algorithms',
    title: 'Dijkstra & A* Search Engines',
    desc: 'Custom pathfinding over a weighted directed graph, with an admissible Haversine great-circle heuristic and a side-by-side benchmark of explored nodes and execution latency.',
    points: [
      'Exhaustive optimal-cost Dijkstra baseline',
      'Heuristic-guided A* with identical optimal paths',
      'Node-exploration efficiency gain reporting',
    ],
    to: '/app/routes',
    accent: 'sky',
  },
  {
    icon: Plane,
    tag: 'Flight Ops',
    title: 'Flight Operations Intelligence',
    desc: 'Search and filter bundled historical flight records, then open a detail drawer that decomposes delay into weather, NAS, carrier and late-aircraft causes with stored weather context.',
    points: [
      'Carrier, origin, destination and status filters',
      'Delay attribution decomposition',
      'Origin and destination METAR context',
    ],
    to: '/app/flights',
    accent: 'indigo',
  },
  {
    icon: CloudRain,
    tag: 'Environment',
    title: 'Aviation Weather Intelligence',
    desc: 'Stored METAR observations transformed into derived risk scores, broken into surface winds, visibility, cloud ceiling and weather phenomena penalties.',
    points: [
      'Flight-category classification (VFR/MVFR/IFR/LIFR)',
      'Four-component risk breakdown',
      'All-stations comparison table',
    ],
    to: '/app/weather',
    accent: 'amber',
  },
  {
    icon: Gauge,
    tag: 'Throughput',
    title: 'Airport Congestion & Throughput',
    desc: 'A derived congestion index built from scheduled movements, runway acceptance capacity, queue imbalance and taxi-out proxies — with Ground Delay Program flags.',
    points: [
      'Runway capacity load visualizer',
      'Ranked congestion leaderboard',
      'Transparent methodology disclosure',
    ],
    to: '/app/congestion',
    accent: 'violet',
  },
  {
    icon: Network,
    tag: 'Topology',
    title: 'National Airspace Network Map',
    desc: 'An interactive Leaflet graph of airport nodes and directed corridors, with clickable hub telemetry, regional filters and quick launch into route planning.',
    points: [
      '21 nodes · 60 directed corridors',
      'Click-to-inspect hub detail panel',
      'East / Midwest / South / West filters',
    ],
    to: '/app/network',
    accent: 'emerald',
  },
  {
    icon: Cpu,
    tag: 'Model',
    title: 'Model Metrics & Scoring Simulator',
    desc: 'Review bundled evaluation artifacts — accuracy, macro F1, confusion matrix, feature importance — then run an interactive delay-risk scoring simulator with class probabilities.',
    points: [
      'Reported metrics and baseline comparison',
      'Live deterministic scoring simulator',
      'Feature attribution by impact direction',
    ],
    to: '/app/model',
    accent: 'cyan',
  },
  {
    icon: BarChart3,
    tag: 'Reporting',
    title: 'Operations Analytics & Trends',
    desc: 'Empirical distributions of delay severity and carrier punctuality rendered with Recharts, plus a reliability matrix and one-click CSV export.',
    points: [
      'Delay-severity distribution chart',
      'Carrier on-time benchmarks',
      'CSV export of carrier analytics',
    ],
    to: '/app/analytics',
    accent: 'sky',
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

export const FeaturesPage: React.FC = () => {
  return (
    <div>
      <section className="relative border-b border-white/5">
        <div className="absolute inset-0 aurora opacity-70" />
        <div className="absolute inset-0 grid-overlay" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-20 lg:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/5 px-3.5 py-1.5 text-xs font-medium text-cyan-300">
            <Layers className="w-3.5 h-3.5" /> Feature Tour
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight">
            One console, <span className="text-gradient">eight operational modules</span>
          </h1>
          <p className="mt-5 text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Each module shares the same bundled data layer and REST API, so insights connect across
            routing, weather, congestion, model scoring and analytics.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/app/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:scale-[1.02] shadow-lg shadow-cyan-500/25"
            >
              Launch Console <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-24 space-y-6">
        {modules.map((m, i) => {
          const Icon = m.icon;
          return (
            <Reveal key={m.title} delay={0.02}>
              <div className="grid md:grid-cols-12 gap-8 rounded-3xl border border-white/8 bg-white/[0.02] p-7 sm:p-9 hover:border-cyan-400/20 transition-colors">
                <div className="md:col-span-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${accentMap[m.accent]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
                      {m.tag}
                    </span>
                  </div>
                  <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-100">{m.title}</h2>
                  <p className="mt-3 text-slate-400 leading-relaxed">{m.desc}</p>
                </div>
                <div className="md:col-span-7 md:border-l md:border-white/5 md:pl-8 flex flex-col justify-between">
                  <ul className="space-y-3">
                    {m.points.map((p) => (
                      <li key={p} className="flex items-start gap-3 text-sm text-slate-300">
                        <CheckCircle2 className="w-[18px] h-[18px] text-cyan-400 shrink-0 mt-0.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={m.to}
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Open module <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </Reveal>
          );
        })}
      </section>
    </div>
  );
};
