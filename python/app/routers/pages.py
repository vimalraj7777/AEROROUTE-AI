"""Server-rendered page router: public site + operations console."""
from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Query, Request
from fastapi.responses import RedirectResponse

from app import config
from app.routers import api
from app.services.data_service import data_service
from app.services.logger import get_logs
from app.services.ml_engine import ml_engine
from app.services.routing_engine import routing_engine
from app.templating import templates

router = APIRouter()


def _render(name: str, context: dict):
    return templates.TemplateResponse(context["request"], name, context)


CONSOLE_TITLES = {
    "dashboard": "Dashboard",
    "routes": "Route Optimizer",
    "flights": "Flight Intelligence",
    "network": "Network Map",
    "weather": "Weather Intelligence",
    "congestion": "Airport Congestion",
    "analytics": "Analytics",
    "model": "Model Metrics",
    "system": "System Health",
}


def _base_context(request: Request, **extra) -> dict:
    context = {
        "request": request,
        "app_name": config.APP_NAME,
        "app_version": config.APP_VERSION,
        "disclaimer": config.ACADEMIC_DISCLAIMER,
        "year": datetime.now().year,
    }
    context.update(extra)
    return context


def _console(request: Request, page: str, **extra) -> dict:
    return _base_context(
        request,
        mode="app",
        page=page,
        page_title=CONSOLE_TITLES.get(page, "Console"),
        **extra,
    )


# --------------------------------------------------------------------------
# Public site
# --------------------------------------------------------------------------
@router.get("/")
def landing(request: Request):
    return _render("public/landing.html", _base_context(request, mode="public", active="home"))


@router.get("/features")
def features(request: Request):
    return _render("public/features.html", _base_context(request, mode="public", active="features"))


@router.get("/docs")
def docs(request: Request):
    return _render("public/docs.html", _base_context(request, mode="public", active="docs"))


@router.get("/about")
def about(request: Request):
    return _render("public/about.html", _base_context(request, mode="public", active="about"))


# --------------------------------------------------------------------------
# Console
# --------------------------------------------------------------------------
@router.get("/app")
def app_index():
    return RedirectResponse(url="/app/dashboard")


@router.get("/app/dashboard")
def dashboard(request: Request):
    analytics = api.analytics_summary()
    weather = api.weather_summary()
    health = api.system_health()
    graph = data_service.get_graph_data()
    return _render(
        "app/dashboard.html",
        _console(
            request,
            "dashboard",
            analytics=analytics,
            weather=weather,
            health=health,
            node_count=len(graph["nodes"]),
            edge_count=len(graph["edges"]),
            airport_count=len(data_service.get_airports()),
            logs=get_logs(6),
        ),
    )


@router.get("/app/network")
def network(request: Request, region: str = Query("all"), selected: str = Query("")):
    graph = data_service.get_graph_data()
    nodes = graph["nodes"]
    edges = graph["edges"]
    regions = sorted({n["region"] for n in nodes.values()})

    filtered_nodes = {
        k: v for k, v in nodes.items() if region == "all" or v["region"].lower() == region.lower()
    }
    allowed = set(filtered_nodes.keys())
    filtered_edges = [e for e in edges if e["from"] in allowed and e["to"] in allowed]

    selected_node = nodes.get(selected) if selected else None
    return _render(
        "app/network.html",
        _console(
            request,
            "network",
            nodes=list(filtered_nodes.values()),
            edges=filtered_edges,
            all_nodes=list(nodes.values()),
            regions=regions,
            region=region,
            selected=selected_node,
        ),
    )


@router.get("/app/flights")
def flights(
    request: Request,
    carrier: str = Query(""),
    origin: str = Query(""),
    dest: str = Query(""),
    status: str = Query(""),
    record_id: str = Query(""),
):
    filters = {"carrier": carrier, "origin": origin, "dest": dest, "status": status}
    records = data_service.get_flights({k: v for k, v in filters.items() if v})
    airports = data_service.get_airports()
    carriers = sorted({f["carrier"] for f in data_service.get_flights()})
    statuses = sorted({f["status"] for f in data_service.get_flights()})
    selected = data_service.get_flight_by_record_id(record_id) if record_id else None
    detail_context = None
    if selected:
        detail_context = {
            "origin_weather": data_service.get_weather_by_code(selected["origin"]),
            "dest_weather": data_service.get_weather_by_code(selected["dest"]),
            "origin_activity": data_service.get_activity_by_iata(selected["origin"]),
        }
    return _render(
        "app/flights.html",
        _console(
            request,
            "flights",
            flights=records,
            total_count=len(records),
            airports=airports,
            carriers=carriers,
            statuses=statuses,
            filters=filters,
            selected=selected,
            detail_context=detail_context,
        ),
    )


