import fs from 'fs';
import path from 'path';
import { PredictionPayload, PredictionResult, GraphEdge } from './types';
import { dataService } from './dataService';
import { addLog } from './logger';

// ---------------------------------------------------------------------------
// Portable model layout (produced by scripts/train_delay_model.py)
//
//   models/model_registry.json      active model + comparison metadata
//   models/feature_lookup.json      historical-rate lookups used to build inputs
//   models/xgboost_model.json       gradient-boosted trees (native layout)
//   models/random_forest_model.json bagged trees (sklearn layout)
//
// XGBoost inference must compare in float32 (Math.fround) to reproduce the
// native booster exactly; Random Forest is float64 and uses `<`.
// ---------------------------------------------------------------------------

interface XgbNode {
  f?: number;
  t?: number;
  l?: number;
  r?: number;
  leaf?: number;
}

interface XgbModel {
  feature_names: string[];
  num_class: number;
  num_rounds: number;
  base_score: number | number[];
  tree_class: number[];
  trees: XgbNode[][];
}

interface RfTree {
  f: number[];
  t: number[];
  l: number[];
  r: number[];
  v: (number | number[])[];
}

interface RfModel {
  feature_names: string[];
  num_class: number;
  n_estimators: number;
  trees: RfTree[];
}

interface FeatureLookup {
  global_delay_rate: number;
  origin_delay_rate: Record<string, number>;
  dest_delay_rate: Record<string, number>;
  carrier_delay_rate: Record<string, number>;
  carrier_weather_rate: Record<string, number>;
  carrier_nas_rate: Record<string, number>;
  carrier_late_aircraft_rate: Record<string, number>;
  route_delay_rate: Record<string, number>;
  weather_risk_by_airport: Record<string, number>;
  ifr_rate_by_airport: Record<string, number>;
  congestion_by_airport: Record<string, number>;
  global_weather_risk: number;
  global_ifr_rate: number;
  global_congestion_index: number;
  feature_means: Record<string, number>;
  feature_medians: Record<string, number>;
}

interface ModelClass {
  id: number;
  code: string;
  label: string;
}

const FALLBACK_CLASSES: ModelClass[] = [
  { id: 0, code: 'ON_TIME', label: 'On-Time / Early (<= 0 min)' },
  { id: 1, code: 'MINOR_DELAY', label: 'Minor Delay (1-15 min)' },
  { id: 2, code: 'MODERATE_DELAY', label: 'Moderate Delay (16-45 min)' },
  { id: 3, code: 'SEVERE_DELAY', label: 'Severe Delay (> 45 min)' },
  { id: 4, code: 'CANCELLED_DIVERTED', label: 'Cancelled / Diverted' },
];

// Representative minutes used to convert a severity distribution into an
// interpretable "expected delay" figure.
const CLASS_MINUTES = [0, 7.5, 30, 75, 90];

const EARTH_RADIUS_NM = 3440.065;

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * EARTH_RADIUS_NM * 10) / 10;
}

export class MLEngine {
  private xgb: XgbModel | null = null;
  private rf: RfModel | null = null;
  private lookup: FeatureLookup | null = null;
  private registry: any = null;
  private featureNames: string[] = [];
  private classes: ModelClass[] = FALLBACK_CLASSES;
  private activeModel: 'xgboost' | 'random_forest' = 'xgboost';
  private modelLoaded = false;
  private edgeRiskCache = new Map<string, number>();

  constructor() {
    this.loadArtifacts();
  }

