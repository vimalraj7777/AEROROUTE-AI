import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { dataService } from './backend/dataService';
import { routingEngine } from './backend/routingEngine';
import { mlEngine } from './backend/mlEngine';
import { addLog, getLogs } from './backend/logger';

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json());

// API Endpoints
// Phase 1 Required Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    application: 'AeroRoute AI',
    version: '1.4.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    academic_disclaimer: 'Academic aviation operations-intelligence decision-support prototype. Not certified aviation software.',
  });
});

// Airports
app.get('/api/airports', (req, res) => {
  res.json({
    count: dataService.getAirports().length,
    airports: dataService.getAirports(),
  });
});

// Weather
app.get('/api/weather/summary', (req, res) => {
  const weather = dataService.getWeatherObservations();
  const vfrCount = weather.filter((w) => w.flight_category === 'VFR').length;
  const ifrCount = weather.filter((w) => w.flight_category === 'IFR' || w.flight_category === 'LIFR').length;
  const avgRisk = Math.round((weather.reduce((acc, w) => acc + w.composite_risk_score, 0) / (weather.length || 1)) * 10) / 10;

  res.json({
    total_stations: weather.length,
    vfr_count: vfrCount,
    ifr_count: ifrCount,
    average_risk_score: avgRisk,
    observations: weather,
  });
});

app.get('/api/weather/:code', (req, res) => {
  const code = req.params.code;
  const obs = dataService.getWeatherByCode(code);
  if (!obs) {
    return res.status(404).json({ error: `Weather observation for station ${code} not found.` });
  }
  res.json(obs);
});

app.get('/api/weather/risk/:code', (req, res) => {
  const code = req.params.code;
  const obs = dataService.getWeatherByCode(code);
  if (!obs) {
    return res.status(404).json({ error: `Station ${code} not found.` });
  }

  const windRisk = Math.min(100, Math.round(obs.wind_speed_kt * 2.5 + obs.wind_gust_kt * 1.5));
  const visRisk = obs.visibility_sm < 3 ? 80 : obs.visibility_sm < 5 ? 45 : 10;
  const ceilingRisk = obs.ceiling_ft < 1000 ? 90 : obs.ceiling_ft < 3000 ? 50 : 15;

  res.json({
    station: obs.station,
    composite_risk_score: obs.composite_risk_score,
    flight_category: obs.flight_category,
    breakdown: {
      wind_risk: windRisk,
      visibility_risk: visRisk,
      ceiling_risk: ceilingRisk,
      phenomena_penalty: obs.phenomena !== 'None' ? 25 : 0,
    },
    raw_metar: obs.raw_metar,
    timestamp: obs.timestamp_utc,
  });
});

// Congestion
app.get('/api/congestion/summary', (req, res) => {
  const activities = dataService.getAirportActivity();
  const sorted = [...activities].sort((a, b) => b.derived_congestion_index - a.derived_congestion_index);
  const avgLoad = Math.round((activities.reduce((acc, a) => acc + a.load_factor, 0) / (activities.length || 1)) * 1000) / 10;

  res.json({
    total_monitored_hubs: activities.length,
    average_nas_load_pct: avgLoad,
    highest_congestion_hub: sorted[0]?.airport || 'ORD',
    airports: sorted,
  });
});

app.get('/api/congestion/:code', (req, res) => {
  const code = req.params.code;
  const act = dataService.getActivityByIata(code);
  if (!act) {
    return res.status(404).json({ error: `Congestion data for ${code} not found.` });
  }
  res.json(act);
});

// Flights Search & Detail
app.get('/api/flights', (req, res) => {
  const { carrier, origin, dest, status, severity } = req.query;
  const flights = dataService.getFlights({
    carrier: carrier as string,
    origin: origin as string,
    dest: dest as string,
    status: status as string,
    severity: severity !== undefined ? Number(severity) : undefined,
  });

  res.json({
    total_count: flights.length,
    dataset_record_count: dataService.getFlightSummary()?.total_flights ?? flights.length,
    is_sampled: Boolean(dataService.getFlightSummary()),
    flights,
  });
});

