import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Database, GitBranch, Server, ShieldAlert, ArrowRight } from 'lucide-react';
import { Reveal } from '../../components/public/Reveal';

const nav = [
  { id: 'overview', label: 'Overview' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'algorithms', label: 'Algorithms' },
  { id: 'data-sources', label: 'Data Sources' },
  { id: 'api', label: 'API Reference' },
  { id: 'limitations', label: 'Limitations' },
];

const endpoints: { method: string; path: string; desc: string }[] = [
  { method: 'GET', path: '/api/health', desc: 'System status, version and academic disclaimer.' },
  { method: 'GET', path: '/api/airports', desc: 'Bundled airport locations and derived risk fields.' },
  { method: 'GET', path: '/api/weather/summary', desc: 'METAR observations, categories and average risk.' },
  { method: 'GET', path: '/api/weather/:code', desc: 'Single station observation.' },
  { method: 'GET', path: '/api/weather/risk/:code', desc: 'Derived risk breakdown for a station.' },
  { method: 'GET', path: '/api/congestion/summary', desc: 'Ranked airport congestion and runway load factors.' },
  { method: 'GET', path: '/api/congestion/:code', desc: 'One airport congestion proxy.' },
  { method: 'GET', path: '/api/flights', desc: 'Search bundled flight records.' },
  { method: 'GET', path: '/api/flights/:id', desc: 'Flight detail with environmental context.' },
  { method: 'GET', path: '/api/network/graph', desc: 'Nodes and directed corridor edges used by routing.' },
  { method: 'POST', path: '/api/routes/optimize', desc: 'Multi-objective path via Dijkstra, A* or both.' },
  { method: 'GET', path: '/api/model/metrics', desc: 'Bundled model-metric artifacts.' },
  { method: 'POST', path: '/api/model/predict', desc: 'Deterministic delay-risk scoring with attributions.' },
  { method: 'GET', path: '/api/analytics/summary', desc: 'Aggregated flight-delay and carrier summaries.' },
  { method: 'GET', path: '/api/system/health', desc: 'Loaded subsystem state.' },
  { method: 'GET', path: '/api/system/logs', desc: 'In-memory structured log stream.' },
];

const Section: React.FC<{
  id: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}> = ({ id, icon: Icon, title, children }) => (
  <section id={id} className="scroll-mt-24">
    <Reveal>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">{title}</h2>
      </div>
      <div className="mt-5 space-y-4 text-slate-400 leading-relaxed">{children}</div>
    </Reveal>
  </section>
);

