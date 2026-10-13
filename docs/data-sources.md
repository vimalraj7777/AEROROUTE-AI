# AeroRoute AI — Data Sources & Provenance

## Data Streams
| Stream | Source Organization | Original / Derived | Access Method | Coverage |
| :--- | :--- | :--- | :--- | :--- |
| **Flights** | Bundled U.S. DOT BTS-derived sample | Bundled demo records by default; optional Kaggle import is opt-in | Local JSON file (`data/raw/flights/`); optional importer in `scripts/import_kaggle_flights.py` | Current demo has 20 records; Kaggle outputs are ignored unless `AEROROUTE_USE_KAGGLE_DATA=true` |
| **Airports** | FAA / airport reference data | Bundled geospatial snapshot | Local JSON file (`data/raw/airports/`) | 25 hub records; not refreshed from a live service |
| **Weather** | Attributed to NOAA Aviation Weather Center | Bundled METAR snapshot | Local JSON file (`data/raw/weather/`) | Stored observations; not a live METAR stream |
| **Congestion** | AeroRoute derivation | Derived proxy snapshot | Local JSON file (`data/processed/`) | Stored hourly-style proxy values; not live telemetry |

## Data Integrity Guarantees
- **Snapshot Disclosure**: The running app uses files bundled with the repository unless Kaggle mode is explicitly enabled. Provenance labels do not imply a live connection or automatic refresh.
- **Large Flight Dataset**: The optional Kaggle import runs locally after the user downloads and extracts the dataset. It is disabled by default and does not send flight records to Gemini or another AI provider.
- **Explicit Proxy Labeling**: Terminal congestion is explicitly identified as a *Derived Congestion Index* based on scheduled runway movements and load factor, not physical gate radar.
- **Temporal Integrity**: Features are constructed strictly looking backward in time; zero future information is leaked into delay training records.
