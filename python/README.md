# AeroRoute AI — Python Edition

Aviation operations & route intelligence. A full **Python** rewrite of the original
React/TypeScript + Express project, using **FastAPI + Jinja2 + Tailwind (Play CDN) +
Leaflet + Chart.js**, backed by a **SQLite** database built automatically from the bundled
JSON snapshots.

> Academic decision-support prototype. Not certified aviation software.

## Stack

| Layer      | Technology |
|------------|------------|
| Web server | FastAPI + Uvicorn |
| Templating | Jinja2 (server-side rendering) |
| Styling    | Tailwind CSS via Play CDN + custom `app.css` |
| Charts     | Chart.js (CDN) |
| Maps       | Leaflet (CDN) |
| Icons      | Lucide (CDN) |
| Database   | SQLite (built from `data/` JSON) |

## Quick start

```powershell
cd python
python -m pip install -r requirements.txt
python run.py
```

Then open http://localhost:3000

The SQLite database (`python/aeroroute.db`) is created automatically on first start from
the JSON files in `python/data/` and `python/models/`.

To rebuild the database from scratch, delete `aeroroute.db` and restart (or call
`build_database.build_database()`).

### Tests

```powershell
cd python
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

Covers the routing engine (Dijkstra / A*), the delay-scoring engine, and every REST
endpoint plus all server-rendered pages.

## Layout

```
python/
  run.py                  # uvicorn entry point (python run.py)
  build_database.py       # JSON -> SQLite builder
  requirements.txt
  data/                   # bundled snapshots (airports, flights, weather, graph, activity)
  models/                 # bundled model artifacts (metrics, schema, delay model)
  app/
    config.py             # paths, constants, carriers, route presets
    main.py               # FastAPI app, static mount, startup
    database.py           # SQLite connection + query helpers
    templating.py         # shared Jinja2 environment
    routers/
      api.py              # REST API (/api/*)
      pages.py            # server-rendered pages (public site + console)
    services/
      data_service.py     # data access layer over SQLite
      routing_engine.py   # Dijkstra + A* graph search
      ml_engine.py        # deterministic delay-risk scoring
      logger.py           # in-memory structured log stream
    static/
      css/app.css
      js/app.js           # sidebar, nav, reveal, UTC clock, sliders, map/chart init
    templates/
      base_public.html    # public layout
      base_app.html       # console layout
      partials/           # nav, sidebar, footer
      public/             # landing, features, docs, about
      app/                # dashboard, routes, flights, network, weather,
                          # congestion, analytics, model, system
```

## Routes

### Public site
- `/` landing · `/features` · `/docs` · `/about`

### Operations console
- `/app/dashboard` · `/app/network` · `/app/flights` · `/app/weather`
- `/app/congestion` · `/app/analytics` · `/app/routes` · `/app/model` · `/app/system`

### REST API
`/api/health`, `/api/airports`, `/api/weather/*`, `/api/congestion/*`, `/api/flights`,
`/api/network/graph`, `POST /api/routes/optimize`, `/api/model/metrics`,
`POST /api/model/predict`, `/api/analytics/summary`, `/api/system/health`, `/api/system/logs`.

## Interactivity model

The console is server-rendered. Filters and calculators use **GET forms** with query
parameters (e.g. `/app/routes?origin=JFK&dest=LAX&algorithm=astar`, `/app/flights?carrier=DL`,
`/app/model?origin=JFK&dest=LAX`). A small `app.js` adds client-side niceties only:
sidebar collapse, mobile drawers, scroll reveals, a UTC clock, slider value labels, and
Leaflet/Chart.js initialization from JSON embedded in the templates.

## Optional: Kaggle data mode

Set `AEROROUTE_USE_KAGGLE_DATA=true` before starting to load
`data/processed/kaggle_flight_sample.json` (and its `_summary.json`) into the database as
the `flight_summary` artifact.

## Notes

- No authentication or user accounts.
- The delay-scoring engine uses deterministic weighted softmax logic, not a loaded trained
  model; `models/model_metrics.json` is a bundled illustrative artifact.