@router.get("/app/weather")
def weather(request: Request, station: str = Query("")):
    summary = api.weather_summary()
    observations = summary["observations"]
    selected = data_service.get_weather_by_code(station) if station else None
    selected_risk = api.weather_risk(station) if station and selected else None
    return _render(
        "app/weather.html",
        _console(
            request,
            "weather",
            summary=summary,
            observations=observations,
            selected=selected,
            selected_risk=selected_risk,
        ),
    )


@router.get("/app/congestion")
def congestion(request: Request, hub: str = Query("")):
    summary = api.congestion_summary()
    selected = data_service.get_activity_by_iata(hub) if hub else None
    return _render(
        "app/congestion.html",
        _console(
            request,
            "congestion",
            airports=summary["airports"],
            summary=summary,
            selected=selected,
        ),
    )


@router.get("/app/analytics")
def analytics(request: Request):
    return _render(
        "app/analytics.html",
        _console(request, "analytics", summary=api.analytics_summary()),
    )


@router.get("/app/routes")
def routes(
    request: Request,
    origin: str = Query(""),
    dest: str = Query(""),
    algorithm: str = Query("astar"),
    preset: str = Query(""),
    w_distance: float = Query(0.3),
    w_time: float = Query(0.2),
    w_weather: float = Query(0.25),
    w_congestion: float = Query(0.15),
    w_delay: float = Query(0.1),
):
    weights = {
        "distance": w_distance,
        "time": w_time,
        "weather": w_weather,
        "congestion": w_congestion,
        "delayRisk": w_delay,
    }
    if preset and preset in config.ROUTE_PRESETS:
        weights = dict(config.ROUTE_PRESETS[preset]["weights"])

    airports = data_service.get_airports()
    result = None
    error = None
    if origin and dest:
        try:
            result = routing_engine.recommend_route(origin.upper(), dest.upper(), algorithm, weights)
        except ValueError as err:
            error = str(err)
    return _render(
        "app/routes.html",
        _console(
            request,
            "routes",
            airports=airports,
            result=result,
            error=error,
            origin=origin.upper(),
            dest=dest.upper(),
            algorithm=algorithm,
            weights=weights,
            presets=config.ROUTE_PRESETS,
            selected_preset=preset,
        ),
    )


@router.get("/app/model")
def model(
    request: Request,
    origin: str = Query(""),
    dest: str = Query(""),
    carrier: str = Query(""),
    origin_weather_risk: float = Query(None),
    dest_weather_risk: float = Query(None),
    origin_congestion_index: float = Query(None),
    dest_congestion_index: float = Query(None),
    scheduled_distance_nm: float = Query(None),
    departure_hour_utc: int = Query(None),
    day_of_week: int = Query(None),
):
    prediction = None
    error = None
    if origin and dest:
        payload = {
            "origin": origin,
            "dest": dest,
            "carrier": carrier,
            "origin_weather_risk": origin_weather_risk,
            "dest_weather_risk": dest_weather_risk,
            "origin_congestion_index": origin_congestion_index,
            "dest_congestion_index": dest_congestion_index,
            "scheduled_distance_nm": scheduled_distance_nm,
            "departure_hour_utc": departure_hour_utc,
            "day_of_week": day_of_week,
        }
        payload = {k: v for k, v in payload.items() if v is not None and v != ""}
        try:
            prediction = ml_engine.predict(payload)
        except Exception as err:  # noqa: BLE001
            error = str(err)
    return _render(
        "app/model.html",
        _console(
            request,
            "model",
            metrics=data_service.get_model_metrics(),
            schema=data_service.get_feature_schema(),
            airports=data_service.get_airports(),
            carriers=sorted(config.CARRIER_BASE_RATES.keys()),
            prediction=prediction,
            error=error,
            form={
                "origin": origin,
                "dest": dest,
                "carrier": carrier,
                "origin_weather_risk": origin_weather_risk,
                "dest_weather_risk": dest_weather_risk,
                "origin_congestion_index": origin_congestion_index,
                "dest_congestion_index": dest_congestion_index,
                "scheduled_distance_nm": scheduled_distance_nm,
                "departure_hour_utc": departure_hour_utc,
                "day_of_week": day_of_week,
            },
        ),
    )


@router.get("/app/system")
def system(request: Request):
    return _render(
        "app/system.html",
        _console(request, "system", health=api.system_health(), logs=get_logs(40)),
    )


# --------------------------------------------------------------------------
# Legacy path redirects
# --------------------------------------------------------------------------
@router.get("/dashboard")
def legacy_dashboard():
    return RedirectResponse(url="/app/dashboard")


for _legacy in ("routes", "flights", "network", "weather", "congestion", "analytics", "model", "system"):

    def _make(slug: str):
        def _redirect():
            return RedirectResponse(url=f"/app/{slug}")

        return _redirect

    router.add_api_route(f"/{_legacy}", _make(_legacy), methods=["GET"])
