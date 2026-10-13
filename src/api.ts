import {
  Airport,
  MetarObservation,
  FlightRecord,
  AirportActivity,
  RouteRecommendationResponse,
  PredictionResult,
  SystemHealthData,
  LogEntry,
  RouteWeights,
  GraphNode,
  GraphEdge,
} from './types';

export const api = {
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  async getAirports(): Promise<{ count: number; airports: Airport[] }> {
    const res = await fetch('/api/airports');
    return res.json();
  },

  async getWeatherSummary(): Promise<{
    total_stations: number;
    vfr_count: number;
    ifr_count: number;
    average_risk_score: number;
    observations: MetarObservation[];
  }> {
    const res = await fetch('/api/weather/summary');
    return res.json();
  },

  async getWeatherByStation(code: string): Promise<MetarObservation> {
    const res = await fetch(`/api/weather/${code}`);
    if (!res.ok) throw new Error('Station weather not found');
    return res.json();
  },

  async getCongestionSummary(): Promise<{
    total_monitored_hubs: number;
    average_nas_load_pct: number;
    highest_congestion_hub: string;
    airports: AirportActivity[];
  }> {
    const res = await fetch('/api/congestion/summary');
    return res.json();
  },

  async getFlights(filters?: {
    carrier?: string;
    origin?: string;
    dest?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    total_count: number;
    dataset_record_count: number;
    is_sampled: boolean;
    offset: number;
    limit: number;
    flights: FlightRecord[];
  }> {
    const params = new URLSearchParams();
    if (filters?.carrier) params.set('carrier', filters.carrier);
    if (filters?.origin) params.set('origin', filters.origin);
    if (filters?.dest) params.set('dest', filters.dest);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.limit !== undefined) params.set('limit', filters.limit.toString());
    if (filters?.offset !== undefined) params.set('offset', filters.offset.toString());

    const res = await fetch(`/api/flights?${params.toString()}`);
    return res.json();
  },

  async getFlightDetail(id: string | number): Promise<{
    flight: FlightRecord;
    context: {
      origin_weather?: MetarObservation;
      dest_weather?: MetarObservation;
      origin_activity?: AirportActivity;
    };
  }> {
    const url = typeof id === 'string'
      ? `/api/flights/detail?record_id=${encodeURIComponent(id)}`
      : `/api/flights/${id}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Flight not found');
    return res.json();
  },

  async getNetworkGraph(): Promise<{
    node_count: number;
    edge_count: number;
    nodes: Record<string, GraphNode>;
    edges: GraphEdge[];
  }> {
    const res = await fetch('/api/network/graph');
    return res.json();
  },

  async optimizeRoute(params: {
    origin: string;
    destination: string;
    algorithm: 'dijkstra' | 'astar' | 'both';
    weights: RouteWeights;
  }): Promise<RouteRecommendationResponse> {
    const res = await fetch('/api/routes/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Route optimization failed');
    }
    return res.json();
  },

  async getModelMetrics(): Promise<any> {
    const res = await fetch('/api/model/metrics');
    return res.json();
  },

  async predictDelay(payload: {
    carrier: string;
    origin: string;
    dest: string;
    departure_hour_utc: number;
    day_of_week: number;
    origin_weather_risk?: number;
    dest_weather_risk?: number;
    origin_congestion_index?: number;
    dest_congestion_index?: number;
  }): Promise<PredictionResult> {
    const res = await fetch('/api/model/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Prediction failed');
    }
    return res.json();
  },

  async getAnalyticsSummary(): Promise<any> {
    const res = await fetch('/api/analytics/summary');
    return res.json();
  },

  async getSystemHealth(): Promise<SystemHealthData> {
    const res = await fetch('/api/system/health');
    return res.json();
  },

  async getSystemLogs(limit = 40, level?: string): Promise<{ logs: LogEntry[] }> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (level) params.set('level', level);
    const res = await fetch(`/api/system/logs?${params.toString()}`);
    return res.json();
  },
};
