import React from 'react';
import { Link } from 'react-router-dom';
import { Plane, ShieldAlert, Github, BookOpen, Server } from 'lucide-react';

const columns = [
  {
    title: 'Product',
    links: [
      { to: '/features', label: 'Feature Tour' },
      { to: '/app/dashboard', label: 'Launch Console' },
      { to: '/app/routes', label: 'Route Optimizer' },
      { to: '/app/model', label: 'Model Metrics' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { to: '/docs', label: 'Documentation' },
      { to: '/docs#architecture', label: 'Architecture' },
      { to: '/docs#data-sources', label: 'Data Sources' },
      { to: '/docs#api', label: 'API Reference' },
    ],
  },
  {
    title: 'Project',
    links: [
      { to: '/about', label: 'About' },
      { to: '/about#scope', label: 'Academic Scope' },
      { to: '/about#disclaimer', label: 'Disclaimer' },
      { to: '/app/system', label: 'System Health' },
    ],
  },
];

export const PublicFooter: React.FC = () => {
  return (
    <footer className="relative border-t border-white/5 bg-[#05070c]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                <Plane className="w-[18px] h-[18px] -rotate-45" />
              </span>
              <span className="font-display font-bold tracking-tight text-slate-100">
                AeroRoute <span className="text-cyan-400">AI</span>
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-xs">
              Aviation operations & route intelligence. Graph-based Dijkstra / A* optimization with
              explainable delay-risk scoring.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">
              <ShieldAlert className="w-3.5 h-3.5" />
              Academic prototype — not certified aviation software
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-slate-400 hover:text-cyan-300 transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} AeroRoute AI · Academic decision-support research.
          </p>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Bundled BTS / NOAA / FAA snapshots
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" /> React 19 · Express · TypeScript
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
