import fs from 'fs';
import path from 'path';
import { Airport, MetarObservation, FlightRecord, AirportActivity, GraphNode, GraphEdge } from './types';
import { addLog } from './logger';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const MODELS_DIR = path.resolve(process.cwd(), 'models');

class DataService {
  private airports: Airport[] = [];
  private metarObservations: MetarObservation[] = [];
  private flights: FlightRecord[] = [];
  private flightSummary: {
    total_flights: number;
    sampled_flights: number;
    delay_buckets: { label: string; count: number; color: string }[];
    carrier_performance: { carrier: string; total: number; onTimePct: number; avgDelayMin: number }[];
    source: string;
  } | null = null;
  private airportActivity: AirportActivity[] = [];
  private graphNodes: Record<string, GraphNode> = {};
  private graphEdges: GraphEdge[] = [];
  private modelMetrics: any = null;
  private featureSchema: any = null;
  private isLoaded = false;

  constructor() {
    this.loadAll();
  }

  public loadAll() {
    try {
      // 1. Airports
      const airportsPath = path.join(DATA_DIR, 'raw', 'airports', 'airports.json');
      if (fs.existsSync(airportsPath)) {
        this.airports = JSON.parse(fs.readFileSync(airportsPath, 'utf-8'));
      }

      // 2. Weather
      const weatherPath = path.join(DATA_DIR, 'raw', 'weather', 'metar_observations.json');
      if (fs.existsSync(weatherPath)) {
        this.metarObservations = JSON.parse(fs.readFileSync(weatherPath, 'utf-8'));
      }

      // 3. Flights
      const flightsPath = path.join(DATA_DIR, 'raw', 'flights', 'bts_historical_flights.json');
      if (fs.existsSync(flightsPath)) {
        this.flights = JSON.parse(fs.readFileSync(flightsPath, 'utf-8'));
      }

      const kaggleSamplePath = path.join(DATA_DIR, 'processed', 'kaggle_flight_sample.json');
      const kaggleSummaryPath = path.join(DATA_DIR, 'processed', 'kaggle_flight_summary.json');
      const useKaggleDataset = process.env.AEROROUTE_USE_KAGGLE_DATA === 'true';
      if (useKaggleDataset && fs.existsSync(kaggleSamplePath) && fs.existsSync(kaggleSummaryPath)) {
        this.flights = JSON.parse(fs.readFileSync(kaggleSamplePath, 'utf-8'));
        this.flightSummary = JSON.parse(fs.readFileSync(kaggleSummaryPath, 'utf-8'));
      } else if (useKaggleDataset) {
        addLog('ERROR', 'DATABASE', 'Kaggle dataset mode is enabled, but imported sample and summary files are missing.');
      } else {
        addLog('INFO', 'DATABASE', 'Using bundled demo flight records; Kaggle dataset mode is disabled.');
      }

      // 4. Congestion / Activity
      const activityPath = path.join(DATA_DIR, 'processed', 'airport_activity.json');
      if (fs.existsSync(activityPath)) {
        this.airportActivity = JSON.parse(fs.readFileSync(activityPath, 'utf-8'));
      }

      // 5. Network Graph
      const graphPath = path.join(DATA_DIR, 'processed', 'network_graph.json');
      if (fs.existsSync(graphPath)) {
        const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
        this.graphNodes = graphData.nodes || {};
        this.graphEdges = graphData.edges || [];
      }

      // 6. Model Metrics & Schema
      const metricsPath = path.join(MODELS_DIR, 'model_metrics.json');
      if (fs.existsSync(metricsPath)) {
        this.modelMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
      }

      const schemaPath = path.join(MODELS_DIR, 'feature_schema.json');
      if (fs.existsSync(schemaPath)) {
        this.featureSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      }

      // Enrich airports with weather risk & congestion
      this.airports = this.airports.map((ap) => {
        const weather = this.metarObservations.find((w) => w.station === ap.icao || w.station === `K${ap.iata}`);
        const act = this.airportActivity.find((a) => a.airport === ap.iata);
        return {
          ...ap,
          weather_risk: weather ? weather.composite_risk_score : 15.0,
          congestion_index: act ? act.derived_congestion_index : 40.0,
          congestion_band: act ? act.congestion_band : 'Moderate',
        };
      });

      this.isLoaded = true;
      addLog(
        'INFO',
        'DATABASE',
        `Loaded ${this.airports.length} airports, ${this.flights.length} flights, and graph with ${Object.keys(this.graphNodes).length} nodes and ${this.graphEdges.length} edges`
      );
    } catch (err: any) {
      addLog('ERROR', 'DATABASE', `Failed to load datasets: ${err.message}`);
    }
  }

  public getAirports(): Airport[] {
    return this.airports;
  }

  public getAirportByIata(iata: string): Airport | undefined {
    return this.airports.find((a) => a.iata.toUpperCase() === iata.toUpperCase());
  }

  public getWeatherObservations(): MetarObservation[] {
    return this.metarObservations;
  }

  public getWeatherByCode(code: string): MetarObservation | undefined {
    const clean = code.toUpperCase();
    return this.metarObservations.find(
      (w) => w.station === clean || w.station === `K${clean}` || w.station.endsWith(clean)
    );
  }

  public getAirportActivity(): AirportActivity[] {
    return this.airportActivity;
  }

  public getActivityByIata(iata: string): AirportActivity | undefined {
    return this.airportActivity.find((a) => a.airport.toUpperCase() === iata.toUpperCase());
  }

  public getFlights(params?: {
    carrier?: string;
    origin?: string;
    dest?: string;
    status?: string;
    severity?: number;
  }): FlightRecord[] {
    let list = this.flights;
    if (!params) return list;

    if (params.carrier) {
      list = list.filter((f) => f.carrier.toUpperCase() === params.carrier!.toUpperCase());
    }
    if (params.origin) {
      list = list.filter((f) => f.origin.toUpperCase() === params.origin!.toUpperCase());
    }
    if (params.dest) {
      list = list.filter((f) => f.dest.toUpperCase() === params.dest!.toUpperCase());
    }
    if (params.status) {
      list = list.filter((f) => f.status.toUpperCase() === params.status!.toUpperCase());
    }
    if (params.severity !== undefined) {
      list = list.filter((f) => f.delay_severity_class === params.severity);
    }
    return list;
  }

  public getFlightByRecordId(recordId: string): FlightRecord | undefined {
    return this.flights.find((flight) => flight.record_id === recordId);
  }

  public getFlightSummary() {
    return this.flightSummary;
  }

  public getGraphData(): { nodes: Record<string, GraphNode>; edges: GraphEdge[] } {
    return {
      nodes: this.graphNodes,
      edges: this.graphEdges,
    };
  }

  public getModelMetrics() {
    return this.modelMetrics;
  }

  public getFeatureSchema() {
    return this.featureSchema;
  }

  public isReady(): boolean {
    return this.isLoaded;
  }
}

export const dataService = new DataService();
