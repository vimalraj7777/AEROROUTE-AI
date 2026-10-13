import React, { useState, useEffect } from 'react';
import {
  Cpu,
  BarChart2,
  CheckCircle2,
  Sliders,
  Zap,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';
import { Airport, PredictionResult } from '../types';

export const ModelIntelligencePage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);

  // Prediction Simulator State
  const [simCarrier, setSimCarrier] = useState('UA');
  const [simOrigin, setSimOrigin] = useState('ORD');
  const [simDest, setSimDest] = useState('EWR');
  const [simHour, setSimHour] = useState(17);
  const [simDay, setSimDay] = useState(5);
  const [simOriginWx, setSimOriginWx] = useState(65);
  const [simDestWx, setSimDestWx] = useState(35);
  const [simOriginCong, setSimOriginCong] = useState(85);

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    async function loadModelData() {
      try {
        const [metRes, apRes] = await Promise.all([
          api.getModelMetrics(),
          api.getAirports(),
        ]);
        setMetrics(metRes);
        setAirports(apRes.airports);
        handlePredict(simCarrier, simOrigin, simDest, simHour, simDay, simOriginWx, simDestWx, simOriginCong);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadModelData();
  }, []);

  const handlePredict = async (
    c = simCarrier,
    orig = simOrigin,
    dest = simDest,
    h = simHour,
    d = simDay,
    ow = simOriginWx,
    dw = simDestWx,
    oc = simOriginCong
  ) => {
    setPredicting(true);
    try {
      const res = await api.predictDelay({
        carrier: c,
        origin: orig,
        dest: dest,
        departure_hour_utc: h,
        day_of_week: d,
        origin_weather_risk: ow,
        dest_weather_risk: dw,
        origin_congestion_index: oc,
      });
      setPrediction(res);
    } catch (err) {
      console.error(err);
    } finally {
      setPredicting(false);
    }
  };

  if (loading || !metrics) {
    return <div className="p-8 text-cyan-400 font-mono text-xs">LOADING MODEL ARTIFACTS...</div>;
  }

  const baseAcc = metrics.baseline_comparison?.baseline_majority_accuracy ?? 0;
  const accDeltaPct = Math.round((metrics.overall_metrics.accuracy - baseAcc) * 1000) / 10;
  const comparison = metrics.model_comparison ?? null;

  return (
    <div className="p-5 sm:p-8 lg:p-10 space-y-7 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
              DELAY MODEL METRICS & SCORING
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
              TRAINED XGBOOST + RANDOM FOREST
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Trained on real BTS On-Time Performance and METAR weather records. The metrics below are held-out evaluation results, and the prediction endpoint runs the exported tree ensemble in-process.
          </p>
        </div>

        <div className="text-xs font-mono text-cyan-400 border border-cyan-500/20 px-3 py-1.5 rounded bg-cyan-950/30">
          {metrics.model_name} · {Math.round(metrics.overall_metrics.accuracy * 1000) / 10}% accuracy
        </div>
      </div>

      {/* Top Spec Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
        <div className="bg-[#0c121d] border border-slate-800 p-4 rounded">
          <div className="text-xs text-slate-500">HELD-OUT TEST ACCURACY</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            {Math.round(metrics.overall_metrics.accuracy * 1000) / 10}%
          </div>
          <div className={`text-[10px] mt-1 ${accDeltaPct >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {accDeltaPct >= 0 ? '+' : ''}{accDeltaPct} pts vs {Math.round(baseAcc * 100)}% majority baseline
          </div>
        </div>

        <div className="bg-[#0c121d] border border-slate-800 p-4 rounded">
          <div className="text-xs text-slate-500">MACRO F1 SCORE</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {metrics.overall_metrics.macro_f1}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Weighted F1: {metrics.overall_metrics.weighted_f1}</div>
        </div>

        <div className="bg-[#0c121d] border border-slate-800 p-4 rounded">
          <div className="text-xs text-slate-500">TRAINING CORPUS SIZE</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {metrics.training_sample_count.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">rows</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{metrics.training_period}</div>
        </div>

        <div className="bg-[#0c121d] border border-slate-800 p-4 rounded">
          <div className="text-xs text-slate-500">HELD-OUT EVALUATION</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            {metrics.validation_sample_count?.toLocaleString()} rows
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{metrics.split_strategy}</div>
        </div>
      </div>

      {/* Model Comparison */}
      {comparison && (
        <div className="bg-[#0c121d] border border-slate-800 rounded p-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-3">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              Ensemble Model Comparison
            </h2>
            <span className="text-[10px] font-mono text-slate-500">
              selected: {comparison.selected}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            {([
              { key: 'xgboost', label: 'XGBoost Gradient-Boosted Trees' },
              { key: 'random_forest', label: 'Random Forest (Bagged Trees)' },
            ] as const).map((m) => {
              const row = comparison[m.key];
              const isActive = comparison.selected === m.key;
              return (
                <div
                  key={m.key}
                  className={`p-3 rounded border ${isActive ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-slate-800 bg-slate-900/40'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold ${isActive ? 'text-cyan-300' : 'text-slate-300'}`}>
                      {m.label}
                    </span>
                    {isActive && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                    <span>Accuracy</span>
                    <span className="text-slate-200">{Math.round(row.accuracy * 1000) / 10}%</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Macro F1</span>
                    <span className="text-slate-200">{row.macro_f1}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Log Loss</span>
                    <span className="text-slate-200">{row.log_loss}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Flight Delay Prediction Simulator */}
      <div className="bg-[#0c121d] border border-cyan-500/30 rounded p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-100">
                DELAY RISK SCORING SIMULATOR
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                Adjust flight, weather, and congestion inputs to run the deterministic scoring endpoint.
              </p>
            </div>
          </div>
          <button
            onClick={() => handlePredict()}
            disabled={predicting}
            className="px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold transition-colors cursor-pointer"
          >
            {predicting ? 'INFERRING...' : 'RUN INFERENCE'}
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div>
            <label className="text-slate-400 block mb-1">CARRIER</label>
            <select
              value={simCarrier}
              onChange={(e) => {
                setSimCarrier(e.target.value);
                handlePredict(e.target.value, simOrigin, simDest, simHour, simDay, simOriginWx, simDestWx, simOriginCong);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
            >
              <option value="DL">Delta (DL)</option>
              <option value="AA">American (AA)</option>
              <option value="UA">United (UA)</option>
              <option value="WN">Southwest (WN)</option>
              <option value="AS">Alaska (AS)</option>
              <option value="B6">JetBlue (B6)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">ORIGIN HUB</label>
            <select
              value={simOrigin}
              onChange={(e) => {
                setSimOrigin(e.target.value);
                handlePredict(simCarrier, e.target.value, simDest, simHour, simDay, simOriginWx, simDestWx, simOriginCong);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
            >
              {airports.map((a) => (
                <option key={a.iata} value={a.iata}>
                  {a.iata} ({a.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">DESTINATION HUB</label>
            <select
              value={simDest}
              onChange={(e) => {
                setSimDest(e.target.value);
                handlePredict(simCarrier, simOrigin, e.target.value, simHour, simDay, simOriginWx, simDestWx, simOriginCong);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
            >
              {airports.map((a) => (
                <option key={a.iata} value={a.iata}>
                  {a.iata} ({a.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">DEPARTURE HOUR (UTC)</label>
            <select
              value={simHour}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSimHour(val);
                handlePredict(simCarrier, simOrigin, simDest, val, simDay, simOriginWx, simDestWx, simOriginCong);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00 UTC
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sliders for Context */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs pt-2 border-t border-slate-800">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-400">Origin METAR Risk:</span>
              <span className="text-amber-400 font-bold">{simOriginWx} / 100</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={simOriginWx}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSimOriginWx(val);
                handlePredict(simCarrier, simOrigin, simDest, simHour, simDay, val, simDestWx, simOriginCong);
              }}
              className="w-full accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-400">Dest METAR Risk:</span>
              <span className="text-amber-400 font-bold">{simDestWx} / 100</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={simDestWx}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSimDestWx(val);
                handlePredict(simCarrier, simOrigin, simDest, simHour, simDay, simOriginWx, val, simOriginCong);
              }}
              className="w-full accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-400">Terminal Airspace Load:</span>
              <span className="text-purple-400 font-bold">{simOriginCong}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={simOriginCong}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSimOriginCong(val);
                handlePredict(simCarrier, simOrigin, simDest, simHour, simDay, simOriginWx, simDestWx, val);
              }}
              className="w-full accent-purple-400"
            />
          </div>
        </div>

        {/* Prediction Results Display */}
        {prediction && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded border border-slate-800 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  PREDICTED CLASSIFICATION OUTCOME
                </span>
                <span className="text-lg font-bold text-cyan-300">
                  {prediction.predictedLabel}
                </span>
                {prediction.modelName && (
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    engine: {prediction.modelName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-6 text-right">
                {prediction.expectedDelayMinutes !== undefined && (
                  <div>
                    <span className="text-[10px] text-slate-500 block">EXPECTED DELAY</span>
                    <span className="text-lg font-bold text-amber-400">
                      {prediction.expectedDelayMinutes} min
                    </span>
                  </div>
                )}
                {prediction.delayRiskScore !== undefined && (
                  <div>
                    <span className="text-[10px] text-slate-500 block">DELAY RISK</span>
                    <span className="text-lg font-bold text-rose-400">
                      {Math.round(prediction.delayRiskScore * 100)}%
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-500 block">MODEL CONFIDENCE</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {Math.round(prediction.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Softmax Score Breakdown */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="text-slate-400 text-[11px] mb-1">
                Class Score Probabilities:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {prediction.classProbabilities.map((c) => (
                  <div key={c.classId} className="bg-slate-900/40 p-2 rounded border border-slate-850">
                    <div className="text-[10px] text-slate-400 truncate">{c.label}</div>
                    <div className="text-sm font-bold text-slate-200 mt-1">
                      {Math.round(c.probability * 100)}%
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded mt-1.5 overflow-hidden">
                      <div
                        className={`h-full ${c.classId === prediction.predictedClassId ? 'bg-cyan-400' : 'bg-slate-600'}`}
                        style={{ width: `${c.probability * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Attribution (Waterfall) */}
            <div className="space-y-1 font-mono text-xs pt-2">
              <div className="text-slate-400 text-[11px] mb-1.5 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Scoring Factors (Top Impact Contributors):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {prediction.contributingFeatures.map((f, i) => (
                  <div key={i} className="bg-slate-900/50 p-2 rounded border border-slate-800 flex justify-between items-center text-[11px]">
                    <span className="text-slate-300">{f.displayName}</span>
                    <span
                      className={`font-bold ${
                        f.impact === 'increases_delay'
                          ? 'text-rose-400'
                          : f.impact === 'reduces_delay'
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {f.impact === 'increases_delay' ? '+Risk' : f.impact === 'reduces_delay' ? '-Risk' : 'Neutral'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confusion Matrix & Feature Importance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix */}
        <div className="bg-[#0c121d] border border-slate-800 rounded p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              Evaluation Confusion Matrix
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              Test Split (N={metrics.validation_sample_count?.toLocaleString()})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center font-mono text-xs">
              <thead>
                <tr className="text-slate-500 text-[10px]">
                  <th className="py-1">Actual \ Pred</th>
                  {metrics.confusion_matrix_labels.map((l: string) => (
                    <th key={l} className="py-1 px-1">
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {metrics.confusion_matrix.map((row: number[], i: number) => (
                  <tr key={i} className="text-slate-300">
                    <td className="py-2 text-[10px] font-bold text-slate-400 text-left">
                      {metrics.confusion_matrix_labels[i]}
                    </td>
                    {row.map((cell: number, j: number) => {
                      const isDiag = i === j;
                      return (
                        <td
                          key={j}
                          className={`py-2 px-1 ${
                            isDiag ? 'bg-cyan-950/40 font-bold text-cyan-300' : 'text-slate-500'
                          }`}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Importance */}
        <div className="bg-[#0c121d] border border-slate-800 rounded p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              Global Feature Importance
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Normalized split gain (active model)</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {metrics.feature_importance.map((f: any) => (
              <div key={f.feature} className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">{f.feature}</span>
                  <span className="text-cyan-400">{Math.round(f.importance * 100)}%</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden border border-slate-800">
                  <div
                    className="bg-cyan-500 h-full"
                    style={{ width: `${f.importance * 100 * 3.5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