export const DocsPage: React.FC = () => {
  return (
    <div>
      <section className="relative border-b border-white/5">
        <div className="absolute inset-0 aurora opacity-60" />
        <div className="absolute inset-0 grid-overlay" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/5 px-3.5 py-1.5 text-xs font-medium text-cyan-300">
            <BookOpen className="w-3.5 h-3.5" /> Documentation
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight">Methodology & reference</h1>
          <p className="mt-5 text-slate-400 max-w-2xl leading-relaxed">
            How the bundled decision-support engine works — from data ingestion to route
            recommendation, scoring and observability.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14 grid lg:grid-cols-[220px_1fr] gap-12">
        {/* Sticky sidebar nav */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
              On this page
            </div>
            {nav.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="block px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
              >
                {n.label}
              </a>
            ))}
            <Link
              to="/app/dashboard"
              className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors"
            >
              Launch Console <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </aside>

        <div className="space-y-16 min-w-0">
          <Section id="overview" icon={BookOpen} title="Overview">
            <p>
              AeroRoute AI is an academic aviation operations-intelligence and route-optimization
              decision-support prototype. It models a small airport network as a weighted directed
              graph, computes paths with custom <strong className="text-slate-200">Dijkstra</strong> and{' '}
              <strong className="text-slate-200">A*</strong> search, and estimates delay categories with a
              deterministic scoring demonstration.
            </p>
            <p>
              The console exposes each stage as a dedicated module backed by a REST endpoint, so every
              recommendation can be traced back to its inputs.
            </p>
          </Section>

          <Section id="architecture" icon={GitBranch} title="Architecture">
            <p>The end-to-end pipeline runs entirely from bundled local snapshots:</p>
            <pre className="rounded-2xl border border-white/8 bg-[#0a0f1a]/70 p-5 overflow-x-auto text-[12px] leading-relaxed text-slate-300 font-mono">
{`[ BTS On-Time Data ] ─┐
[ NOAA METAR Data  ] ─┼─> [ Ingestion ] ─> [ Feature Engineering ]
[ FAA Airport Hubs ] ─┘                          │
                                                 ▼
                     [ Airspace Network Graph ]  [ Delay Scoring ]
                                 │                       │
                                 ▼                       ▼
                     [ Dijkstra & A* Engines ] <─ [ Multi-Objective Weights ]
                                 │
                                 ▼
                     [ Route Recommendation Engine ]
                                 │
                                 ▼
                     [ Full-Stack REST API ] -> [ Operations Console ]`}
            </pre>
          </Section>

          <Section id="algorithms" icon={GitBranch} title="Algorithms & Cost Model">
            <p>
              The router optimizes edge cost over the graph, where each component is normalized before
              weighting:
            </p>
            <pre className="rounded-2xl border border-white/8 bg-[#0a0f1a]/70 p-5 overflow-x-auto text-[12px] leading-relaxed text-cyan-200 font-mono">
{`C(e) = w_d·(D/2500) + w_t·(T/300) + w_w·(W/100) + w_c·(C/100) + w_r·R`}
            </pre>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-cyan-400 font-semibold shrink-0">Dijkstra</span>
                Exhaustive min-priority search yielding a mathematically optimal cost.
              </li>
              <li className="flex gap-3">
                <span className="text-cyan-400 font-semibold shrink-0">A*</span>
                Admissible Haversine great-circle heuristic producing identical optimal paths with
                substantially fewer explored nodes.
              </li>
            </ul>
          </Section>

          <Section id="data-sources" icon={Database} title="Data Sources">
            <p>
              All datasets are bundled snapshots loaded into memory at startup — the application does
              not poll live upstream providers.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { t: 'U.S. DOT BTS', d: 'Historical on-time flight records and delay causes.' },
                { t: 'NOAA METAR', d: 'Stored routine weather observations.' },
                { t: 'FAA Reference', d: 'Airport hub coordinates, elevations and capacities.' },
              ].map((s) => (
                <div key={s.t} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                  <div className="font-semibold text-slate-100">{s.t}</div>
                  <div className="mt-1.5 text-sm text-slate-400">{s.d}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="api" icon={Server} title="API Reference">
            <p>Frontend calls are centralized in <code className="text-cyan-300">src/api.ts</code>. Key endpoints:</p>
            <div className="overflow-x-auto rounded-2xl border border-white/8">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-white/8">
                    <th className="py-3 px-4 font-medium">Method</th>
                    <th className="py-3 px-4 font-medium">Path</th>
                    <th className="py-3 px-4 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {endpoints.map((e) => (
                    <tr key={e.method + e.path} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            e.method === 'GET'
                              ? 'bg-cyan-500/10 text-cyan-300'
                              : 'bg-violet-500/10 text-violet-300'
                          }`}
                        >
                          {e.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[12px] text-slate-300">{e.path}</td>
                      <td className="py-2.5 px-4 text-slate-400">{e.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="limitations" icon={ShieldAlert} title="Limitations & Safety">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5 text-amber-200/90">
              <p className="text-sm leading-relaxed">
                This is <strong>not certified aviation software</strong>. It holds no ATC authority,
                flight-dispatch clearance or avionics guarantees, and must never be used for real
                dispatch or navigation. Congestion telemetry is derived mathematically, weather is
                limited to METAR observations, and the prediction endpoint uses deterministic scoring
                rather than a loaded trained model.
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};
