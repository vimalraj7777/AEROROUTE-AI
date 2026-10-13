"""REST API router (port of the Express endpoints in server.ts)."""
from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter, Body, HTTPException, Query

from app import config
from app.services.data_service import data_service
from app.services.logger import add_log, get_logs
from app.services.ml_engine import ml_engine
from app.services.routing_engine import routing_engine

router = APIRouter(prefix="/api")

_START_TIME = time.time()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@router.get("/health")
def health() -> dict:
    return {
        "status": "operational",
        "application": "AeroRoute AI",
        "version": config.APP_VERSION,
        "environment": config.ENVIRONMENT,
        "timestamp": _now_iso(),
        "academic_disclaimer": config.ACADEMIC_DISCLAIMER,
    }


@router.get("/airports")
def airports() -> dict:
    data = data_service.get_airports()
    return {"count": len(data), "airports": data}


# --------------------------------------------------------------------------
# Weather (specific routes declared before the catch-all {code})
# --------------------------------------------------------------------------
@router.get("/weather/summary")
def weather_summary() -> dict:
    weather = data_service.get_weather_observations()
    vfr = sum(1 for w in weather if w["flight_category"] == "VFR")
    ifr = sum(1 for w in weather if w["flight_category"] in ("IFR", "LIFR"))
    avg_risk = round(sum(w["composite_risk_score"] for w in weather) / (len(weather) or 1), 1)
    return {
        "total_stations": len(weather),
        "vfr_count": vfr,
        "ifr_count": ifr,
        "average_risk_score": avg_risk,
        "observations": weather,
    }


@router.get("/weather/risk/{code}")
def weather_risk(code: str) -> dict:
    obs = data_service.get_weather_by_code(code)
    if not obs:
        raise HTTPException(status_code=404, detail=f"Station {code} not found.")

    wind_risk = min(100, round(obs["wind_speed_kt"] * 2.5 + obs["wind_gust_kt"] * 1.5))
    vis = obs["visibility_sm"]
    vis_risk = 80 if vis < 3 else 45 if vis < 5 else 10
    ceiling = obs["ceiling_ft"]
    ceiling_risk = 90 if ceiling < 1000 else 50 if ceiling < 3000 else 15

    return {
        "station": obs["station"],
        "composite_risk_score": obs["composite_risk_score"],
        "flight_category": obs["flight_category"],
        "breakdown": {
            "wind_risk": wind_risk,
            "visibility_risk": vis_risk,
            "ceiling_risk": ceiling_risk,
            "phenomena_penalty": 25 if obs["phenomena"] != "None" else 0,
        },
        "raw_metar": obs["raw_metar"],
        "timestamp": obs["timestamp_utc"],
    }


@router.get("/weather/{code}")
def weather_station(code: str) -> dict:
    obs = data_service.get_weather_by_code(code)
    if not obs:
        raise HTTPException(status_code=404, detail=f"Weather observation for station {code} not found.")
    return obs


# --------------------------------------------------------------------------
# Congestion
# --------------------------------------------------------------------------
@router.get("/congestion/summary")
def congestion_summary() -> dict:
    activities = data_service.get_airport_activity()
    sorted_activities = sorted(activities, key=lambda a: a["derived_congestion_index"], reverse=True)
    avg_load = round(sum(a["load_factor"] for a in activities) / (len(activities) or 1) * 1000) / 10
    return {
        "total_monitored_hubs": len(activities),
        "average_nas_load_pct": avg_load,
        "highest_congestion_hub": sorted_activities[0]["airport"] if sorted_activities else "ORD",
        "airports": sorted_activities,
    }


@router.get("/congestion/{code}")
def congestion_airport(code: str) -> dict:
    act = data_service.get_activity_by_iata(code)
    if not act:
        raise HTTPException(status_code=404, detail=f"Congestion data for {code} not found.")
    return act


