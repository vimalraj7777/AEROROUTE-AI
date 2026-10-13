import React, { useState, useEffect } from 'react';
import {
  Plane,
  Search,
  Filter,
  X,
  Clock,
  CloudRain,
  Gauge,
  Cpu,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../api';
import { FlightRecord, MetarObservation, AirportActivity } from '../types';

export const FlightIntelligencePage: React.FC = () => {
  const [flights, setFlights] = useState<FlightRecord[]>([]);
  const [datasetRecordCount, setDatasetRecordCount] = useState(0);
  const [isSampled, setIsSampled] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightRecord | null>(null);
  const [flightContext, setFlightContext] = useState<{
    origin_weather?: MetarObservation;
    dest_weather?: MetarObservation;
    origin_activity?: AirportActivity;
  } | null>(null);

  // Filters
  const [carrierFilter, setCarrierFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFlights() {
      setLoading(true);
      try {
        const res = await api.getFlights({
          carrier: carrierFilter || undefined,
          origin: originFilter || undefined,
          dest: destFilter || undefined,
          status: statusFilter || undefined,
        });
        setFlights(res.flights);
        setDatasetRecordCount(res.dataset_record_count);
        setIsSampled(res.is_sampled);
        if (res.flights.length > 0 && !selectedFlight) {
          handleSelectFlight(res.flights[0]);
        }
      } catch (err) {
        console.error('Failed to load flights', err);
      } finally {
        setLoading(false);
      }
    }
    loadFlights();
  }, [carrierFilter, originFilter, destFilter, statusFilter]);

  const handleSelectFlight = async (flight: FlightRecord) => {
    setSelectedFlight(flight);
    try {
      const detail = await api.getFlightDetail(flight.record_id || flight.flight_num);
      setFlightContext(detail.context);
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (t: number) => {
    if (!t) return '--:--';
    const s = t.toString().padStart(4, '0');
    return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  };

  return (
    <div className="p-5 sm:p-8 lg:p-10 space-y-7 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
              FLIGHT OPERATIONS INTELLIGENCE
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
              U.S. DOT BTS ON-TIME PERFORMANCE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real U.S. DOT BTS flight records (January 2024, hub network) with delay attribution and stored weather context.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400">
          {isSampled
            ? `Showing ${flights.length} sampled records · ${datasetRecordCount.toLocaleString()} total flights`
            : `Showing ${flights.length} sample flights`}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0c121d] border border-slate-800 rounded p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 shrink-0">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>FILTERS:</span>
        </div>

        {/* Carrier */}
        <select
          value={carrierFilter}
          onChange={(e) => setCarrierFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Carriers</option>
          <option value="DL">Delta (DL)</option>
          <option value="AA">American (AA)</option>
          <option value="UA">United (UA)</option>
          <option value="WN">Southwest (WN)</option>
          <option value="AS">Alaska (AS)</option>
          <option value="B6">JetBlue (B6)</option>
          <option value="F9">Frontier (F9)</option>
          <option value="G4">Allegiant (G4)</option>
          <option value="HA">Hawaiian (HA)</option>
          <option value="NK">Spirit (NK)</option>
          <option value="9E">Endeavor (9E)</option>
          <option value="EV">ExpressJet (EV)</option>
          <option value="MQ">Envoy (MQ)</option>
          <option value="OH">PSA (OH)</option>
          <option value="OO">SkyWest (OO)</option>
          <option value="YV">Mesa (YV)</option>
          <option value="YX">Republic (YX)</option>
        </select>

        {/* Origin */}
        <input
          type="text"
          placeholder="Origin Hub (e.g. ORD)"
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value.toUpperCase())}
          className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 w-36 uppercase focus:outline-none focus:border-cyan-500"
        />

        {/* Dest */}
        <input
          type="text"
          placeholder="Dest Hub (e.g. SFO)"
          value={destFilter}
          onChange={(e) => setDestFilter(e.target.value.toUpperCase())}
          className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 w-36 uppercase focus:outline-none focus:border-cyan-500"
        />

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Statuses</option>
          <option value="ON_TIME">On-Time</option>
          <option value="MINOR_DELAY">Minor Delay</option>
          <option value="MODERATE_DELAY">Moderate Delay</option>
          <option value="SEVERE_DELAY">Severe Delay</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="DIVERTED">Diverted</option>
        </select>

        {(carrierFilter || originFilter || destFilter || statusFilter) && (
          <button
            onClick={() => {
              setCarrierFilter('');
              setOriginFilter('');
              setDestFilter('');
              setStatusFilter('');
            }}
            className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Main Split: Flight Table & Selected Flight Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flight Table */}
        <div className="lg:col-span-2 bg-[#0c121d] border border-slate-800 rounded p-4 space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="py-2 px-2">FLIGHT</th>
                  <th className="py-2 px-2">ROUTE</th>
                  <th className="py-2 px-2">SCHED DEP</th>
                  <th className="py-2 px-2">ACT DEP</th>
                  <th className="py-2 px-2">ARR DELAY</th>
                  <th className="py-2 px-2">STATUS</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {flights.map((f) => {
                  const isSelected = selectedFlight?.flight_num === f.flight_num;
                  return (
                    <tr
                      key={f.record_id || `${f.fl_date}-${f.carrier}-${f.flight_num}-${f.origin}-${f.dest}`}
                      onClick={() => handleSelectFlight(f)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-cyan-950/50 border-l-2 border-cyan-400 text-slate-100'
                          : 'hover:bg-slate-900/50 text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 px-2 font-bold flex items-center gap-1.5">
                        <span className="text-cyan-400">{f.carrier}</span>
                        <span>{f.flight_num}</span>
                      </td>
                      <td className="py-2.5 px-2">
                        {f.origin} &rarr; {f.dest}
                      </td>
                      <td className="py-2.5 px-2 text-slate-400">{formatTime(f.crs_dep_time)}</td>
                      <td className="py-2.5 px-2 text-slate-400">{formatTime(f.dep_time)}</td>
                      <td className="py-2.5 px-2">
                        {f.cancelled === 1 ? (
                          <span className="text-rose-400">CAN</span>
                        ) : f.arr_delay <= 0 ? (
                          <span className="text-emerald-400">{f.arr_delay}m</span>
                        ) : f.arr_delay <= 15 ? (
                          <span className="text-sky-400">+{f.arr_delay}m</span>
                        ) : f.arr_delay <= 45 ? (
                          <span className="text-amber-400">+{f.arr_delay}m</span>
                        ) : (
                          <span className="text-rose-400 font-bold">+{f.arr_delay}m</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            f.status === 'ON_TIME'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : f.status === 'MINOR_DELAY'
                              ? 'bg-sky-950/60 text-sky-400 border border-sky-800/40'
                              : f.status === 'MODERATE_DELAY'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                          }`}
                        >
                          {f.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-500">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Flight Operational Detail */}
        {selectedFlight && (
          <div className="bg-[#0c121d] border border-slate-800 rounded p-5 space-y-4">
            <div className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-base font-bold font-mono text-slate-100">
                    {selectedFlight.carrier_name} {selectedFlight.flight_num}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {selectedFlight.fl_date}
                </span>
              </div>
              <div className="text-xs font-mono text-cyan-400 mt-1">
                {selectedFlight.origin} &rarr; {selectedFlight.dest} · {selectedFlight.distance} NM
              </div>
            </div>

            {/* Delay Causes Breakdown */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-slate-300">
                DELAY ATTRIBUTION DECOMPOSITION
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded">
                  <div className="text-[10px] text-slate-500">WEATHER DELAY</div>
                  <div className="text-base font-bold text-amber-400">
                    {selectedFlight.weather_delay} min
                  </div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded">
                  <div className="text-[10px] text-slate-500">NAS / AIRSPACE DELAY</div>
                  <div className="text-base font-bold text-purple-400">
                    {selectedFlight.nas_delay} min
                  </div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded">
                  <div className="text-[10px] text-slate-500">CARRIER DELAY</div>
                  <div className="text-base font-bold text-cyan-400">
                    {selectedFlight.carrier_delay} min
                  </div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded">
                  <div className="text-[10px] text-slate-500">LATE AIRCRAFT DELAY</div>
                  <div className="text-base font-bold text-rose-400">
                    {selectedFlight.late_aircraft_delay} min
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Context: Weather at Origin & Dest */}
            <div className="space-y-2 pt-2 border-t border-slate-800 font-mono text-xs">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-amber-400" />
                <span>ENVIRONMENTAL CONTEXT</span>
              </div>

              {flightContext?.origin_weather && (
                <div className="bg-slate-900/50 p-2 rounded border border-slate-800/80">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-slate-200">
                      ORIGIN {flightContext.origin_weather.station}
                    </span>
                    <span className="text-cyan-400">
                      {flightContext.origin_weather.flight_category} (Risk {flightContext.origin_weather.composite_risk_score})
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 truncate">
                    {flightContext.origin_weather.raw_metar}
                  </div>
                </div>
              )}

              {flightContext?.dest_weather && (
                <div className="bg-slate-900/50 p-2 rounded border border-slate-800/80">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-slate-200">
                      DEST {flightContext.dest_weather.station}
                    </span>
                    <span className="text-cyan-400">
                      {flightContext.dest_weather.flight_category} (Risk {flightContext.dest_weather.composite_risk_score})
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 truncate">
                    {flightContext.dest_weather.raw_metar}
                  </div>
                </div>
              )}
            </div>

            {/* Stored status assessment */}
            <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 rounded font-mono text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Cpu className="w-3.5 h-3.5" />
                <span>STORED FLIGHT STATUS</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                This flight record is marked <strong className="text-cyan-300">{selectedFlight.status}</strong>. It is a historical status, not a new model prediction.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
