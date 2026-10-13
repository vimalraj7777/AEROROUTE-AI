"""Data access layer over SQLite (port of backend/dataService.ts)."""
from __future__ import annotations

from typing import Any

from app import database
from app.services.logger import add_log


class DataService:
    def __init__(self) -> None:
        self._airports: list[dict[str, Any]] = []
        self._metar: list[dict[str, Any]] = []
        self._flights: list[dict[str, Any]] = []
        self._activity: list[dict[str, Any]] = []
        self._graph_nodes: dict[str, dict[str, Any]] = {}
        self._graph_edges: list[dict[str, Any]] = []
        self._model_metrics: Any = None
        self._feature_schema: Any = None
        self._flight_summary: Any = None
        self._is_loaded = False

    def load_all(self) -> None:
        database.ensure_database()
        try:
            self._airports = database.query_all("SELECT * FROM airports")
            self._metar = database.query_all("SELECT * FROM metar")
            self._flights = database.query_all("SELECT * FROM flights")
            self._activity = database.query_all("SELECT * FROM activity")

            self._graph_nodes = {
                row["iata"]: {
                    "iata": row["iata"],
                    "icao": row["icao"],
                    "name": row["name"],
                    "lat": row["lat"],
                    "lon": row["lon"],
                    "region": row["region"],
                    "weather_risk": row["weather_risk"],
                    "congestion_index": row["congestion_index"],
                    "elevation_ft": row["elevation_ft"],
                }
                for row in database.query_all("SELECT * FROM graph_nodes")
            }
            self._graph_edges = [
                {
                    "from": row["from_iata"],
                    "to": row["to_iata"],
                    "distance_nm": row["distance_nm"],
                    "base_time_min": row["base_time_min"],
                    "delay_risk": row["delay_risk"],
                    "weather_risk": row["weather_risk"],
                    "congestion_risk": row["congestion_risk"],
                }
                for row in database.query_all("SELECT * FROM graph_edges")
            ]

            for row in self._activity:
                row["ground_delay_program"] = bool(row["ground_delay_program"])

            self._model_metrics = database.get_artifact("model_metrics")
            self._feature_schema = database.get_artifact("feature_schema")
            self._flight_summary = database.get_artifact("flight_summary")

            self._is_loaded = True
            add_log(
                "INFO",
                "DATABASE",
                f"Loaded {len(self._airports)} airports, {len(self._flights)} flights, and graph "
                f"with {len(self._graph_nodes)} nodes and {len(self._graph_edges)} edges",
            )
        except Exception as err:  # pragma: no cover - defensive
            add_log("ERROR", "DATABASE", f"Failed to load datasets: {err}")

    # ------------------------------------------------------------------
    # Airports
    # ------------------------------------------------------------------
    def get_airports(self) -> list[dict[str, Any]]:
        return self._airports

    def get_airport_by_iata(self, iata: str) -> dict[str, Any] | None:
        clean = (iata or "").upper()
        return next((a for a in self._airports if a["iata"].upper() == clean), None)

    # ------------------------------------------------------------------
    # Weather
    # ------------------------------------------------------------------
    def get_weather_observations(self) -> list[dict[str, Any]]:
        return self._metar

    def get_weather_by_code(self, code: str) -> dict[str, Any] | None:
        clean = (code or "").upper()
        return next(
            (
                w
                for w in self._metar
                if w["station"] == clean
                or w["station"] == f"K{clean}"
                or w["station"].endswith(clean)
            ),
            None,
        )

    # ------------------------------------------------------------------
    # Congestion / activity
    # ------------------------------------------------------------------
    def get_airport_activity(self) -> list[dict[str, Any]]:
        return self._activity

    def get_activity_by_iata(self, iata: str) -> dict[str, Any] | None:
        clean = (iata or "").upper()
        return next((a for a in self._activity if a["airport"].upper() == clean), None)

    # ------------------------------------------------------------------
    # Flights
    # ------------------------------------------------------------------
    def get_flights(self, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        flights = self._flights
        if not params:
            return flights

        carrier = params.get("carrier")
        origin = params.get("origin")
        dest = params.get("dest")
        status = params.get("status")
        severity = params.get("severity")

        if carrier:
            flights = [f for f in flights if (f["carrier"] or "").upper() == str(carrier).upper()]
        if origin:
            flights = [f for f in flights if (f["origin"] or "").upper() == str(origin).upper()]
        if dest:
            flights = [f for f in flights if (f["dest"] or "").upper() == str(dest).upper()]
        if status:
            flights = [f for f in flights if (f["status"] or "").upper() == str(status).upper()]
        if severity is not None:
            flights = [f for f in flights if f["delay_severity_class"] == int(severity)]
        return flights

    def get_flight_by_record_id(self, record_id: str) -> dict[str, Any] | None:
        return next((f for f in self._flights if f["record_id"] == record_id), None)

    def get_flight_summary(self) -> Any:
        return self._flight_summary

    # ------------------------------------------------------------------
    # Graph
    # ------------------------------------------------------------------
    def get_graph_data(self) -> dict[str, Any]:
        return {"nodes": self._graph_nodes, "edges": self._graph_edges}

    # ------------------------------------------------------------------
    # Models
    # ------------------------------------------------------------------
    def get_model_metrics(self) -> Any:
        return self._model_metrics

    def get_feature_schema(self) -> Any:
        return self._feature_schema

    def is_ready(self) -> bool:
        return self._is_loaded


data_service = DataService()
