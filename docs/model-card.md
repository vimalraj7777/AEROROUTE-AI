# AeroRoute AI — Delay-Severity Model Card

> **Runtime note:** The web application loads and executes the exported tree ensemble in-process. `backend/mlEngine.ts` reconstructs XGBoost gradient-boosted trees and a scikit-learn Random Forest from portable JSON (`models/xgboost_model.json`, `models/random_forest_model.json`) and reproduces the Python `predict_proba` output (verified to ~1e-6 absolute error). The metrics below are a reproducible held-out evaluation produced by `scripts/train_delay_model.py` (version 3.0.0).

## Model Overview
- **Active model**: XGBoost Gradient-Boosted Trees (`random_forest` is retained as the alternate)
- **Alternate model**: Random Forest (bagged decision trees)
- **Model version**: 3.0.0
- **Training pipeline**: `scripts/train_delay_model.py`
- **Input features**: 20 engineered features across carrier, route, schedule, weather, congestion, and out-of-fold target-encoded rate factors.
- **Output target**: 5-class delay severity:
  - Class 0: `ON_TIME` ($\le 0$ minutes)
  - Class 1: `MINOR_DELAY` (1 to 15 minutes)
  - Class 2: `MODERATE_DELAY` (16 to 45 minutes)
  - Class 3: `SEVERE_DELAY` (> 45 minutes)
  - Class 4: `CANCELLED_DIVERTED` (Flight cancelled or diverted)

## Training Data
| Source | File | Rows | Notes |
| --- | --- | --- | --- |
| BTS On-Time Performance (Jan 2024) | `data/raw/flights/On_Time_Reporting_Carrier_On_Time_Performance_(1987_present)_2024_1.csv` | 547,271 (110 cols) | All U.S. domestic records for the month |
| IEM METAR/ASOS (Jan 2024) | `data/raw/weather/metar_asos_2024_01.csv` | 18,592 (25 stations) | Nearest-in-time weather joined per flight (origin departure, destination arrival) |
| Airport & congestion reference | `data/raw/airports/airports.json`, `data/processed/airport_activity.json` | 25 airports | Coordinates, timezones, hourly congestion load |

- **Split strategy**: Stratified random split (80/20) — 437,816 train / 109,455 test.
- **Target distribution**: On-Time 57.7%, Minor 15.9%, Moderate 11.5%, Severe 10.9%, Cancelled 4.0%.
- **Encoding (leakage-safe)**: carrier/route/weather rate features are built with out-of-fold (5-fold) smoothed target encoding (`ENCODE_ALPHA_RATE=20`, `ENCODE_ALPHA_CAUSE=50`) so no target information leaks from a row into its own features.
- **Hyperparameter tuning**: `RandomizedSearchCV` with `f1_macro` scoring over stratified 3-fold CV (XGBoost and Random Forest tuned on a 120,000-row subsample).
- **Class weighting**: Square-root of balanced sample weights (mild reweighting to improve minority-class recall without over-sacrificing the dominant on-time class).

## Performance Metrics (Held-Out Test Set, N = 109,455)
| Metric | XGBoost (active) | Random Forest |
| --- | --- | --- |
| Accuracy | **0.5690** | 0.5771 |
| Macro Precision | **0.3559** | 0.3222 |
| Macro Recall | **0.3265** | 0.2736 |
| Macro F1 | **0.3208** | 0.2754 |
| Weighted F1 | **0.5119** | 0.4760 |
| Log Loss | **1.1819** | 1.2199 |

- **Majority-class baseline accuracy**: 0.5770 (always predicting On-Time).
- **Interpretation**: accuracy sits near the baseline because most flights are on time and delay is intrinsically noisy; XGBoost is selected for its materially higher **macro F1** / balanced recall across the four delay tiers. Reported figures are honest held-out results, not an inflated headline number.

### Per-Class Metrics (active XGBoost)
| Class | Precision | Recall | F1 | Support |
| --- | --- | --- | --- | --- |
| On-Time / Early | 0.654 | 0.870 | 0.747 | 63,194 |
| Minor Delay | 0.284 | 0.080 | 0.125 | 17,379 |
| Moderate Delay | 0.252 | 0.116 | 0.159 | 12,617 |
| Severe Delay | 0.322 | 0.260 | 0.288 | 11,885 |
| Cancelled / Diverted | 0.268 | 0.306 | 0.286 | 4,380 |

## Feature Importance (Normalized Split Gain, active XGBoost)
1. `carrier_late_aircraft_rate` (0.093) — late-aircraft / propagated-delay exposure.
2. `carrier_nas_rate` (0.072) — carrier NAS/airspace-attributed delay.
3. `day_of_week` (0.061) and `local_departure_hour` (0.057) — schedule and time-of-day effects.
4. `origin_weather_risk` (0.059) and `origin_ifr_rate` (0.054) — instrument-condition exposure at origin.
5. `carrier_delay_rate` (0.056), `carrier_weather_rate` (0.044), `carrier_origin_delay_rate` (0.045) — carrier punctuality profile.
6. Route-, congestion-, and distance/elapsed-time features contribute the remainder.

## How the Runtime Uses the Model
- `POST /api/model/predict` builds the 20-feature vector from the request plus historical lookups (`models/feature_lookup.json`) and returns class probabilities, an expected delay (minutes), a delay-risk score, and occlusion-based feature attributions.
- The routing engine (`backend/routingEngine.ts`) replaces the static per-edge `delay_risk` with an ML-derived risk (`MLEngine.getEdgeDelayRisk`) averaged over representative carriers/hours, and uses it in both the edge cost and the reported route delay-risk metric.
- Edge risks are cached and precomputed at startup so routing stays sub-10 ms after warm-up.

## Intended Use & Safety Boundary
Intended exclusively for academic demonstration and decision support. Not certified for flight operations dispatch or airline safety clearance.
