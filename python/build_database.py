"""Build the AeroRoute AI SQLite database from the bundled JSON snapshots.

Usage:
    python build_database.py

Reads the JSON files under ``data/`` and the model artifacts under ``models/``
and materialises a single ``aeroroute.db`` SQLite database that the FastAPI
application reads at runtime.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from app import config

SCHEMA = """
DROP TABLE IF EXISTS airports;
DROP TABLE IF EXISTS metar;
DROP TABLE IF EXISTS flights;
DROP TABLE IF EXISTS activity;
DROP TABLE IF EXISTS graph_nodes;
DROP TABLE IF EXISTS graph_edges;
DROP TABLE IF EXISTS artifacts;

CREATE TABLE airports (
    iata TEXT PRIMARY KEY,
    icao TEXT,
    name TEXT,
    city TEXT,
    state TEXT,
    latitude REAL,
    longitude REAL,
    elevation_ft INTEGER,
    timezone TEXT,
    runways INTEGER,
    hub_carrier TEXT,
    weather_risk REAL,
    congestion_index REAL,
    congestion_band TEXT
);

CREATE TABLE metar (
    station TEXT PRIMARY KEY,
    timestamp_utc TEXT,
    raw_metar TEXT,
    wind_dir INTEGER,
    wind_speed_kt INTEGER,
    wind_gust_kt INTEGER,
    visibility_sm REAL,
    temp_c REAL,
    dewpoint_c REAL,
    altimeter_inhg REAL,
    ceiling_ft INTEGER,
    flight_category TEXT,
    phenomena TEXT,
    composite_risk_score REAL
);

CREATE TABLE flights (
    record_id TEXT PRIMARY KEY,
    fl_date TEXT,
    carrier TEXT,
    carrier_name TEXT,
    flight_num INTEGER,
    origin TEXT,
    dest TEXT,
    crs_dep_time INTEGER,
    dep_time INTEGER,
    dep_delay INTEGER,
    crs_arr_time INTEGER,
    arr_time INTEGER,
    arr_delay INTEGER,
    cancelled INTEGER,
    diverted INTEGER,
    air_time INTEGER,
    distance INTEGER,
    carrier_delay INTEGER,
    weather_delay INTEGER,
    nas_delay INTEGER,
    late_aircraft_delay INTEGER,
    delay_severity_class INTEGER,
    status TEXT
);

CREATE TABLE activity (
    airport TEXT PRIMARY KEY,
    name TEXT,
    hourly_departures INTEGER,
    hourly_arrivals INTEGER,
    total_operations INTEGER,
    runway_capacity INTEGER,
    load_factor REAL,
    derived_congestion_index REAL,
    congestion_band TEXT,
    trend TEXT,
    ground_delay_program INTEGER,
    avg_taxi_out_min REAL
);

CREATE TABLE graph_nodes (
    iata TEXT PRIMARY KEY,
    icao TEXT,
    name TEXT,
    lat REAL,
    lon REAL,
    region TEXT,
    weather_risk REAL,
    congestion_index REAL,
    elevation_ft INTEGER
);

CREATE TABLE graph_edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_iata TEXT,
    to_iata TEXT,
    distance_nm REAL,
    base_time_min REAL,
    delay_risk REAL,
    weather_risk REAL,
    congestion_risk REAL
);

CREATE TABLE artifacts (
    key TEXT PRIMARY KEY,
    json TEXT
);

