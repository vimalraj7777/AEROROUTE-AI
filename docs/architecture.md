# AeroRoute AI — System Architecture

## Overview
AeroRoute AI is an academic aviation operations-intelligence and route-optimization decision-support prototype. It integrates:
1. **Historical Flight Delay Context**: Bundled flight records and metric artifacts attributed to U.S. DOT BTS TranStats.
2. **Environmental & Meteorological Constraints**: Bundled METAR observations transformed into demonstration risk metrics.
3. **Operational Context & Airport Congestion**: Transparently derived runway and terminal airspace load indices.
4. **Graph-Based Route Optimization**: Custom implementations of Dijkstra and A* shortest-path algorithms optimizing a multi-objective cost function.
5. **Aviation Command Center UI**: High-density aerospace operations terminal built with React, TypeScript, Tailwind CSS, Leaflet, and Recharts.

---

## Academic Safety Boundary & Disclaimer
> **CRITICAL DISCLAIMER**: AeroRoute AI is strictly an **academic decision-support prototype**. It is **NOT certified aviation software**. It does not possess air-traffic-control (ATC) authority, operational flight-dispatch clearance, or certified avionics guarantees. All generated paths, risk indices, and predictions are decision-support estimates.

---

## End-to-End Pipeline
```
[ BTS On-Time Data ] ────┐
[ NOAA METAR Data  ] ────┼──> [ Ingestion & Cleaning ] ──> [ Feature Engineering ]
[ FAA Airport Hubs ] ────┘             │                                │
                                       ▼                                ▼
                          [ Airspace Network Graph ]         [ Delay Risk Scoring ]
                                       │                                │
                                       ▼                                ▼
                          [ Dijkstra & A* Engines ] ◄── [ Multi-Objective Weights ]
                                       │
                                       ▼
                       [ Route Recommendation Engine ]
                                       │
                                       ▼
                          [ Full-Stack REST API ]
                                       │
                                       ▼
                     [ Tactical Command Center Frontend ]
```

---

## Core Components
- **Data Layer**: Bundled JSON snapshots for flights, airport coordinates, METAR observations, congestion, and graph data.
- **Delay Scoring**: A trained XGBoost gradient-boosted classifier (active) plus a Random Forest alternate for 5 tiers: On-Time ($\le 0$m), Minor (1–15m), Moderate (16–45m), Severe (>45m), and Cancelled/Diverted. Models are trained by `scripts/train_delay_model.py` on BTS On-Time + METAR data and executed in-process from portable JSON (`backend/mlEngine.ts`). The predicted delay risk is also fed into the routing edge cost, and `models/model_metrics.json` holds a reproducible held-out evaluation.
- **Routing Engine**:
  - `Dijkstra`: Exhaustive lowest-cost path with full cost accounting.
  - `A*`: Heuristic-guided search utilizing admissible Haversine great-circle distance.
- **Cost Function Formulation**:
  $$C(e) = w_d \cdot D_{\text{norm}} + w_t \cdot T_{\text{norm}} + w_w \cdot W_{\text{norm}} + w_c \cdot C_{\text{norm}} + w_r \cdot R_{\text{norm}}$$
- **Frontend Command Terminal**: Dark graphite `#0b0f17`, cyan/sky blue telemetry, zero-pill metadata typography, Leaflet interactive waypoint mapping, and Recharts operational analytics.
