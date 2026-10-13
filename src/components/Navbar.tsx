import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plane, ShieldAlert, Cpu, Activity, Menu, Home, ChevronRight } from 'lucide-react';

interface NavbarProps {
  onOpenMobile: () => void;
}

const titles: Record<string, string> = {
  dashboard: 'Dashboard',
  routes: 'Route Optimizer',
  flights: 'Flight Intelligence',
  network: 'Network Map',
  weather: 'Weather Intelligence',
  congestion: 'Airport Congestion',
  analytics: 'Analytics',
  model: 'Model Metrics',
  system: 'System Health',
};

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobile }) => {
  const [timeUtc, setTimeUtc] = useState<string>('');
  const location = useLocation();

  useEffect(() => {
    const updateTime = () => setTimeUtc(new Date().toUTCString().replace('GMT', 'UTC'));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const segment = location.pathname.split('/').filter(Boolean).pop() || 'dashboard';
  const pageTitle = titles[segment] || 'Console';

  return (
    <header className="h-16 shrink-0 border-b border-white/5 bg-[#070a0f]/85 glass px-3 sm:px-5 flex items-center justify-between sticky top-0 z-30">
      {/* Left: nav + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" className="flex items-center gap-2.5 shrink-0" title="Back to AeroRoute AI home">
          <span className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
            <Plane className="w-4 h-4 -rotate-45" />
          </span>
          <span className="hidden xl:block font-display font-bold tracking-tight text-slate-100">
            AeroRoute <span className="text-cyan-400">AI</span>
          </span>
        </Link>

        <span className="hidden sm:block text-slate-700">/</span>
        <div className="hidden sm:flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-slate-500">Console</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="font-medium text-slate-200 truncate">{pageTitle}</span>
        </div>
      </div>

      {/* Center status (wide screens) */}
      <div className="hidden 2xl:flex items-center gap-4 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-medium">DATA READY</span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>DELAY SCORING</span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span>GRAPH ROUTING</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden lg:block text-right font-mono">
          <div className="text-xs text-slate-200 tracking-wider">{timeUtc}</div>
          <div className="text-[10px] text-slate-500">UTC · BUNDLED SNAPSHOTS</div>
        </div>

        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Website</span>
        </Link>

        <div className="text-[11px] font-mono text-amber-300/90 bg-amber-500/10 border border-amber-500/25 px-2 py-1 rounded-lg flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PROTOTYPE</span>
        </div>
      </div>
    </header>
  );
};