CREATE INDEX idx_flights_carrier ON flights(carrier);
CREATE INDEX idx_flights_origin ON flights(origin);
CREATE INDEX idx_flights_dest ON flights(dest);
CREATE INDEX idx_flights_status ON flights(status);
CREATE INDEX idx_edges_from ON graph_edges(from_iata);
"""


def _read_json(path: Path):
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def build_database(db_path: Path | None = None) -> Path:
    db_path = Path(db_path) if db_path else config.DB_PATH
    if db_path.exists():
        db_path.unlink()

    airports = _read_json(config.DATA_DIR / "raw" / "airports" / "airports.json")
    weather = _read_json(config.DATA_DIR / "raw" / "weather" / "metar_observations.json")
    flights = _read_json(config.DATA_DIR / "raw" / "flights" / "bts_historical_flights.json")
    activity = _read_json(config.DATA_DIR / "processed" / "airport_activity.json")
    graph = _read_json(config.DATA_DIR / "processed" / "network_graph.json")
    model_metrics = _read_json(config.MODELS_DIR / "model_metrics.json")
    feature_schema = _read_json(config.MODELS_DIR / "feature_schema.json")
    delay_model = _read_json(config.MODELS_DIR / "delay_model.json")
    data_sources = _read_json(config.DATA_DIR / "metadata" / "data_sources.json")

    kaggle_sample_path = config.DATA_DIR / "processed" / "kaggle_flight_sample.json"
    kaggle_summary_path = config.DATA_DIR / "processed" / "kaggle_flight_summary.json"
    flight_summary = None
    if config.USE_KAGGLE_DATA and kaggle_sample_path.exists() and kaggle_summary_path.exists():
        flights = _read_json(kaggle_sample_path)
        flight_summary = _read_json(kaggle_summary_path)

    # Enrich airports with derived weather risk and congestion (mirrors dataService.ts)
    weather_by_icao = {w["station"]: w for w in weather}
    activity_by_iata = {a["airport"]: a for a in activity}

    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(SCHEMA)

        for ap in airports:
            wx = weather_by_icao.get(ap.get("icao")) or weather_by_icao.get(f"K{ap['iata']}")
            act = activity_by_iata.get(ap["iata"])
            conn.execute(
                "INSERT INTO airports VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    ap["iata"], ap.get("icao"), ap.get("name"), ap.get("city"), ap.get("state"),
                    ap.get("latitude"), ap.get("longitude"), ap.get("elevation_ft"),
                    ap.get("timezone"), ap.get("runways"), ap.get("hub_carrier"),
                    wx["composite_risk_score"] if wx else 15.0,
                    act["derived_congestion_index"] if act else 40.0,
                    act["congestion_band"] if act else "Moderate",
                ),
            )

        for w in weather:
            conn.execute(
                "INSERT INTO metar VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    w["station"], w.get("timestamp_utc"), w.get("raw_metar"), w.get("wind_dir"),
                    w.get("wind_speed_kt"), w.get("wind_gust_kt"), w.get("visibility_sm"),
                    w.get("temp_c"), w.get("dewpoint_c"), w.get("altimeter_inhg"),
                    w.get("ceiling_ft"), w.get("flight_category"), w.get("phenomena"),
                    w.get("composite_risk_score"),
                ),
            )

        for i, f in enumerate(flights):
            record_id = f.get("record_id") or f"bts-{i + 1:04d}"
            conn.execute(
                "INSERT INTO flights VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    record_id, f.get("fl_date"), f.get("carrier"), f.get("carrier_name"),
                    f.get("flight_num"), f.get("origin"), f.get("dest"), f.get("crs_dep_time"),
                    f.get("dep_time"), f.get("dep_delay"), f.get("crs_arr_time"), f.get("arr_time"),
                    f.get("arr_delay"), f.get("cancelled"), f.get("diverted"), f.get("air_time"),
                    f.get("distance"), f.get("carrier_delay"), f.get("weather_delay"),
                    f.get("nas_delay"), f.get("late_aircraft_delay"), f.get("delay_severity_class"),
                    f.get("status"),
                ),
            )

        for a in activity:
            conn.execute(
                "INSERT INTO activity VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    a["airport"], a.get("name"), a.get("hourly_departures"), a.get("hourly_arrivals"),
                    a.get("total_operations"), a.get("runway_capacity"), a.get("load_factor"),
                    a.get("derived_congestion_index"), a.get("congestion_band"), a.get("trend"),
                    1 if a.get("ground_delay_program") else 0, a.get("avg_taxi_out_min"),
                ),
            )

        for node in graph.get("nodes", {}).values():
            conn.execute(
                "INSERT INTO graph_nodes VALUES (?,?,?,?,?,?,?,?,?)",
                (
                    node["iata"], node.get("icao"), node.get("name"), node.get("lat"), node.get("lon"),
                    node.get("region"), node.get("weather_risk"), node.get("congestion_index"),
                    node.get("elevation_ft"),
                ),
            )

        for e in graph.get("edges", []):
            conn.execute(
                "INSERT INTO graph_edges (from_iata, to_iata, distance_nm, base_time_min, delay_risk, weather_risk, congestion_risk) "
                "VALUES (?,?,?,?,?,?,?)",
                (
                    e["from"], e["to"], e.get("distance_nm"), e.get("base_time_min"),
                    e.get("delay_risk"), e.get("weather_risk"), e.get("congestion_risk"),
                ),
            )

        artifacts = {
            "model_metrics": model_metrics,
            "feature_schema": feature_schema,
            "delay_model": delay_model,
            "data_sources": data_sources,
            "graph_meta": {
                "graph_id": graph.get("graph_id"),
                "generated_at": graph.get("generated_at"),
            },
        }
        if flight_summary is not None:
            artifacts["flight_summary"] = flight_summary

        for key, value in artifacts.items():
            conn.execute(
                "INSERT INTO artifacts VALUES (?,?)", (key, json.dumps(value))
            )

        conn.commit()
    finally:
        conn.close()

    return db_path


if __name__ == "__main__":
    path = build_database()
    size_kb = path.stat().st_size / 1024
    print(f"[AeroRoute AI] Built database at {path} ({size_kb:.1f} KB)")