  private loadArtifacts() {
    const modelsDir = path.resolve(process.cwd(), 'models');
    const readJson = (file: string): any | null => {
      const full = path.join(modelsDir, file);
      if (!fs.existsSync(full)) return null;
      try {
        return JSON.parse(fs.readFileSync(full, 'utf-8'));
      } catch (err: any) {
        addLog('WARN', 'ML', `Failed to parse ${file}: ${err.message}`);
        return null;
      }
    };

    try {
      this.registry = readJson('model_registry.json');
      this.lookup = readJson('feature_lookup.json');
      this.xgb = readJson('xgboost_model.json');
      this.rf = readJson('random_forest_model.json');

      if (this.registry) {
        this.activeModel = this.registry.active_model === 'random_forest' ? 'random_forest' : 'xgboost';
        if (Array.isArray(this.registry.classes) && this.registry.classes.length) {
          this.classes = this.registry.classes.map((c: any) => ({
            id: c.id ?? c.class_id,
            code: c.code,
            label: c.label,
          }));
        }
      }

      if (this.activeModel === 'random_forest' && !this.rf && this.xgb) this.activeModel = 'xgboost';
      if (this.activeModel === 'xgboost' && !this.xgb && this.rf) this.activeModel = 'random_forest';

      this.featureNames =
        this.xgb?.feature_names || this.rf?.feature_names || [];
      this.modelLoaded = Boolean(
        this.lookup && (this.xgb || this.rf) && this.featureNames.length > 0
      );

      if (this.modelLoaded) {
        addLog(
          'INFO',
          'ML',
          `Loaded trained "${this.activeModel}" model (${this.featureNames.length} features, ` +
            `xgboost trees=${this.xgb?.trees.length ?? 0}, rf trees=${this.rf?.trees.length ?? 0})`
        );
      } else {
        addLog('WARN', 'ML', 'Trained model artifacts not found; using heuristic fallback scoring.');
      }
    } catch (err: any) {
      addLog('WARN', 'ML', `Could not load trained models: ${err.message}`);
    }
  }

  public isModelLoaded(): boolean {
    return this.modelLoaded;
  }

  public getActiveModelName(): string {
    const key = this.activeModel;
    return this.registry?.models?.[key]?.display_name ?? key;
  }

  // -------------------------------------------------------------------------
  // Feature construction
  // -------------------------------------------------------------------------

  private mapValue(map: Record<string, number> | undefined, key: string, fallback: number): number {
    if (map && Object.prototype.hasOwnProperty.call(map, key)) return map[key];
    return fallback;
  }

  private featureMean(name: string, fallback = 0): number {
    return this.lookup?.feature_means?.[name] ?? fallback;
  }

  private edgeDistance(from: string, to: string): number | null {
    const { edges } = dataService.getGraphData();
    const edge = edges.find((e: GraphEdge) => e.from === from && e.to === to);
    return edge ? edge.distance_nm : null;
  }

  private buildFeatureVector(payload: PredictionPayload): { vector: number[]; values: Record<string, number> } {
    const lookup = this.lookup!;
    const origin = (payload.origin || '').toUpperCase();
    const dest = (payload.dest || '').toUpperCase();
    const carrier = (payload.carrier || 'AA').toUpperCase();

    const originAp = dataService.getAirportByIata(origin);
    const destAp = dataService.getAirportByIata(dest);

    const globalDelay = lookup.global_delay_rate ?? 12.0;

    let distance: number | null = payload.scheduled_distance_nm ?? null;
    if (distance == null || Number.isNaN(distance)) {
      distance = this.edgeDistance(origin, dest);
    }
    if (distance == null && originAp && destAp) {
      distance = haversineNm(originAp.latitude, originAp.longitude, destAp.latitude, destAp.longitude);
    }
    if (distance == null) distance = this.featureMean('scheduled_distance_nm', 800);

    const values: Record<string, number> = {
      origin_delay_rate: this.mapValue(lookup.origin_delay_rate, origin, globalDelay),
      dest_delay_rate: this.mapValue(lookup.dest_delay_rate, dest, globalDelay),
      carrier_delay_rate: this.mapValue(lookup.carrier_delay_rate, carrier, globalDelay),
      carrier_weather_rate: this.mapValue(lookup.carrier_weather_rate, carrier, 0),
      carrier_nas_rate: this.mapValue(lookup.carrier_nas_rate, carrier, 0),
      carrier_late_aircraft_rate: this.mapValue(lookup.carrier_late_aircraft_rate, carrier, 0),
      route_delay_rate: this.mapValue(lookup.route_delay_rate, `${origin}|${dest}`, globalDelay),
      departure_hour_utc: payload.departure_hour_utc ?? 14,
      day_of_week: payload.day_of_week ?? 3,
      scheduled_distance_nm: distance,
      origin_weather_risk:
        payload.origin_weather_risk ??
        this.mapValue(lookup.weather_risk_by_airport, origin, lookup.global_weather_risk ?? this.featureMean('origin_weather_risk', 20)),
      dest_weather_risk:
        payload.dest_weather_risk ??
        this.mapValue(lookup.weather_risk_by_airport, dest, lookup.global_weather_risk ?? this.featureMean('dest_weather_risk', 20)),
      origin_congestion_index:
        payload.origin_congestion_index ??
        this.mapValue(lookup.congestion_by_airport, origin, lookup.global_congestion_index ?? this.featureMean('origin_congestion_index', 50)),
      dest_congestion_index:
        payload.dest_congestion_index ??
        this.mapValue(lookup.congestion_by_airport, dest, lookup.global_congestion_index ?? this.featureMean('dest_congestion_index', 50)),
      origin_ifr_rate: this.mapValue(lookup.ifr_rate_by_airport, origin, lookup.global_ifr_rate ?? 0.1),
      dest_ifr_rate: this.mapValue(lookup.ifr_rate_by_airport, dest, lookup.global_ifr_rate ?? 0.1),
    };

    const vector = this.featureNames.map((name) => {
      const v = values[name];
      return Number.isFinite(v) ? v : this.featureMean(name, 0);
    });

    return { vector, values };
  }

