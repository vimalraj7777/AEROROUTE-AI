export interface Airport {
  iata: string;
  icao: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  elevation_ft: number;
  timezone: string;
  runways?: number;
  hub_carrier?: string;
  weather_risk?: number;
  congestion_index?: number;
  congestion_band?: string;
}

export interface MetarObservation {
  station: string;
  timestamp_utc: string;
  raw_metar: string;
  wind_dir: number;
  wind_speed_kt: number;
  wind_gust_kt: number;
  visibility_sm: number;
  temp_c: number;
  dewpoint_c: number;
  altimeter_inhg: number;
  ceiling_ft: number;
  flight_category: 'VFR' | 'MVFR' | 'IFR' | 'LIFR';
  phenomena: string;
  composite_risk_score: number;
}

export interface FlightRecord {
  record_id?: string;
  fl_date: string;
  carrier: string;
  carrier_name: string;
  flight_num: number;
  origin: string;
  dest: string;
  crs_dep_time: number;
  dep_time: number;
  dep_delay: number;
  crs_arr_time: number;
  arr_time: number;
  arr_delay: number;
  cancelled: number;
  diverted: number;
  air_time: number;
  distance: number;
  carrier_delay: number;
  weather_delay: number;
  nas_delay: number;
  late_aircraft_delay: number;
  delay_severity_class: number;
  status: string;
}

export interface AirportActivity {
  airport: string;
  name: string;
  hourly_departures: number;
  hourly_arrivals: number;
  total_operations: number;
  runway_capacity: number;
  load_factor: number;
  derived_congestion_index: number;
  congestion_band: 'Low' | 'Moderate' | 'High' | 'Severe';
  trend: 'increasing' | 'stable' | 'decreasing';
  ground_delay_program: boolean;
  avg_taxi_out_min: number;
}

export interface GraphNode {
  iata: string;
  icao: string;
  name: string;
  lat: number;
  lon: number;
  region: string;
  weather_risk: number;
  congestion_index: number;
  elevation_ft: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  distance_nm: number;
  base_time_min: number;
  delay_risk: number;
  weather_risk: number;
  congestion_risk: number;
}

export interface RouteWeights {
  distance: number;
  time: number;
  weather: number;
  congestion: number;
  delayRisk: number;
}

export interface RouteOptimizationResult {
  algorithm: string;
  path: string[];
  waypoints: GraphNode[];
  totalScore: number;
  metrics: {
    totalDistanceNm: number;
    estimatedTimeMin: number;
    weatherRiskScore: number;
    delayRiskScore: number;
    congestionRiskScore: number;
    fuelProxyGal: number;
  };
  componentCosts: {
    distanceCost: number;
    timeCost: number;
    weatherCost: number;
    congestionCost: number;
    delayRiskCost: number;
  };
  exploredNodeCount: number;
  executionTimeMs: number;
  explanation: string[];
}

export interface RouteRecommendationResponse {
  recommended: RouteOptimizationResult;
  alternatives: RouteOptimizationResult[];
  benchmark?: {
    dijkstraExplored: number;
    dijkstraTimeMs: number;
    astarExplored: number;
    astarTimeMs: number;
    efficiencyGainPct: number;
  };
  weights: RouteWeights;
  timestamp: string;
}

export interface PredictionResult {
  predictedClassId: number;
  predictedLabel: string;
  statusCode: string;
  confidence: number;
  modelName?: string;
  expectedDelayMinutes?: number;
  delayRiskScore?: number;
  classProbabilities: {
    classId: number;
    label: string;
    code: string;
    probability: number;
  }[];
  contributingFeatures: {
    feature: string;
    displayName: string;
    impact: 'increases_delay' | 'reduces_delay' | 'neutral';
    weight: number;
    value: number | string;
  }[];
  timestamp: string;
}

export interface SystemHealthData {
  system_status: string;
  timestamp: string;
  uptime_seconds: number;
  subsystems: Record<string, { status: string; [key: string]: any }>;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  subsystem: string;
  message: string;
}
