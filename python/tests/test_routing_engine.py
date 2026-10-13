"""Unit tests for the graph routing engine (Dijkstra + A*)."""
import math

from app.services.routing_engine import (
    R_NM,
    RoutingEngine,
    calculate_edge_cost,
    haversine_distance_nm,
    routing_engine,
)

DEFAULT_WEIGHTS = {
    "distance": 0.3,
    "time": 0.2,
    "weather": 0.25,
    "congestion": 0.15,
    "delayRisk": 0.1,
}


def test_haversine_known_distance():
    d = haversine_distance_nm(40.6413, -73.7781, 33.9416, -118.4085)
    assert 2100 < d < 2250


def test_calculate_edge_cost_is_positive():
    edge = {
        "distance_nm": 1200,
        "base_time_min": 180,
        "weather_risk": 30,
        "congestion_risk": 50,
        "delay_risk": 25,
    }
    assert calculate_edge_cost(edge, DEFAULT_WEIGHTS) > 0


def test_same_origin_destination():
    result = routing_engine.solve_dijkstra("JFK", "JFK", DEFAULT_WEIGHTS)
    assert result["path"] == ["JFK"]
    assert result["total_score"] == 0


def test_invalid_node_returns_none():
    result = routing_engine.solve_dijkstra("ZZZ", "JFK", DEFAULT_WEIGHTS)
    assert result["path"] is None
    assert math.isinf(result["total_score"])


def test_dijkstra_and_astar_find_equivalent_routes():
    d = routing_engine.solve_dijkstra("JFK", "LAX", DEFAULT_WEIGHTS)
    a = routing_engine.solve_astar("JFK", "LAX", DEFAULT_WEIGHTS)
    assert d["path"] is not None
    assert d["path"] == a["path"]
    assert abs(d["total_score"] - a["total_score"]) < 0.5


def test_astar_explores_no_more_than_dijkstra():
    d = routing_engine.solve_dijkstra("SEA", "MIA", DEFAULT_WEIGHTS)
    a = routing_engine.solve_astar("SEA", "MIA", DEFAULT_WEIGHTS)
    assert a["explored_nodes"] <= d["explored_nodes"] + 2


def test_recommend_route_structure():
    result = routing_engine.recommend_route("JFK", "LAX", "astar", DEFAULT_WEIGHTS)
    rec = result["recommended"]
    assert rec["path"][0] == "JFK"
    assert rec["path"][-1] == "LAX"
    assert rec["algorithm"] == "A*"
    assert set(["totalDistanceNm", "estimatedTimeMin", "fuelProxyGal"]).issubset(rec["metrics"])
    assert isinstance(rec["explanation"], list) and rec["explanation"]
    assert "benchmark" in result


def test_recommend_route_rejects_unreachable_pair():
    import pytest

    with pytest.raises(ValueError):
        routing_engine.recommend_route("JFK", "ZZZ", "dijkstra", DEFAULT_WEIGHTS)


def test_engine_is_singleton_instance():
    assert isinstance(routing_engine, RoutingEngine)


def test_radius_constant():
    assert R_NM == 3440.065