app.get('/api/flights/detail', (req, res) => {
  const recordId = req.query.record_id;
  if (typeof recordId !== 'string' || !recordId) {
    return res.status(400).json({ error: 'A flight record_id is required.' });
  }
  const flight = dataService.getFlightByRecordId(recordId);
  if (!flight) {
    return res.status(404).json({ error: `Flight record ${recordId} not found.` });
  }

  const originWeather = dataService.getWeatherByCode(flight.origin);
  const destWeather = dataService.getWeatherByCode(flight.dest);
  const originActivity = dataService.getActivityByIata(flight.origin);
  res.json({
    flight,
    context: {
      origin_weather: originWeather,
      dest_weather: destWeather,
      origin_activity: originActivity,
    },
  });
});

app.get('/api/flights/:id', (req, res) => {
  const id = Number(req.params.id);
  const flight = dataService.getFlights().find((f) => f.flight_num === id);
  if (!flight) {
    return res.status(404).json({ error: `Flight ${id} not found.` });
  }

  const originWeather = dataService.getWeatherByCode(flight.origin);
  const destWeather = dataService.getWeatherByCode(flight.dest);
  const originActivity = dataService.getActivityByIata(flight.origin);

  res.json({
    flight,
    context: {
      origin_weather: originWeather,
      dest_weather: destWeather,
      origin_activity: originActivity,
    },
  });
});

// Network Graph
app.get('/api/network/graph', (req, res) => {
  const graph = dataService.getGraphData();
  res.json({
    node_count: Object.keys(graph.nodes).length,
    edge_count: graph.edges.length,
    nodes: graph.nodes,
    edges: graph.edges,
  });
});

