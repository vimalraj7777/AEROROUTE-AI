# AeroRoute AI — Delay-Severity Model Card

> **Runtime note:** The web application now loads and executes the exported tree ensemble in-process. `backend/mlEngine.ts` reconstructs XGBoost gradient-boosted trees and a scikit-learn Random Forest from portable JSON (`models/xgboost_model.json`, `models/random_forest_model.json`) and reproduces the Python `predict_proba` output (verified to ~1e-6 absolute error). The metrics below are a reproducible held-out evaluation produced by `scripts/train_delay_model.py`.

## Model Overview
- **Active model**: XGBoost Gradient-Boosted Trees (`random_forest` is retained as the alternate)
- **Alternate model**: Random Forest (bagged decision trees)
- **Model version**: 2.0.0
- **Training pipeline**: `scripts/train_delay_model.py`
- **Input features**: 16 engineered features across carrier, route, schedule, weather, and congestion factors.
- **Output target**: 5-class delay severity:
  - Class 0: `ON_TIME` ($\le 0$ minutes)
  - Class 1: `MINOR_DELAY` (1 to 15 minutes)
  - Class 2: `MODERATE_DELAY` (16 to 45 minutes)
  - Class 3: `SEVERE_DELAY` (> 45 minutes)
  - Class 4: `CANCELLED_DIVERTED` (Flight cancelled or diverted)

## Training Data
| Source | File | Rows | Notes |
| --- | --- | --- | --- |
| BTS On-Time Performance (Jan 2024) | `data/raw/flights/On_Time_Reporting_Carrier_On_Time_Performance_(1987_present)_2024_1.csv` | 547,271 (110 cols) | Filtered to the 24-hub network → 150,557 modelling rows |
| IEM METAR/ASOS (Jan 2024) | `data/raw/weather/metar_asos_2024_01.csv` | 18,592 (25 stations) | Nearest-in-time weather joined per flight (origin departure, destination arrival) |
| Airport & congestion reference | `data/raw/airports/airports.json`, `data/processed/airport_activity.json` | 24 airports | Coordinates, timezones, hourly congestion load |

- **Split strategy**: Stratified random split (80/20) — 120,445 train / 30,112 test.
- **Target distribution**: On-Time 57.2%, Minor 16.1%, Moderate 11.9%, Severe 10.7%, Cancelled 4.1%.
- **Class weighting**: Square-root of balanced sample weights (mild reweighting to improve minority-class recall without over-sacrificing the dominant on-time class).

## Performance Metrics (Held-Out Test Set, N = 30,112)
| Metric | XGBoost (active) | Random Forest |
| --- | --- | --- |
| Accuracy | **0.5607** | 0.5695 |
| Macro Precision | **0.3629** | 0.3325 |
| Macro Recall | **0.3614** | 0.3248 |
| Macro F1 | **0.3457** | 0.2794 |
| Weighted F1 | **0.5175** | 0.4796 |
| Log Loss | **1.1634** | 1.2158 |

- **Majority-class baseline accuracy**: 0.5720 (always predicting On-Time).
- **Interpretation**: accuracy sits near the baseline because most flights are on time and delay is intrinsically noisy; XGBoost is selected for its materially higher **macro F1** / balanced recall across the four delay tiers. Reported figures are honest held-out results, not an inflated headline number.

### Per-Class Metrics (active XGBoost)
| Class | Precision | Recall | F1 | Support |
| --- | --- | --- | --- | --- |
| On-Time / Early | 0.666 | 0.836 | 0.741 | 17,234 |
| Minor Delay | 0.256 | 0.101 | 0.145 | 4,843 |
| Moderate Delay | 0.264 | 0.145 | 0.187 | 3,573 |
| Severe Delay | 0.354 | 0.287 | 0.317 | 3,219 |
| Cancelled / Diverted | 0.276 | 0.438 | 0.338 | 1,243 |

## Feature Importance (Normalized Split Gain, active XGBoost)
1. `carrier_weather_rate` (0.142) — carrier's historical weather-attributed delay.
2. `carrier_late_aircraft_rate` (0.120) — late-aircraft / propagated-delay exposure.
3. `carrier_delay_rate` (0.084) — carrier overall punctuality.
4. `carrier_nas_rate` (0.070) — carrier NAS/airspace-attributed delay.
5. `day_of_week` (0.058) and `origin_ifr_rate` (0.054) — schedule and instrument-condition effects.
6. Route-, weather-, and congestion-rate features contribute the remainder.

## How the Runtime Uses the Model
- `POST /api/model/predict` builds the 16-feature vector from the request plus historical lookups (`models/feature_lookup.json`) and returns class probabilities, an expected delay (minutes), a delay-risk score, and occlusion-based feature attributions.
- The routing engine (`backend/routingEngine.ts`) replaces the static per-edge `delay_risk` with an ML-derived risk (`MLEngine.getEdgeDelayRisk`) averaged over representative carriers/hours, and uses it in both the edge cost and the reported route delay-risk metric.
- Edge risks are cached and precomputed at startup so routing stays sub-10 ms after warm-up.

## Intended Use & Safety Boundary
Intended exclusively for academic demonstration and decision support. Not certified for flight operations dispatch or airline safety clearance.