# --------------------------------------------------------------------------
# Flights (detail before catch-all {id})
# --------------------------------------------------------------------------
@router.get("/flights/detail")
def flight_detail(record_id: str = Query(...)) -> dict:
    flight = data_service.get_flight_by_record_id(record_id)
    if not flight:
        raise HTTPException(status_code=404, detail=f"Flight record {record_id} not found.")
    return {"flight": flight, "context": _flight_context(flight)}


@router.get("/flights")
def flights(
    carrier: str | None = None,
    origin: str | None = None,
    dest: str | None = None,
    status: str | None = None,
    severity: int | None = None,
) -> dict:
    result = data_service.get_flights(
        {"carrier": carrier, "origin": origin, "dest": dest, "status": status, "severity": severity}
    )
    summary = data_service.get_flight_summary()
    return {
        "total_count": len(result),
        "dataset_record_count": (summary or {}).get("total_flights", len(result)),
        "is_sampled": bool(summary),
        "flights": result,
    }


@router.get("/flights/{flight_id}")
def flight_by_number(flight_id: int) -> dict:
    flight = next((f for f in data_service.get_flights() if f["flight_num"] == flight_id), None)
    if not flight:
        raise HTTPException(status_code=404, detail=f"Flight {flight_id} not found.")
    return {"flight": flight, "context": _flight_context(flight)}


def _flight_context(flight: dict) -> dict:
    return {
        "origin_weather": data_service.get_weather_by_code(flight["origin"]),
        "dest_weather": data_service.get_weather_by_code(flight["dest"]),
        "origin_activity": data_service.get_activity_by_iata(flight["origin"]),
    }


# --------------------------------------------------------------------------
# Network
# --------------------------------------------------------------------------
@router.get("/network/graph")
def network_graph() -> dict:
    graph = data_service.get_graph_data()
    return {
        "node_count": len(graph["nodes"]),
        "edge_count": len(graph["edges"]),
        "nodes": graph["nodes"],
        "edges": graph["edges"],
    }


# --------------------------------------------------------------------------
# Route optimization
# --------------------------------------------------------------------------
@router.post("/routes/optimize")
def optimize_route(payload: dict = Body(...)) -> dict:
    origin = payload.get("origin")
    destination = payload.get("destination")
    if not origin or not destination:
        raise HTTPException(status_code=400, detail="Origin and destination airport codes are required.")
    try:
        return routing_engine.recommend_route(
            origin.upper(),
            destination.upper(),
            payload.get("algorithm") or "both",
            payload.get("weights")
            or {"distance": 0.3, "time": 0.2, "weather": 0.25, "congestion": 0.15, "delayRisk": 0.1},
        )
    except ValueError as err:
        add_log("ERROR", "ROUTING", f"Routing failed: {err}")
        raise HTTPException(status_code=400, detail=str(err))


# --------------------------------------------------------------------------
# Model
# --------------------------------------------------------------------------
@router.get("/model/schema")
def model_schema() -> dict:
    return data_service.get_feature_schema()


@router.get("/model/metrics")
def model_metrics() -> dict:
    metrics = data_service.get_model_metrics()
    if not metrics:
        raise HTTPException(status_code=404, detail="Model metrics artifact not found.")
    return metrics


@router.post("/model/predict")
def model_predict(payload: dict = Body(...)) -> dict:
    if not payload.get("origin") or not payload.get("dest"):
        raise HTTPException(status_code=400, detail="Origin and destination airport codes are required.")
    try:
        return ml_engine.predict(payload)
    except Exception as err:
        add_log("ERROR", "ML", f"Prediction failed: {err}")
        raise HTTPException(status_code=400, detail=str(err))