// Route Optimization (Dijkstra, A*, Multi-Objective)
app.post('/api/routes/optimize', (req, res) => {
  try {
    const { origin, destination, algorithm, weights } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination airport codes are required.' });
    }

    const result = routingEngine.recommendRoute(
      origin.toUpperCase(),
      destination.toUpperCase(),
      algorithm || 'both',
      weights || { distance: 0.3, time: 0.2, weather: 0.25, congestion: 0.15, delayRisk: 0.1 }
    );

    res.json(result);
  } catch (err: any) {
    addLog('ERROR', 'ROUTING', `Routing failed: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// Model Intelligence & Prediction
app.get('/api/model/metrics', (req, res) => {
  const metrics = dataService.getModelMetrics();
  if (!metrics) {
    return res.status(404).json({ error: 'Model metrics artifact not found.' });
  }
  res.json(metrics);
});

app.get('/api/model/schema', (req, res) => {
  const schema = dataService.getFeatureSchema();
  res.json(schema);
});

app.post('/api/model/predict', (req, res) => {
  try {
    const payload = req.body;
    if (!payload.origin || !payload.dest) {
      return res.status(400).json({ error: 'Origin and destination airport codes are required.' });
    }

    const prediction = mlEngine.predict(payload);
    res.json(prediction);
  } catch (err: any) {
    addLog('ERROR', 'ML', `Prediction failed: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// Analytics Dashboard Aggregates
app.get('/api/analytics/summary', (req, res) => {
  const flights = dataService.getFlights();
  const importedSummary = dataService.getFlightSummary();
  const airports = dataService.getAirports();
  const activities = dataService.getAirportActivity();

  const delayBuckets = importedSummary?.delay_buckets ?? [
    { label: 'On-Time (<=0m)', count: 0, color: '#10b981' },
    { label: 'Minor (1-15m)', count: 0, color: '#38bdf8' },
    { label: 'Moderate (16-45m)', count: 0, color: '#f59e0b' },
    { label: 'Severe (>45m)', count: 0, color: '#ef4444' },
    { label: 'Cancelled', count: 0, color: '#64748b' },
  ];

  if (!importedSummary) flights.forEach((f) => {
    if (f.cancelled === 1) delayBuckets[4].count++;
    else if (f.arr_delay <= 0) delayBuckets[0].count++;
    else if (f.arr_delay <= 15) delayBuckets[1].count++;
    else if (f.arr_delay <= 45) delayBuckets[2].count++;
    else delayBuckets[3].count++;
  });

  const carriers = ['DL', 'AA', 'UA', 'WN', 'AS', 'B6'];
  const carrierStats = importedSummary?.carrier_performance ?? carriers.map((c) => {
    const cFlights = flights.filter((f) => f.carrier === c);
    const onTime = cFlights.filter((f) => f.arr_delay <= 0 && f.cancelled === 0).length;
    const avgDelay = cFlights.length ? Math.round(cFlights.reduce((acc, f) => acc + f.arr_delay, 0) / cFlights.length) : 0;
    return {
      carrier: c,
      total: cFlights.length,
      onTimePct: cFlights.length ? Math.round((onTime / cFlights.length) * 100) : 85,
      avgDelayMin: avgDelay,
    };
  });

  res.json({
    total_flights_analyzed: importedSummary?.total_flights ?? flights.length,
    sampled_flight_records: importedSummary?.sampled_flights ?? flights.length,
    data_source: importedSummary?.source ?? 'Bundled historical flight sample',
    delay_buckets: delayBuckets,
    carrier_performance: carrierStats,
    top_congested_hubs: activities.slice(0, 6),
    airports_monitored: airports.length,
  });
});

// System Observability
app.get('/api/system/health', (req, res) => {
  const isDataReady = dataService.isReady();
  const metrics = dataService.getModelMetrics();
  const graph = dataService.getGraphData();

  res.json({
    system_status: isDataReady ? 'OPERATIONAL' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    subsystems: {
      backend_api: { status: 'OPERATIONAL', latency_ms: 1.2 },
      local_dataset_store: {
        status: isDataReady ? 'OPERATIONAL' : 'UNAVAILABLE',
        storage: 'bundled JSON snapshots loaded in memory',
      },
      bts_flight_dataset: {
        status: isDataReady ? 'OPERATIONAL' : 'UNAVAILABLE',
        records: dataService.getFlightSummary()?.total_flights ?? dataService.getFlights().length,
        sample_records: dataService.getFlights().length,
        sampled: Boolean(dataService.getFlightSummary()),
        source: dataService.getFlightSummary()?.source ?? 'Bundled historical sample',
      },
      metar_snapshot: {
        status: isDataReady ? 'OPERATIONAL' : 'UNAVAILABLE',
        stations: dataService.getWeatherObservations().length,
      },
      delay_scoring_engine: { status: metrics ? 'OPERATIONAL' : 'UNAVAILABLE', model_version: 'v1.4.0' },
      graph_routing_engine: {
        status: Object.keys(graph.nodes).length > 0 ? 'OPERATIONAL' : 'UNAVAILABLE',
        nodes: Object.keys(graph.nodes).length,
        edges: graph.edges.length,
      },
    },
  });
});

app.get('/api/system/logs', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const level = req.query.level as string;
  res.json({ logs: getLogs(limit, level) });
});

// Vite Middleware for Full-Stack dev mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Precompute ML delay-risk for every network edge so the first routing
  // request does not pay the one-time inference cost.
  if (mlEngine.isModelLoaded()) {
    const { edges } = dataService.getGraphData();
    const started = performance.now();
    for (const edge of edges) {
      mlEngine.getEdgeDelayRisk(edge.from, edge.to);
    }
    console.log(
      `[AeroRoute AI] Precomputed ML delay-risk for ${edges.length} network edges ` +
        `in ${Math.round(performance.now() - started)} ms.`
    );
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AeroRoute AI] Full-stack engine listening on http://localhost:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\n[AeroRoute AI] Port ${PORT} is already in use.` +
          `\nClose the process using it, or start with a different port:  $env:PORT=3001; npm run dev\n`,
      );
    } else {
      console.error('[AeroRoute AI] Failed to start server:', err);
    }
    process.exit(1);
  });
}


startServer();