  // -------------------------------------------------------------------------
  // Inference
  // -------------------------------------------------------------------------

  private softmax(margins: number[]): number[] {
    const max = Math.max(...margins);
    const exps = margins.map((m) => Math.exp(m - max));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    return exps.map((e) => e / sum);
  }

  private xgbPredict(vector: number[]): number[] {
    const model = this.xgb!;
    const base = Array.isArray(model.base_score)
      ? model.base_score.slice()
      : new Array(model.num_class).fill(model.base_score ?? 0);
    const x = vector.map((v) => Math.fround(v));

    for (let k = 0; k < model.trees.length; k++) {
      const tree = model.trees[k];
      const cls = model.tree_class ? model.tree_class[k] : k % model.num_class;
      let node = 0;
      while (tree[node].leaf === undefined) {
        const n = tree[node];
        node = x[n.f!] < Math.fround(n.t!) ? n.l! : n.r!;
      }
      base[cls] += tree[node].leaf!;
    }
    return this.softmax(base);
  }

  private rfPredict(vector: number[]): number[] {
    const model = this.rf!;
    const acc = new Array(model.num_class).fill(0);

    for (const tree of model.trees) {
      let node = 0;
      while (tree.l[node] !== -1) {
        node = vector[tree.f[node]] <= tree.t[node] ? tree.l[node] : tree.r[node];
      }
      const leaf = tree.v[node];
      if (Array.isArray(leaf)) {
        for (let c = 0; c < acc.length; c++) acc[c] += leaf[c];
      } else {
        acc[leaf]++;
      }
    }

    const n = model.trees.length || 1;
    return acc.map((a) => a / n);
  }

  private predictProbs(vector: number[]): number[] {
    if (this.activeModel === 'random_forest' && this.rf) return this.rfPredict(vector);
    if (this.xgb) return this.xgbPredict(vector);
    if (this.rf) return this.rfPredict(vector);
    return new Array(this.classes.length).fill(1 / this.classes.length);
  }

  private expectedMinutes(probs: number[]): number {
    return probs.reduce((acc, p, i) => acc + p * (CLASS_MINUTES[i] ?? 30), 0);
  }

