import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  Filter,
  Navigation,
  CloudRain,
  Gauge,
  ArrowRight,
  Compass,
  Building,
} from 'lucide-react';
import { api } from '../api';
import { LeafletMap } from '../components/LeafletMap';
import { Airport, AirportActivity, GraphEdge, MetarObservation } from '../types';

export const NetworkMapPage: React.FC = () => {
  const navigate = useNavigate();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [activities, setActivities] = useState<AirportActivity[]>([]);
  const [weatherList, setWeatherList] = useState<MetarObservation[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [graphNodeCount, setGraphNodeCount] = useState(0);
  const [selectedAirportIata, setSelectedAirportIata] = useState<string>('ORD');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNetwork() {
      try {
        const [apRes, congRes, wxRes, graphRes] = await Promise.all([
          api.getAirports(),
          api.getCongestionSummary(),
          api.getWeatherSummary(),
          api.getNetworkGraph(),
        ]);
        setAirports(apRes.airports);
        setActivities(congRes.airports);
        setWeatherList(wxRes.observations);
        setGraphEdges(graphRes.edges);
        setGraphNodeCount(graphRes.node_count);
      } catch (err) {
        console.error('Failed to load network', err);
      } finally {
        setLoading(false);
      }
    }
    loadNetwork();
  }, []);

  const selectedAirport = airports.find((a) => a.iata === selectedAirportIata) || airports[0];
  const selectedActivity = activities.find((a) => a.airport === selectedAirportIata);
  const selectedWeather = weatherList.find(
    (w) => w.station === selectedAirport?.icao || w.station === `K${selectedAirportIata}`
  );

  const filteredWaypoints = airports
    .filter((a) => {
      if (regionFilter === 'ALL') return true;
      if (regionFilter === 'East') return ['JFK', 'BOS', 'EWR', 'PHL', 'BWI', 'IAD'].includes(a.iata);
      if (regionFilter === 'Midwest') return ['ORD', 'DTW', 'MSP', 'MDW'].includes(a.iata);
      if (regionFilter === 'South') return ['DFW', 'IAH', 'ATL', 'CLT', 'MIA', 'MCO', 'TPA', 'BNA'].includes(a.iata);
      if (regionFilter === 'West') return ['LAX', 'SFO', 'SEA', 'DEN', 'SLC', 'PHX', 'LAS', 'SAN'].includes(a.iata);
      return true;
    })
    .map((a) => ({
      iata: a.iata,
      lat: a.latitude,
      lon: a.longitude,
      name: a.name,
      weather_risk: a.weather_risk,
      congestion_index: a.congestion_index,
    }));

  return (
    <div className="p-5 sm:p-8 lg:p-10 space-y-7 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
              NATIONAL AIRSPACE NETWORK TOPOLOGY
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
              GRAPH NODES & CORRIDORS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            {graphNodeCount} route-graph nodes · {graphEdges.length} directed corridors · {airports.length} airport locations
          </p>
        </div>

        {/* Region Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All US Airspace Regions</option>
            <option value="East">Eastern Corridors</option>
            <option value="Midwest">Midwest Corridors</option>
            <option value="South">Southern / Gulf Corridors</option>
            <option value="West">Western / Pacific Corridors</option>
          </select>
        </div>
      </div>

      {/* Main Split: Interactive Map & Selected Hub Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-[#0c121d] border border-slate-800 rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>CLICK ANY AIRPORT TO INSPECT OPERATIONAL TELEMETRY</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Active Hub: {selectedAirportIata}
              </span>
            </div>

            <LeafletMap
              waypoints={filteredWaypoints}
              corridors={graphEdges}
              selectedAirport={selectedAirportIata}
              onAirportClick={(code) => setSelectedAirportIata(code)}
              legendType="network"
              height="480px"
            />
          </div>
        </div>

        {/* Selected Hub Detail Panel */}
        {selectedAirport && (
          <div className="bg-[#0c121d] border border-slate-800 rounded p-5 space-y-4">
            <div className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold font-mono text-slate-100">
                    {selectedAirport.iata}
                  </h3>
                  <div className="text-xs font-mono text-cyan-400">
                    ICAO: {selectedAirport.icao} · {selectedAirport.city}, {selectedAirport.state}
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-400">
                  Elev: {selectedAirport.elevation_ft} ft<br />
                  Runways: {selectedAirport.runways || 4}
                </div>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">{selectedAirport.name}</p>
            </div>

            {/* Weather Telemetry */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-amber-400" />
                <span>STATION METAR OBSERVATION</span>
              </div>

              {selectedWeather ? (
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded font-mono text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Flight Category:</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        selectedWeather.flight_category === 'VFR'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : selectedWeather.flight_category === 'MVFR'
                          ? 'bg-sky-950/60 text-sky-400 border border-sky-800/40'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                      }`}
                    >
                      {selectedWeather.flight_category}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Wind:</span>
                    <span>
                      {selectedWeather.wind_dir}° at {selectedWeather.wind_speed_kt} kt
                      {selectedWeather.wind_gust_kt ? ` G${selectedWeather.wind_gust_kt} kt` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Visibility / Ceiling:</span>
                    <span>
                      {selectedWeather.visibility_sm} SM · {selectedWeather.ceiling_ft} ft
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Composite Risk:</span>
                    <span className="text-amber-400 font-bold">
                      {selectedWeather.composite_risk_score} / 100
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800 truncate">
                    {selectedWeather.raw_metar}
                  </div>
                </div>
              ) : (
                <div className="text-xs font-mono text-slate-500 py-2">
                  No matching station observation in the bundled dataset.
                </div>
              )}
            </div>

            {/* Congestion Telemetry */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-purple-400" />
                <span>TERMINAL AIRSPACE CONGESTION</span>
              </div>

              {selectedActivity ? (
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded font-mono text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Hourly Throughput:</span>
                    <span className="text-slate-200 font-bold">
                      {selectedActivity.total_operations} ops / hr
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Capacity Load Factor:</span>
                    <span>{Math.round(selectedActivity.load_factor * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Congestion Index:</span>
                    <span className="text-purple-400 font-bold">
                      {selectedActivity.derived_congestion_index} ({selectedActivity.congestion_band})
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Avg Taxi-Out:</span>
                    <span>{selectedActivity.avg_taxi_out_min} min</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-mono text-slate-500 py-2">
                  Nominal background traffic load.
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            <button
              onClick={() => navigate(`/app/routes?origin=${selectedAirport.iata}`)}
              className="w-full mt-4 py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-semibold text-xs tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>PLAN FLIGHT FROM {selectedAirport.iata}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
