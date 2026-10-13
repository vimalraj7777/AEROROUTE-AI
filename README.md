# AeroRoute AI — Aviation Operations & Route Intelligence

> **Academic Aviation Decision-Support Prototype**  
> *Demonstrates graph-based Dijkstra / A\* route optimization and delay-risk scoring using bundled historical flight, weather, airport, and congestion data snapshots.*

---

## 1. Problem Statement
Commercial airline flight dispatch and airspace planning require balancing multiple competing operational objectives:
- **Minimizing route distance and a derived fuel proxy**
- **Accounting for bundled weather-risk observations**
- **Mitigating gate-hold and taxi-out delays at congested hub airspaces**
- **Minimizing historical delay risk**

Traditional flight planning often evaluates these dimensions in isolation. **AeroRoute AI** demonstrates an explainable decision-support engine that models a small airport network as a weighted directed graph, calculates paths using custom **Dijkstra** and **A\*** search, and estimates delay categories with a trained **XGBoost + Random Forest** ensemble whose predicted delay risk also feeds the routing cost function.

---

## 2. Architecture & Pipeline
```
[ BTS On-Time Data ] ────┐
[ NOAA METAR Data  ] ────┼──> [ Ingestion & Cleaning ] ──> [ Feature Engineering ]
[ FAA Airport Hubs ] ────┘             │                                │
                                       ▼                                ▼
                          [ Airspace Network Graph ]         [ Delay ML Model ]
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

## 3. Technology Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Leaflet (interactive maps), Recharts (operational charts), Motion (animated public site).
- **Backend**: Express + TypeScript services, custom Dijkstra and A* pathfinding, and local JSON snapshots loaded in memory.
- **Delay scoring**: A real XGBoost gradient-boosted classifier plus a Random Forest alternate, trained in Python (`scripts/train_delay_model.py`) and executed in-process by the Node backend from portable JSON. See `docs/model-card.md` for held-out metrics.
- **Data Sources**: Bundled historical/sample files attributed to U.S. DOT BTS, NOAA METAR, FAA, and airport reference data. They are not live API feeds.

---

## 4. Directory Structure
```
├── backend/                  # Backend services, graph engine, ML inference & logger
│   ├── types.ts              # Data models & schemas
│   ├── dataService.ts        # Data cache & retrieval layer
│   ├── routingEngine.ts      # Custom Dijkstra & A* engines
│   ├── mlEngine.ts           # Trained XGBoost + Random Forest inference & edge risk
│   └── logger.ts             # Structured log stream
├── data/
│   ├── raw/
│   │   ├── flights/          # BTS historical on-time records
│   │   ├── airports/         # FAA hub coordinates & elevations
│   │   └── weather/          # NOAA METAR observation strings
│   ├── processed/            # Derived congestion & network graph
│   └── metadata/             # data_sources.json provenance metadata
├── docs/                     # System architecture, data reports, model card & QA
├── models/                   # Exported tree ensembles, metrics, schema & lookups
├── scripts/                  # Model training + data download/inspection scripts
├── src/                      # React frontend (public site + operations console)
│   ├── layouts/              # PublicLayout (site) & AppLayout (console shell)
│   ├── components/           # Console Navbar, Sidebar, LeafletMap
│   │   └── public/           # PublicNavbar, PublicFooter, Reveal
│   ├── pages/                # 9 console views + public/ marketing pages
│   │   └── public/           # Landing, Features, Docs, About
│   └── types.ts              # Frontend TypeScript definitions
├── tests/                    # Unit tests for Dijkstra, A*, and heuristics
├── server.ts                 # Full-stack Express server
└── package.json
```

### Site structure & routes
The app is split into a public marketing/documentation website and the operations console.

| Public site | Route | Console | Route |
| --- | --- | --- | --- |
| Landing | `/` | Dashboard | `/app/dashboard` |
| Features | `/features` | Route Optimizer | `/app/routes` |
| Docs | `/docs` | Flight Intel | `/app/flights` |
| About | `/about` | Network / Weather / Congestion | `/app/network`, `/app/weather`, `/app/congestion` |
| | | Analytics / Model / System | `/app/analytics`, `/app/model`, `/app/system` |

Legacy paths (e.g. `/dashboard`) redirect to their `/app/...` equivalents.

---

## 5. Developer Setup & PowerShell Instructions

### Prerequisites
- Node.js (v20.19+ or v22.12+, as required by Vite 8)
- Python (v3.10+)

### Setup on Windows (PowerShell)
```powershell
# 1. Install Node dependencies
npm install