  // Occlusion-based local attribution: replace one feature with its training
  // median and measure the shift in expected delay minutes.
  private explain(vector: number[], origin: string, dest: string, carrier: string): PredictionResult['contributingFeatures'] {
    const medians = this.lookup?.feature_medians ?? {};
    const baseExpected = this.expectedMinutes(this.predictProbs(vector));
    const display: { name: string; label: string; format: (v: number) => string }[] = [
      { name: 'origin_weather_risk', label: `${origin} Weather Severity`, format: (v) => `${v.toFixed(0)}/100` },
      { name: 'dest_weather_risk', label: `${dest} Arrival Meteorology`, format: (v) => `${v.toFixed(0)}/100` },
      { name: 'origin_congestion_index', label: `${origin} Terminal Congestion`, format: (v) => `${v.toFixed(0)}% load` },
      { name: 'carrier_late_aircraft_rate', label: `${carrier} Late-Aircraft Cascade`, format: (v) => `${v.toFixed(1)}m avg` },
      { name: 'carrier_delay_rate', label: `${carrier} Carrier Punctuality`, format: (v) => `${v.toFixed(1)}m avg` },
      { name: 'route_delay_rate', label: 'Route Historical Delay', format: (v) => `${v.toFixed(1)}m avg` },
      { name: 'departure_hour_utc', label: 'Departure Time', format: (v) => `${Math.round(v)}:00 UTC` },
      { name: 'scheduled_distance_nm', label: 'Stage Length', format: (v) => `${Math.round(v)} NM` },
    ];

    const contributions: PredictionResult['contributingFeatures'] = [];
    for (const d of display) {
      const idx = this.featureNames.indexOf(d.name);
      if (idx === -1) continue;
      const occluded = vector.slice();
      occluded[idx] = medians[d.name] ?? vector[idx];
      const delta = baseExpected - this.expectedMinutes(this.predictProbs(occluded));
      const weight = Math.round(delta * 10) / 10;
      contributions.push({
        feature: d.name,
        displayName: d.label,
        impact: delta > 0.5 ? 'increases_delay' : delta < -0.5 ? 'reduces_delay' : 'neutral',
        weight,
        value: d.format(vector[idx]),
      });
    }

    contributions.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    return contributions.slice(0, 6);
  }

  private heuristicProbs(values: Record<string, number>): number[] {
    const weatherFactor = ((values.origin_weather_risk ?? 15) * 0.6 + (values.dest_weather_risk ?? 15) * 0.4) / 100;
    const congestionFactor = ((values.origin_congestion_index ?? 45) * 0.6 + (values.dest_congestion_index ?? 45) * 0.4) / 100;
    const hour = values.departure_hour_utc ?? 14;
    const temporalFactor = hour >= 16 && hour <= 21 ? 0.35 : 0.08;
    const carrierFactor = (values.carrier_delay_rate ?? 13) / 30;
    const logits = [
      2.4 - 2.8 * weatherFactor - 2.2 * congestionFactor - 1.2 * temporalFactor,
      0.8 + 0.9 * weatherFactor + 1.2 * congestionFactor + 0.4 * carrierFactor,
      -0.2 + 1.8 * weatherFactor + 1.6 * congestionFactor + 0.8 * temporalFactor,
      -1.4 + 2.7 * weatherFactor + 2.1 * congestionFactor + 1.1 * temporalFactor,
      -2.8 + 3.2 * weatherFactor + 0.8 * congestionFactor,
    ];
    return this.softmax(logits);
  }

  // -------------------------------------------------------------------------
  // Public prediction API
  // -------------------------------------------------------------------------

  public predict(payload: PredictionPayload): PredictionResult {
    const origin = (payload.origin || '').toUpperCase();
    const dest = (payload.dest || '').toUpperCase();
    const carrier = (payload.carrier || 'AA').toUpperCase();

    let probs: number[];
    let contributions: PredictionResult['contributingFeatures'];

    if (this.modelLoaded) {
      const { vector } = this.buildFeatureVector(payload);
      probs = this.predictProbs(vector);
      contributions = this.explain(vector, origin, dest, carrier);
    } else {
      const { values } = this.buildFeatureVectorFallback(payload, origin, dest);
      probs = this.heuristicProbs(values);
      contributions = this.explainFallback(values, origin, dest, carrier);
    }

    let bestIndex = 0;
    probs.forEach((p, i) => {
      if (p > probs[bestIndex]) bestIndex = i;
    });
    const chosen = this.classes[bestIndex] ?? FALLBACK_CLASSES[bestIndex];
    const confidence = Math.round(probs[bestIndex] * 100) / 100;
    const expectedDelay = Math.round(this.expectedMinutes(probs) * 10) / 10;
    const delayRisk = Math.round((1 - (probs[0] ?? 0)) * 1000) / 1000;

    addLog(
      'INFO',
      'ML',
      `Predicted ${chosen.code} (${Math.round(confidence * 100)}% conf, ~${expectedDelay}m) for ${carrier} ${origin}->${dest}`
    );

    return {
      predictedClassId: chosen.id,
      predictedLabel: chosen.label,
      statusCode: chosen.code,
      confidence,
      modelName: this.modelLoaded ? this.getActiveModelName() : 'Heuristic fallback scorer',
      expectedDelayMinutes: expectedDelay,
      delayRiskScore: delayRisk,
      classProbabilities: this.classes.map((c, i) => ({
        classId: c.id,
        label: c.label,
        code: c.code,
        probability: Math.round((probs[i] ?? 0) * 1000) / 1000,
      })),
      contributingFeatures: contributions,
      timestamp: new Date().toISOString(),
    };
  }

