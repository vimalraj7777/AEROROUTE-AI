import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Navigation,
  Plane,
  Network,
  CloudRain,
  Gauge,
  BarChart3,
  Cpu,
  Server,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Terminal,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/app/network', label: 'Network Map', icon: Network },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { to: '/app/flights', label: 'Flight Intel', icon: Plane },
      { to: '/app/weather', label: 'Weather Intel', icon: CloudRain },
      { to: '/app/congestion', label: 'Congestion', icon: Gauge },
      { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Optimization',
    items: [{ to: '/app/routes', label: 'Route Optimizer', icon: Navigation, badge: 'A*' }],
  },
  {
    title: 'Platform',
    items: [
      { to: '/app/model', label: 'Model Metrics', icon: Cpu, badge: 'ART' },
      { to: '/app/system', label: 'System Health', icon: Server },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const SidebarContent: React.FC<{
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile?: () => void;
  showCollapse?: boolean;
}> = ({ collapsed, onToggleCollapse, onCloseMobile, showCollapse = true }) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header / collapse */}
      <div className="h-16 shrink-0 px-4 flex items-center justify-between border-b border-white/5">
        {!collapsed && (
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Modules
          </span>
        )}
        <div className="flex items-center gap-1">
          {showCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5"
              title="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-600">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group relative flex items-center ${
                      collapsed ? 'justify-center' : 'justify-between'
                    } gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-300'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-cyan-400" />
                      )}
                      <span className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-cyan-400' : ''}`} />
                        {!collapsed && (
                          <span className="truncate font-medium">{item.label}</span>
                        )}
                      </span>
                      {!collapsed && item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10 font-mono">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed ? (
        <div className="p-3 border-t border-white/5">
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              OPERATIONAL CONTEXT
            </div>
            <p className="text-[10px] leading-relaxed text-slate-500">
              Academic decision-support prototype. Non-operational environment; derived proxies are
              clearly distinguished from stored observations.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-white/5 flex justify-center">
          <Terminal className="w-4 h-4 text-slate-600" />
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 256 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex flex-col shrink-0 border-r border-white/5 bg-[#070a0f] overflow-hidden"
      >
        <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-[#070a0f]"
            >
              <SidebarContent
                collapsed={false}
                onToggleCollapse={onToggleCollapse}
                onCloseMobile={onCloseMobile}
                showCollapse={false}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