# 2. Inspect ingested datasets
python scripts/inspect_datasets.py

# 3. Execute algorithm unit tests
python tests/test_algorithms.py

# 4. Train the delay-severity models (XGBoost + Random Forest)
#    Requires: pip install xgboost scikit-learn pandas numpy joblib
python scripts/train_delay_model.py

# 5. Start Full-Stack Dev Server (Port 3000)
npm run dev
```

### Setup on Linux / macOS (Bash)
```bash
npm install
python3 scripts/inspect_datasets.py
python3 tests/test_algorithms.py
python3 scripts/train_delay_model.py   # XGBoost + Random Forest (pip install xgboost scikit-learn pandas numpy joblib)
npm run dev
```

The application will run on **http://localhost:3000** — the public landing page is at `/` and the operations console is at `/app/dashboard`. To use a different port, set `PORT` before starting, e.g. `$env:PORT=3001; npm run dev` (PowerShell) or `PORT=3001 npm run dev` (Bash).

### Importing a real flight dataset (BTS / Kaggle)
The app ships with real U.S. DOT BTS On-Time Performance records already processed into `data/processed/bts_flight_sample.json` and `data/processed/bts_flight_summary.json`, and loads them by default. To rebuild or refresh them from a raw CSV (for example the TranStats `On_Time_Reporting_Carrier_On_Time_Performance_1987_present_2024_1.csv`), or from Kaggle's [Airline Delay Analysis dataset](https://www.kaggle.com/datasets/sherrytp/airline-delay-analysis), point the importer at the folder containing the extracted CSVs:

```powershell
# BTS single-month file, restricted to the hub network
python scripts/import_kaggle_flights.py ".\data\raw\flights" --prefix bts --airport-filter ".\data\raw\airports\airports.json" --source-label "U.S. DOT BTS On-Time Performance - January 2024 (hub network)"

