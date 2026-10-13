import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Target,
  Cpu,
  Database,
  Layers,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Reveal } from '../../components/public/Reveal';

const stack = [
  { t: 'Frontend', items: ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS', 'React Router'] },
  { t: 'Visualization', items: ['Leaflet', 'Recharts', 'Lucide Icons', 'Motion'] },
  { t: 'Backend', items: ['Express', 'TypeScript', 'Custom Dijkstra / A*', 'Deterministic scoring'] },
  { t: 'Data', items: ['BTS flight snapshots', 'NOAA METAR snapshots', 'FAA hub reference', 'JSON in-memory store'] },
];

const scope = [
  'Graph-based multi-objective route optimization',
  'Explainable decision factors for each recommendation',
  'Derived weather, congestion and delay-risk proxies',
  'Algorithm benchmarking between Dijkstra and A*',
  'Full-stack observability and structured logging',
];

export const AboutPage: React.FC = () => {
  return (
    <div>
      <section className="relative border-b border-white/5">
        <div className="absolute inset-0 aurora opacity-60" />
        <div className="absolute inset-0 grid-overlay" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/5 px-3.5 py-1.5 text-xs font-medium text-cyan-300">
            <Target className="w-3.5 h-3.5" /> About the project
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight max-w-3xl">
            An academic lab for <span className="text-gradient">transparent aviation decisions</span>
          </h1>
          <p className="mt-5 text-slate-400 max-w-2xl leading-relaxed">
            AeroRoute AI demonstrates how competing operational objectives can be modeled, optimized
            and explained — without hiding the mechanics behind a black box.
          </p>
        </div>
      </section>

      <section id="scope" className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-14 scroll-mt-24">
        <Reveal direction="right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-300">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-100">Project scope</h2>
          </div>
          <p className="mt-5 text-slate-400 leading-relaxed">
            The prototype focuses on clarity and reproducibility. Every number shown in the console can
            be traced to a bundled dataset, a normalized cost term, or a documented formula.
          </p>
          <ul className="mt-6 space-y-3">
            {scope.map((s) => (
              <li key={s} className="flex items-start gap-3 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal direction="left">
          <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-7">
            <h3 className="font-semibold text-slate-100">Technology stack</h3>
            <div className="mt-5 space-y-5">
              {stack.map((g) => (
                <div key={g.t}>
                  <div className="text-xs font-mono uppercase tracking-widest text-slate-500">{g.t}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {g.items.map((it) => (
                      <span
                        key={it}
                        className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300"
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="border-y border-white/5 bg-white/[0.015] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 grid sm:grid-cols-3 gap-6">
          {[
            { icon: Cpu, t: 'Explainable by design', d: 'Recommendations ship with human-readable decision factors, not just scores.' },
            { icon: Database, t: 'Reproducible data', d: 'Bundled snapshots mean demos behave identically on every machine.' },
            { icon: Layers, t: 'Modular console', d: 'Eight focused modules share one API and one consistent design language.' },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.t} delay={i * 0.08}>
                <div className="rounded-2xl border border-white/8 bg-[#0a0f1a]/60 p-6 h-full">
                  <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="mt-4 font-semibold text-slate-100">{c.t}</div>
                  <div className="mt-1.5 text-sm text-slate-400 leading-relaxed">{c.d}</div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section id="disclaimer" className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-24 scroll-mt-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/25 flex items-center justify-center text-amber-300 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-100">Academic safety boundary</h2>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-3xl">
                  AeroRoute AI is strictly an academic decision-support prototype and is{' '}
                  <strong className="text-slate-200">not certified under FAA Part 121 / 135 or ICAO standards</strong>.
                  Real-world operations additionally require convective SIGMETs, TAF forecasts, PIREPs
                  and sector-level airspace constraints. Use this project for study, benchmarking and
                  demonstration only.
                </p>
                <Link
                  to="/app/system"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] px-5 py-2.5 text-sm font-semibold text-slate-100 transition-colors"
                >
                  View live system health <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
};