# --------------------------------------------------------------------------
# Analytics
# --------------------------------------------------------------------------
@router.get("/analytics/summary")
def analytics_summary() -> dict:
    flights = data_service.get_flights()
    imported_summary = data_service.get_flight_summary()
    airports = data_service.get_airports()
    activities = data_service.get_airport_activity()

    delay_buckets = (
        imported_summary.get("delay_buckets")
        if imported_summary
        else [
            {"label": "On-Time (<=0m)", "count": 0, "color": "#10b981"},
            {"label": "Minor (1-15m)", "count": 0, "color": "#38bdf8"},
            {"label": "Moderate (16-45m)", "count": 0, "color": "#f59e0b"},
            {"label": "Severe (>45m)", "count": 0, "color": "#ef4444"},
            {"label": "Cancelled", "count": 0, "color": "#64748b"},
        ]
    )

    if not imported_summary:
        for f in flights:
            if f["cancelled"] == 1:
                delay_buckets[4]["count"] += 1
            elif f["arr_delay"] <= 0:
                delay_buckets[0]["count"] += 1
            elif f["arr_delay"] <= 15:
                delay_buckets[1]["count"] += 1
            elif f["arr_delay"] <= 45:
                delay_buckets[2]["count"] += 1
            else:
                delay_buckets[3]["count"] += 1

    carriers = ["DL", "AA", "UA", "WN", "AS", "B6"]
    if imported_summary and imported_summary.get("carrier_performance"):
        carrier_stats = imported_summary["carrier_performance"]
    else:
        carrier_stats = []
        for c in carriers:
            c_flights = [f for f in flights if f["carrier"] == c]
            on_time = sum(1 for f in c_flights if f["arr_delay"] <= 0 and f["cancelled"] == 0)
            avg_delay = (
                round(sum(f["arr_delay"] for f in c_flights) / len(c_flights)) if c_flights else 0
            )
            carrier_stats.append(
                {
                    "carrier": c,
                    "total": len(c_flights),
                    "onTimePct": round(on_time / len(c_flights) * 100) if c_flights else 85,
                    "avgDelayMin": avg_delay,
                }
            )

    return {
        "total_flights_analyzed": (imported_summary or {}).get("total_flights", len(flights)),
        "sampled_flight_records": (imported_summary or {}).get("sampled_flights", len(flights)),
        "data_source": (imported_summary or {}).get("source", "Bundled historical flight sample"),
        "delay_buckets": delay_buckets,
        "carrier_performance": carrier_stats,
        "top_congested_hubs": activities[:6],
        "airports_monitored": len(airports),
    }


# --------------------------------------------------------------------------
# System
# --------------------------------------------------------------------------
@router.get("/system/health")
def system_health() -> dict:
    is_ready = data_service.is_ready()
    metrics = data_service.get_model_metrics()
    graph = data_service.get_graph_data()
    summary = data_service.get_flight_summary()

    return {
        "system_status": "OPERATIONAL" if is_ready else "DEGRADED",
        "timestamp": _now_iso(),
        "uptime_seconds": round(time.time() - _START_TIME),
        "subsystems": {
            "backend_api": {"status": "OPERATIONAL", "latency_ms": 1.2},
            "local_dataset_store": {
                "status": "OPERATIONAL" if is_ready else "UNAVAILABLE",
                "storage": "SQLite database built from bundled JSON snapshots",
            },
            "bts_flight_dataset": {
                "status": "OPERATIONAL" if is_ready else "UNAVAILABLE",
                "records": (summary or {}).get("total_flights", len(data_service.get_flights())),
                "sample_records": len(data_service.get_flights()),
                "sampled": bool(summary),
                "source": (summary or {}).get("source", "Bundled historical sample"),
            },
            "metar_snapshot": {
                "status": "OPERATIONAL" if is_ready else "UNAVAILABLE",
                "stations": len(data_service.get_weather_observations()),
            },
            "delay_scoring_engine": {"status": "OPERATIONAL" if metrics else "UNAVAILABLE", "model_version": "v1.4.0"},
            "graph_routing_engine": {
                "status": "OPERATIONAL" if len(graph["nodes"]) > 0 else "UNAVAILABLE",
                "nodes": len(graph["nodes"]),
                "edges": len(graph["edges"]),
            },
        },
    }


@router.get("/system/logs")
def system_logs(limit: int = 50, level: str | None = None) -> dict:
    return {"logs": get_logs(limit, level)}