# Kaggle multi-file archive (kept as kaggle_* and opt-in via AEROROUTE_USE_KAGGLE_DATA=true)
python scripts/import_kaggle_flights.py "C:\path\to\extracted\airline-delay-analysis"
```

The importer streams the CSV files, computes delay analytics over every valid row, and either saves a deterministic sample or — with `--full` — every filtered row to a gzipped `bts_flights.json.gz` that the app serves page-by-page. `--prefix` controls the output filenames (`bts_*` or `kaggle_*`), `--airport-filter` keeps only hub-to-hub flights, and `--source-label` sets the provenance string shown in the UI. The committed BTS dataset lets the app run without the raw CSV; set `AEROROUTE_USE_DEMO_DATA=true` to fall back to the original bundled 20-record demo. The Flights page reads the dataset through the paginated `GET /api/flights?limit=&offset=` endpoint (searchable by carrier/origin/dest/status) and shows the full matching count. The importer needs no API key — download the CSV from the BTS/Kaggle website directly.

### API keys and live data
No API key is required to run the current demo. The app reads its flight, airport, weather, congestion, graph, and model-metric data from the bundled `data/` and `models/` JSON files. It does not currently call Gemini, BTS, FAA, or NOAA APIs, and the displayed observations do not refresh from those providers.

The map tiles are requested from OpenStreetMap over the internet and are shown with attribution; no map API key is required. If you later integrate a provider that requires credentials, put them in a root-level `.env` file (copy `.env.example` as a starting point) and read them only from server-side code. `server.ts` loads `.env`; do not put secret keys in `src/` or variables prefixed with `VITE_`, which are exposed to the browser. The `GEMINI_API_KEY` entry is an empty placeholder for a future integration.

Frontend API calls are centralized in `src/api.ts`; the matching Express endpoints are in `server.ts`. Add external provider calls in backend code and expose only the data the frontend needs through an `/api/...` endpoint.

### Deploying to Vercel
The repository is Vercel-ready: the Vite frontend is built to static files and the Express API runs as a single Node serverless function.

- `api/[...slug].ts` exports the shared Express app (`backend/app.ts`) as the serverless handler.
- `vercel.json` builds with `npm run build`, serves `dist/`, routes non-API paths to the SPA, and bundles `data/**` and `models/**` into the function via `includeFiles`.
- `.vercelignore` drops the Python app, raw multi-GB CSVs, and redundant `.joblib` artifacts.
- `server.ts` is only used for local `npm run dev`; Vercel uses the function entry. The Random Forest export is no longer loaded at startup unless active (set `AEROROUTE_LOAD_ALL_MODELS=true` to force it), which keeps function cold starts small.

Deploy with the Vercel CLI (run from the project root):

```bash
npm i -g vercel
vercel login
vercel --prod
```

Or import the GitHub repo at vercel.com/new. The framework preset is detected as Vite. Note the ML model is loaded lazily on cold start; the first request after idle may take a few seconds. If the model bundle exceeds your plan's function limits or the 60s `maxDuration` on Hobby, upgrade to Pro or drop the Random Forest export.

---

## 6. Multi-Objective Cost Formulation
The routing engine optimizes edge cost $C(e)$ over the graph:

$$C(e) = w_d \cdot \left(\frac{D_e}{2500}\right) + w_t \cdot \left(\frac{T_e}{300}\right) + w_w \cdot \left(\frac{W_e}{100}\right) + w_c \cdot \left(\frac{C_e}{100}\right) + w_r \cdot R_e$$

- **Dijkstra**: Exhaustive min-priority search yielding mathematically optimal cost.
- **A\* Search**: Uses admissible Haversine great-circle distance heuristic:
  $$h(n) = \text{HaversineNM}(n, \text{Dest}) \times \min\left(\frac{\text{Cost}}{\text{NM}}\right)$$
  Yields identical optimal paths with up to 50%+ reduction in explored nodes.

---

## 7. API Endpoints
- `GET /api/health` — System status, application name, version, and academic disclaimer.
- `GET /api/airports` — Bundled airport locations and derived risk fields.
- `GET /api/weather/summary` — Bundled METAR observations and flight categories.
- `GET /api/weather/:code` and `GET /api/weather/risk/:code` — Station observation and risk breakdown.
- `GET /api/congestion/summary` — Ranked airport congestion and runway load factors.
- `GET /api/congestion/:code` — One airport's congestion proxy.
- `GET /api/flights` and `GET /api/flights/:id` — Search the full flight dataset (`?limit=&offset=&carrier=&origin=&dest=&status=`) and retrieve a flight's context.
- `GET /api/network/graph` — Nodes and directed corridor edges used by routing.
- `POST /api/routes/optimize` — Computes a multi-objective path with Dijkstra, A*, or both; accepts origin, destination, algorithm, and weights.
- `GET /api/model/metrics` and `GET /api/model/schema` — Trained-model metrics and feature-schema artifacts.
- `POST /api/model/predict` — Runs the trained delay-severity model and returns class probabilities, expected delay minutes, a delay-risk score, and feature attributions.
- `GET /api/analytics/summary` — Aggregated flight-delay and carrier summaries.
- `GET /api/system/health` and `GET /api/system/logs` — Loaded subsystem state and in-memory logs.

---

## 8. Academic Safety & Non-Operational Disclaimer
> **IMPORTANT**: AeroRoute AI is strictly an **academic decision-support prototype**. It is **NOT certified aviation software**. It does not possess air-traffic-control (ATC) authority, operational flight-dispatch clearance, or certified avionics guarantees. All generated paths, risk indices, and predictions are decision-support estimates for research and educational purposes.
