import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';

/* Route-level code splitting keeps the initial bundle small. */
const LandingPage = lazy(() =>
  import('./pages/public/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const FeaturesPage = lazy(() =>
  import('./pages/public/FeaturesPage').then((m) => ({ default: m.FeaturesPage })),
);
const DocsPage = lazy(() =>
  import('./pages/public/DocsPage').then((m) => ({ default: m.DocsPage })),
);
const AboutPage = lazy(() =>
  import('./pages/public/AboutPage').then((m) => ({ default: m.AboutPage })),
);

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const RouteOptimizerPage = lazy(() =>
  import('./pages/RouteOptimizerPage').then((m) => ({ default: m.RouteOptimizerPage })),
);
const FlightIntelligencePage = lazy(() =>
  import('./pages/FlightIntelligencePage').then((m) => ({ default: m.FlightIntelligencePage })),
);
const NetworkMapPage = lazy(() =>
  import('./pages/NetworkMapPage').then((m) => ({ default: m.NetworkMapPage })),
);
const WeatherPage = lazy(() =>
  import('./pages/WeatherPage').then((m) => ({ default: m.WeatherPage })),
);
const CongestionPage = lazy(() =>
  import('./pages/CongestionPage').then((m) => ({ default: m.CongestionPage })),
);
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);
const ModelIntelligencePage = lazy(() =>
  import('./pages/ModelIntelligencePage').then((m) => ({ default: m.ModelIntelligencePage })),
);
const SystemHealthPage = lazy(() =>
  import('./pages/SystemHealthPage').then((m) => ({ default: m.SystemHealthPage })),
);

const RouteFallback: React.FC = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="flex items-center gap-3 font-mono text-cyan-400 text-sm">
      <span className="w-4 h-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
      <span>LOADING MODULE…</span>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public marketing / documentation site */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Route>

          {/* Operations console */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="routes" element={<RouteOptimizerPage />} />
            <Route path="flights" element={<FlightIntelligencePage />} />
            <Route path="network" element={<NetworkMapPage />} />
            <Route path="weather" element={<WeatherPage />} />
            <Route path="congestion" element={<CongestionPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="model" element={<ModelIntelligencePage />} />
            <Route path="system" element={<SystemHealthPage />} />
          </Route>

          {/* Legacy paths → console (keeps old links working) */}
          <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/routes" element={<Navigate to="/app/routes" replace />} />
          <Route path="/flights" element={<Navigate to="/app/flights" replace />} />
          <Route path="/network" element={<Navigate to="/app/network" replace />} />
          <Route path="/weather" element={<Navigate to="/app/weather" replace />} />
          <Route path="/congestion" element={<Navigate to="/app/congestion" replace />} />
          <Route path="/analytics" element={<Navigate to="/app/analytics" replace />} />
          <Route path="/model" element={<Navigate to="/app/model" replace />} />
          <Route path="/system" element={<Navigate to="/app/system" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
