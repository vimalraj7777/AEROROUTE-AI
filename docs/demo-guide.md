# AeroRoute AI — Evaluation & Demo Walkthrough Guide

## Recommended 5-Minute Evaluation Walkthrough

### Step 1: Open Dashboard (`/dashboard`)
- Observe the National Airspace Overview and its local snapshot data.
- Review the airport, stored weather-risk, derived congestion, and reported metric-artifact cards.
- View the example corridor drawn on the airport map.

### Step 2: Route Optimizer (`/routes`)
- Select City Pair: `JFK` to `SFO`.
- Select Objective Preset: Click **"Avoid Weather"** — notice how the weights shift automatically to 55% Weather Risk.
- Click **"RUN OPTIMIZATION"**.
- Inspect the **Recommended Primary Corridor**:
  - Waypoints path, distance in NM, estimated flight time, fuel proxy (gal), and weather risk score.
  - Review the **Explainable Decision Factors** panel explaining why this path was selected.
  - Compare the **Algorithm Benchmark** showing explored node count for Dijkstra vs A* and the resulting search space efficiency gain (+%).

### Step 3: Flight Intelligence (`/flights`)
- Search or filter flights by carrier (e.g., `UA` or `DL`).
- Click any flight row to inspect the detail drawer:
  - Delay causes decomposition (Weather delay vs NAS delay vs Carrier delay).
  - Weather context at origin & destination stations.
  - Model classification verdict.

### Step 4: Network Map & Hub Telemetry (`/network`)
- Explore the interactive Leaflet map with 21 route-graph nodes and 60 directed corridors.
- Click any hub node (e.g., `ORD`, `DFW`, `ATL`, `LAX`) to inspect its detailed operational card (METAR report, wind/gusts, runway load factor, congestion band).

### Step 5: Weather Intelligence (`/weather`)
- Inspect stored METAR observations and the 4 risk component cards: Surface Winds, Visibility, Cloud Ceiling, and Phenomena penalty.

### Step 6: Model Metrics & Scoring Simulator (`/model`)
- Review the trained-model metrics, including held-out accuracy, the model-comparison panel, confusion matrix, and feature importance.
- Use the **Delay Risk Scoring Simulator**:
  - Change carrier to `UA`, departure hour to `18:00 UTC`, and origin weather risk to `70`.
  - Observe the trained model's class probabilities, expected delay minutes, delay-risk score, and occlusion-based scoring-factor explanations.

### Step 7: System Health & Observability (`/system`)
- Check Express API status and which local JSON snapshots and engines loaded. This is not a SQLite store or live NOAA/BTS feed.
- Inspect the in-memory structured logs; the page polls health and logs every 15 seconds.