  private buildFeatureVectorFallback(
    payload: PredictionPayload,
    origin: string,
    dest: string
  ): { values: Record<string, number> } {
    const originAp = dataService.getAirportByIata(origin);
    const destAp = dataService.getAirportByIata(dest);
    const values: Record<string, number> = {
      origin_weather_risk: payload.origin_weather_risk ?? originAp?.weather_risk ?? 15,
      dest_weather_risk: payload.dest_weather_risk ?? destAp?.weather_risk ?? 15,
      origin_congestion_index: payload.origin_congestion_index ?? originAp?.congestion_index ?? 45,
      dest_congestion_index: payload.dest_congestion_index ?? destAp?.congestion_index ?? 45,
      departure_hour_utc: payload.departure_hour_utc ?? 14,
      day_of_week: payload.day_of_week ?? 3,
      carrier_delay_rate: 13,
    };
    return { values };
  }

  private explainFallback(
    values: Record<string, number>,
    origin: string,
    dest: string,
    carrier: string
  ): PredictionResult['contributingFeatures'] {
    return [
      {
        feature: 'origin_weather_risk',
        displayName: `${origin} Weather Severity`,
        impact: (values.origin_weather_risk ?? 0) > 40 ? 'increases_delay' : 'reduces_delay',
        weight: Math.round((values.origin_weather_risk ?? 0) * 0.32 * 10) / 10,
        value: `${(values.origin_weather_risk ?? 0).toFixed(1)}/100`,
      },
      {
        feature: 'origin_congestion_index',
        displayName: `${origin} Terminal Congestion`,
        impact: (values.origin_congestion_index ?? 0) > 60 ? 'increases_delay' : 'neutral',
        weight: Math.round((values.origin_congestion_index ?? 0) * 0.28 * 10) / 10,
        value: `${(values.origin_congestion_index ?? 0).toFixed(1)}% load`,
      },
      {
        feature: 'carrier_delay_rate',
        displayName: `${carrier} Carrier Punctuality`,
        impact: 'neutral',
        weight: 0,
        value: `${(values.carrier_delay_rate ?? 0).toFixed(1)}m avg`,
      },
    ];
  }

  // -------------------------------------------------------------------------
  // Edge delay risk (consumed by the routing engine)
  // -------------------------------------------------------------------------

  public getEdgeDelayRisk(from: string, to: string): number {
    const key = `${from}|${to}`;
    const cached = this.edgeRiskCache.get(key);
    if (cached !== undefined) return cached;

    let risk = 0.3;
    if (this.modelLoaded) {
      const carriers = ['AA', 'DL', 'UA', 'WN'];
      const hours = [8, 14, 19];
      let total = 0;
      let count = 0;
      for (const carrier of carriers) {
        for (const hour of hours) {
          const { vector } = this.buildFeatureVector({
            carrier,
            origin: from,
            dest: to,
            departure_hour_utc: hour,
            day_of_week: 3,
          });
          const probs = this.predictProbs(vector);
          total += 1 - (probs[0] ?? 0);
          count++;
        }
      }
      risk = count ? total / count : 0.3;
    } else {
      const { edges } = dataService.getGraphData();
      const edge = edges.find((e: GraphEdge) => e.from === from && e.to === to);
      if (edge) risk = edge.delay_risk;
    }

    risk = Math.min(1, Math.max(0, Math.round(risk * 1000) / 1000));
    this.edgeRiskCache.set(key, risk);
    return risk;
  }

  public clearEdgeRiskCache(): void {
    this.edgeRiskCache.clear();
  }
}

export const mlEngine = new MLEngine();
