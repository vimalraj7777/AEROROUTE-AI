# AeroRoute AI — Data Sources & Provenance

## Data Streams
| Stream | Source Organization | Original / Derived | Access Method | Coverage |
| :--- | :--- | :--- | :--- | :--- |
| **Flights** | U.S. DOT BTS On-Time Performance (TranStats) | Real records, processed locally | Importer `scripts/import_kaggle_flights.py --full` → `data/processed/bts_flights.json.gz` + `bts_flight_summary.json` | 547,271 records for January 2024; 150,557 hub-to-hub flights kept and served in full via the paginated `GET /api/flights` endpoint. Falls back to the bundled 20-record demo when processed files are absent (`AEROROUTE_USE_DEMO_DATA=true` forces demo). |
| **Airports** | FAA / airport reference data | Bundled geospatial snapshot | Local JSON file (`data/raw/airports/`) | 25 hub records; not refreshed from a live service |
| **Weather** | Attributed to NOAA Aviation Weather Center | Bundled METAR snapshot | Local JSON file (`data/raw/weather/`) | Stored observations; not a live METAR stream |
| **Congestion** | AeroRoute derivation | Derived proxy snapshot | Local JSON file (`data/processed/`) | Stored hourly-style proxy values; not live telemetry |

## Data Integrity Guarantees
- **Snapshot Disclosure**: The running app reads processed files bundled with the repository. Provenance labels do not imply a live connection or automatic refresh.
- **Large Flight Dataset**: The importer runs locally against a user-downloaded BTS/Kaggle CSV. It is not a live feed and does not send flight records to Gemini or another AI provider. The committed sample and analytics are derived artifacts.
- **Explicit Proxy Labeling**: Terminal congestion is explicitly identified as a *Derived Congestion Index* based on scheduled runway movements and load factor, not physical gate radar.
- **Temporal Integrity**: Features are constructed strictly looking backward in time; zero future information is leaked into delay training records.
