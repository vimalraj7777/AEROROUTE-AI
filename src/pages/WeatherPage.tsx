import React, { useState, useEffect } from 'react';
import {
  CloudRain,
  Wind,
  Eye,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle,
} from 'lucide-react';
import { api } from '../api';
import { MetarObservation } from '../types';

export const WeatherPage: React.FC = () => {
  const [weatherList, setWeatherList] = useState<MetarObservation[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('KORD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWeather() {
      try {
        const res = await api.getWeatherSummary();
        setWeatherList(res.observations);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadWeather();
  }, []);

  const activeObs =
    weatherList.find((w) => w.station === selectedStation) || weatherList[0];

  const windRisk = activeObs
    ? Math.min(100, Math.round(activeObs.wind_speed_kt * 2.5 + activeObs.wind_gust_kt * 1.5))
    : 0;
  const visRisk = activeObs
    ? activeObs.visibility_sm < 3
      ? 80
      : activeObs.visibility_sm < 5
      ? 45
      : 10
    : 0;
  const ceilingRisk = activeObs
    ? activeObs.ceiling_ft < 1000
      ? 90
      : activeObs.ceiling_ft < 3000
      ? 50
      : 15
    : 0;

  return (
    <div className="p-5 sm:p-8 lg:p-10 space-y-7 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
              AVIATION WEATHER INTELLIGENCE
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
              BUNDLED METAR OBSERVATIONS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Stored METAR observations with derived risk scores for route comparison and delay-risk demonstrations. This is not a live feed.
          </p>
        </div>

        {/* Station Dropdown */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">SELECT STATION:</span>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {weatherList.map((w) => (
              <option key={w.station} value={w.station}>
                {w.station} ({w.flight_category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeObs && (
        <>
          {/* Active Station Overview Banner */}
          <div className="bg-[#0c121d] border border-slate-800 rounded p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold font-mono text-slate-100">
                    {activeObs.station}
                  </h2>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                      activeObs.flight_category === 'VFR'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                        : activeObs.flight_category === 'MVFR'
                        ? 'bg-sky-950/60 text-sky-400 border border-sky-800/40'
                        : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                    }`}
                  >
                    FLIGHT CAT: {activeObs.flight_category}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400 mt-1">
                  Observation Timestamp: {activeObs.timestamp_utc}
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-xs text-slate-400">COMPOSITE RISK INDEX</span>
                <div className="text-2xl font-bold text-amber-400">
                  {activeObs.composite_risk_score}{' '}
                  <span className="text-xs font-normal text-slate-500">/ 100</span>
                </div>
              </div>
            </div>

            {/* Raw METAR String */}
            <div className="bg-slate-950/80 border border-slate-850 p-3 rounded font-mono text-xs">
              <span className="text-slate-500 block mb-1">RAW METAR TELEMETRY:</span>
              <code className="text-cyan-300 font-semibold tracking-wide">
                {activeObs.raw_metar}
              </code>
            </div>
          </div>

          {/* 4 Risk Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Wind Risk */}
            <div className="bg-[#0c121d] border border-slate-800 rounded p-4 font-mono space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs">
                <span>SURFACE WINDS</span>
                <Wind className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-slate-100">
                {activeObs.wind_dir}° / {activeObs.wind_speed_kt} KT
              </div>
              <div className="text-xs text-slate-400">
                Gusts: {activeObs.wind_gust_kt ? `${activeObs.wind_gust_kt} KT` : 'None'}
              </div>
              <div className="text-[11px] text-cyan-400 pt-1 border-t border-slate-800">
                Wind Risk Factor: {windRisk} / 100
              </div>
            </div>

            {/* Visibility Risk */}
            <div className="bg-[#0c121d] border border-slate-800 rounded p-4 font-mono space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs">
                <span>VISIBILITY</span>
                <Eye className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl font-bold text-slate-100">
                {activeObs.visibility_sm} STATUTE MI
              </div>
              <div className="text-xs text-slate-400">
                Minima: {activeObs.visibility_sm >= 5 ? 'VFR Clear' : 'Instrument Approach'}
              </div>
              <div className="text-[11px] text-sky-400 pt-1 border-t border-slate-800">
                Visibility Risk Factor: {visRisk} / 100
              </div>
            </div>

            {/* Cloud Ceiling */}
            <div className="bg-[#0c121d] border border-slate-800 rounded p-4 font-mono space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs">
                <span>CLOUD CEILING</span>
                <CloudRain className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-slate-100">
                {activeObs.ceiling_ft} FT AGL
              </div>
              <div className="text-xs text-slate-400">
                Altimeter: {activeObs.altimeter_inhg} inHg
              </div>
              <div className="text-[11px] text-amber-400 pt-1 border-t border-slate-800">
                Ceiling Risk Factor: {ceilingRisk} / 100
              </div>
            </div>

            {/* Weather Phenomena */}
            <div className="bg-[#0c121d] border border-slate-800 rounded p-4 font-mono space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs">
                <span>WEATHER PHENOMENA</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl font-bold text-slate-100 truncate">
                {activeObs.phenomena}
              </div>
              <div className="text-xs text-slate-400">
                Temp: {activeObs.temp_c}°C · Dew: {activeObs.dewpoint_c}°C
              </div>
              <div className="text-[11px] text-rose-400 pt-1 border-t border-slate-800">
                Penalty: {activeObs.phenomena !== 'None' ? 'Active Weather Cell' : 'Nominal'}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Monitored Weather Stations Table */}
      <div className="bg-[#0c121d] border border-slate-800 rounded p-4 space-y-3">
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
          ALL MONITORED NAS STATIONS
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="py-2">STATION</th>
                <th className="py-2">CATEGORY</th>
                <th className="py-2">WIND</th>
                <th className="py-2">VISIBILITY</th>
                <th className="py-2">CEILING</th>
                <th className="py-2">PHENOMENA</th>
                <th className="py-2">RISK SCORE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {weatherList.map((w) => (
                <tr
                  key={w.station}
                  onClick={() => setSelectedStation(w.station)}
                  className={`cursor-pointer transition-colors ${
                    w.station === selectedStation
                      ? 'bg-cyan-950/50 text-slate-100'
                      : 'hover:bg-slate-900/40 text-slate-300'
                  }`}
                >
                  <td className="py-2.5 font-bold text-slate-200">{w.station}</td>
                  <td className="py-2.5">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        w.flight_category === 'VFR'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : w.flight_category === 'MVFR'
                          ? 'bg-sky-950/60 text-sky-400 border border-sky-800/40'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                      }`}
                    >
                      {w.flight_category}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-300">
                    {w.wind_dir}° / {w.wind_speed_kt}kt
                  </td>
                  <td className="py-2.5 text-slate-300">{w.visibility_sm} SM</td>
                  <td className="py-2.5 text-slate-300">{w.ceiling_ft} ft</td>
                  <td className="py-2.5 text-slate-400">{w.phenomena}</td>
                  <td className="py-2.5 text-amber-400 font-bold">{w.composite_risk_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology Notice */}
      <div className="bg-slate-950/50 border border-slate-850 p-4 rounded text-xs font-mono text-slate-500 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-400 font-bold">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>METAR RISK FORMULATION DISCLOSURE</span>
        </div>
        <p>
          Weather risk indices are operational decision-support heuristics synthesized from standard METAR parameters. They do not constitute official FAA Air Traffic Control ground-stop determinations or certified airline takeoff/landing minima.
        </p>
      </div>
    </div>
  );
};
