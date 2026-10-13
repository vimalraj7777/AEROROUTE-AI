# AeroRoute AI — Operational Limitations & Disclaimers

## System Limitations
1. **Academic Decision-Support Prototype**:
   - AeroRoute AI is designed for academic study, research, and algorithmic comparison.
   - It is **not** certified under FAA Part 121, Part 135, or ICAO standards.
   - It must never be used for real-world flight dispatch, in-flight tactical navigation, or ATC instructions.

2. **Graph Simplification**:
   - The bundled routing graph contains 21 nodes and 60 directed corridor edges; the airport map also shows additional airport reference locations.
   - Real-world high-altitude jet airways (e.g., J-routes, Q-routes) and sector-level Special Use Airspace (SUA/MOAs) are aggregated into corridor cost penalties.

3. **Congestion Telemetry**:
   - Airport congestion is derived mathematically from scheduled flight density, runway capacities, and taxi time metrics. It does not measure physical gate sensors or pushback tug positions.

4. **Weather Forecast Horizon**:
   - Current weather features utilize METAR routine observations. Real operations also require convective SIGMETs, TAF terminal aerodrome forecasts, and PIREPs.
5. **Data and Model Freshness**:
   - Flight, airport, weather, congestion, graph, and metric data are bundled local snapshots; no upstream provider is polled.
    - The prediction endpoint loads and executes the trained tree ensemble from `models/*.json`; the reported metrics in `models/model_metrics.json` are a reproducible held-out evaluation produced by `scripts/train_delay_model.py`. Accuracy remains near the majority baseline because delay outcomes are inherently noisy; macro-F1 is the more informative reported metric.
