"""Graph routing engine: Dijkstra + A* (port of backend/routingEngine.ts)."""
from __future__ import annotations

import heapq
import itertools
import math
import time
from typing import Any

from app.services.data_service import data_service
from app.services.logger import add_log

R_NM = 3440.065


def _js_round(value: float, decimals: int = 0) -> float:
    factor = 10 ** decimals
    return math.floor(value * factor + 0.5) / factor


def haversine_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    to_rad = math.radians
    d_lat = to_rad(lat2 - lat1)
    d_lon = to_rad(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) * math.sin(d_lat / 2)
        + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(d_lon / 2) * math.sin(d_lon / 2)
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return _js_round(R_NM * c, 1)


def calculate_edge_cost(edge: dict[str, Any], weights: dict[str, float]) -> float:
    norm_distance = edge["distance_nm"] / 2500.0
    norm_time = edge["base_time_min"] / 300.0
    norm_weather = edge["weather_risk"]
    norm_congestion = edge["congestion_risk"]
    norm_delay_risk = edge["delay_risk"]

    cost = (
        weights["distance"] * norm_distance
        + weights["time"] * norm_time
        + weights["weather"] * norm_weather
        + weights["congestion"] * norm_congestion
        + weights["delayRisk"] * norm_delay_risk
    )
    return max(0.001, cost)


class _PriorityQueue:
    """Min-priority queue preserving insertion order for equal priorities."""

    def __init__(self) -> None:
        self._heap: list[tuple[float, int, Any]] = []
        self._counter = itertools.count()

    def push(self, value: Any, priority: float) -> None:
        heapq.heappush(self._heap, (priority, next(self._counter), value))

    def pop(self) -> Any | None:
        if not self._heap:
            return None
        return heapq.heappop(self._heap)[2]

    def is_empty(self) -> bool:
        return not self._heap


class RoutingEngine:
    def solve_dijkstra(
        self,
        origin: str,
        destination: str,
        weights: dict[str, float],
        penalty_edges: set[str] | None = None,
    ) -> dict[str, Any]:
        penalty_edges = penalty_edges or set()
        start = time.perf_counter()
        graph = data_service.get_graph_data()
        nodes = graph["nodes"]
        edges = graph["edges"]

        if origin not in nodes or destination not in nodes:
            return {"path": None, "total_score": math.inf, "explored_nodes": 0, "execution_time_ms": 0}

        if origin == destination:
            return {"path": [origin], "total_score": 0, "explored_nodes": 1, "execution_time_ms": 0}

        adj: dict[str, list[tuple[str, float]]] = {key: [] for key in nodes}
        for edge in edges:
            if edge["from"] in adj:
                cost = calculate_edge_cost(edge, weights)
                edge_key = f"{edge['from']}->{edge['to']}"
                if edge_key in penalty_edges:
                    cost += 2.5
                adj[edge["from"]].append((edge["to"], cost))

        pq = _PriorityQueue()
        min_cost: dict[str, float] = {}
        explored = 0

        pq.push({"node": origin, "cost": 0.0, "path": [origin]}, 0.0)
        min_cost[origin] = 0.0

        while not pq.is_empty():
            current = pq.pop()
            explored += 1

            if current["node"] == destination:
                elapsed = (time.perf_counter() - start) * 1000
                return {
                    "path": current["path"],
                    "total_score": _js_round(current["cost"], 2),
                    "explored_nodes": explored,
                    "execution_time_ms": _js_round(elapsed, 2),
                }

            if current["cost"] > min_cost.get(current["node"], math.inf):
                continue

            for to_node, cost in adj.get(current["node"], []):
                new_cost = current["cost"] + cost
                if new_cost < min_cost.get(to_node, math.inf):
                    min_cost[to_node] = new_cost
                    pq.push(
                        {"node": to_node, "cost": new_cost, "path": current["path"] + [to_node]},
                        new_cost,
                    )

        elapsed = (time.perf_counter() - start) * 1000
        return {
            "path": None,
            "total_score": math.inf,
            "explored_nodes": explored,
            "execution_time_ms": _js_round(elapsed, 2),
        }

    def solve_astar(
        self,
        origin: str,
        destination: str,
        weights: dict[str, float],
        penalty_edges: set[str] | None = None,
    ) -> dict[str, Any]:
        penalty_edges = penalty_edges or set()
        start = time.perf_counter()
        graph = data_service.get_graph_data()
        nodes = graph["nodes"]
        edges = graph["edges"]

        if origin not in nodes or destination not in nodes:
            return {"path": None, "total_score": math.inf, "explored_nodes": 0, "execution_time_ms": 0}

        if origin == destination:
            return {"path": [origin], "total_score": 0, "explored_nodes": 1, "execution_time_ms": 0}

        dest_node = nodes[destination]
        min_cost_per_nm = 0.0003

        def heuristic(node_id: str) -> float:
            node = nodes.get(node_id)
            if not node:
                return 0.0
            dist = haversine_distance_nm(node["lat"], node["lon"], dest_node["lat"], dest_node["lon"])
            return dist * min_cost_per_nm * (weights["distance"] + 0.1)

        adj: dict[str, list[tuple[str, float]]] = {key: [] for key in nodes}
        for edge in edges:
            if edge["from"] in adj:
                cost = calculate_edge_cost(edge, weights)
                edge_key = f"{edge['from']}->{edge['to']}"
                if edge_key in penalty_edges:
                    cost += 2.5
                adj[edge["from"]].append((edge["to"], cost))

        pq = _PriorityQueue()
        g_score: dict[str, float] = {}
        explored = 0

        pq.push({"node": origin, "g": 0.0, "path": [origin]}, heuristic(origin))
        g_score[origin] = 0.0

        while not pq.is_empty():
            current = pq.pop()
            explored += 1

            if current["node"] == destination:
                elapsed = (time.perf_counter() - start) * 1000
                return {
                    "path": current["path"],
                    "total_score": _js_round(current["g"], 2),
                    "explored_nodes": explored,
                    "execution_time_ms": _js_round(elapsed, 2),
                }

            if current["g"] > g_score.get(current["node"], math.inf):
                continue

            for to_node, cost in adj.get(current["node"], []):
                tentative_g = current["g"] + cost
                if tentative_g < g_score.get(to_node, math.inf):
                    g_score[to_node] = tentative_g
                    f_score = tentative_g + heuristic(to_node)
                    pq.push(
                        {"node": to_node, "g": tentative_g, "path": current["path"] + [to_node]},
                        f_score,
                    )

        elapsed = (time.perf_counter() - start) * 1000
        return {
            "path": None,
            "total_score": math.inf,
            "explored_nodes": explored,
            "execution_time_ms": _js_round(elapsed, 2),
        }

    def build_result(
        self,
        path: list[str],
        algorithm: str,
        weights: dict[str, float],
        explored: int,
        time_ms: float,
    ) -> dict[str, Any]:
        graph = data_service.get_graph_data()
        nodes = graph["nodes"]
        edges = graph["edges"]

        waypoints = []
        for node_id in path:
            node = nodes.get(node_id)
            if node:
                waypoints.append(node)
            else:
                waypoints.append(
                    {
                        "iata": node_id,
                        "icao": f"K{node_id}",
                        "name": node_id,
                        "lat": 0,
                        "lon": 0,
                        "region": "Unknown",
                        "weather_risk": 0,
                        "congestion_index": 0,
                        "elevation_ft": 0,
                    }
                )

        edge_index = {(e["from"], e["to"]): e for e in edges}

        total_dist = 0.0
        total_time = 0.0
        sum_weather = 0.0
        sum_delay_risk = 0.0
        sum_congestion = 0.0

        for i in range(len(path) - 1):
            frm, to = path[i], path[i + 1]
            edge = edge_index.get((frm, to))
            if edge:
                total_dist += edge["distance_nm"]
                total_time += edge["base_time_min"]
                sum_weather += edge["weather_risk"] * 100
                sum_delay_risk += edge["delay_risk"] * 100
                sum_congestion += edge["congestion_risk"] * 100
            else:
                n1 = nodes.get(frm)
                n2 = nodes.get(to)
                if n1 and n2:
                    total_dist += haversine_distance_nm(n1["lat"], n1["lon"], n2["lat"], n2["lon"])
                    total_time += 120
                    sum_weather += (n1["weather_risk"] + n2["weather_risk"]) / 2
                    sum_congestion += (n1["congestion_index"] + n2["congestion_index"]) / 2
                    sum_delay_risk += 25

        edge_count = max(1, len(path) - 1)
        avg_weather = _js_round(sum_weather / edge_count)
        avg_delay_risk = _js_round(sum_delay_risk / edge_count)
        avg_congestion = _js_round(sum_congestion / edge_count)

        distance_cost = _js_round(weights["distance"] * (total_dist / 2500) * 100) / 100
        time_cost = _js_round(weights["time"] * (total_time / 300) * 100) / 100
        weather_cost = _js_round(weights["weather"] * (avg_weather / 100) * 100) / 100
        congestion_cost = _js_round(weights["congestion"] * (avg_congestion / 100) * 100) / 100
        delay_risk_cost = _js_round(weights["delayRisk"] * (avg_delay_risk / 100) * 100) / 100

        total_score = _js_round(distance_cost + time_cost + weather_cost + congestion_cost + delay_risk_cost, 2)
        fuel_proxy_gal = _js_round(total_dist * 1.85)

        reasons: list[str] = []
        if avg_weather < 25:
            reasons.append(
                f"Low route meteorological turbulence (Avg Weather Risk: {avg_weather}/100, VFR corridors)."
            )
        elif avg_weather > 50:
            reasons.append(
                f"Navigates through moderate convective or low-ceiling weather zones ({avg_weather}/100)."
            )

        if avg_congestion < 45:
            reasons.append(
                f"Avoids heavily congested terminal metering sectors (Airspace load factor: {avg_congestion}/100)."
            )
        else:
            reasons.append(f"Passes through primary high-throughput hub corridors ({avg_congestion}/100).")

        if len(path) == 2:
            reasons.append(
                f"Direct city-pair connection ({_js_round(total_dist)} NM) maximizing block-hour efficiency."
            )
        else:
            reasons.append(
                f"Multi-hop airway routing via {', '.join(path[1:-1])} to bypass restricted airspace/weather."
            )

        return {
            "algorithm": algorithm,
            "path": path,
            "waypoints": waypoints,
            "totalScore": total_score,
            "metrics": {
                "totalDistanceNm": _js_round(total_dist),
                "estimatedTimeMin": _js_round(total_time),
                "weatherRiskScore": avg_weather,
                "delayRiskScore": avg_delay_risk,
                "congestionRiskScore": avg_congestion,
                "fuelProxyGal": fuel_proxy_gal,
            },
            "componentCosts": {
                "distanceCost": distance_cost,
                "timeCost": time_cost,
                "weatherCost": weather_cost,
                "congestionCost": congestion_cost,
                "delayRiskCost": delay_risk_cost,
            },
            "exploredNodeCount": explored,
            "executionTimeMs": time_ms,
            "explanation": reasons,
        }

    def recommend_route(
        self,
        origin: str,
        destination: str,
        selected_algo: str,
        weights: dict[str, float],
    ) -> dict[str, Any]:
        default_weights = {
            "distance": weights.get("distance", 0.3),
            "time": weights.get("time", 0.2),
            "weather": weights.get("weather", 0.25),
            "congestion": weights.get("congestion", 0.15),
            "delayRisk": weights.get("delayRisk", 0.1),
        }

        primary_algo_name = "A*" if selected_algo == "astar" else "Dijkstra"
        if selected_algo == "astar":
            primary = self.solve_astar(origin, destination, default_weights)
        else:
            primary = self.solve_dijkstra(origin, destination, default_weights)

        if not primary["path"]:
            raise ValueError(
                f"No viable flight corridor found between {origin} and {destination} in the current network graph."
            )

        recommended = self.build_result(
            primary["path"],
            primary_algo_name,
            default_weights,
            primary["explored_nodes"],
            primary["execution_time_ms"],
        )

        weather_weights = {"distance": 0.15, "time": 0.1, "weather": 0.55, "congestion": 0.1, "delayRisk": 0.1}
        penalty1: set[str] = set()
        if len(primary["path"]) > 2:
            for i in range(len(primary["path"]) - 1):
                penalty1.add(f"{primary['path'][i]}->{primary['path'][i + 1]}")
        alt1 = self.solve_dijkstra(origin, destination, weather_weights, penalty1)

        direct_weights = {"distance": 0.6, "time": 0.2, "weather": 0.1, "congestion": 0.05, "delayRisk": 0.05}
        penalty2: set[str] = set()
        if alt1["path"]:
            for i in range(len(alt1["path"]) - 1):
                penalty2.add(f"{alt1['path'][i]}->{alt1['path'][i + 1]}")
        alt2 = self.solve_astar(origin, destination, direct_weights, penalty2)

        alternatives: list[dict[str, Any]] = []
        if alt1["path"] and alt1["path"] != primary["path"]:
            alternatives.append(
                self.build_result(
                    alt1["path"], "Dijkstra (Weather Averse)", weather_weights,
                    alt1["explored_nodes"], alt1["execution_time_ms"],
                )
            )
        if (
            alt2["path"]
            and alt2["path"] != primary["path"]
            and (not alt1["path"] or alt2["path"] != alt1["path"])
        ):
            alternatives.append(
                self.build_result(
                    alt2["path"], "A* (Fuel / Minimum Distance)", direct_weights,
                    alt2["explored_nodes"], alt2["execution_time_ms"],
                )
            )

        d_bench = self.solve_dijkstra(origin, destination, default_weights)
        a_bench = self.solve_astar(origin, destination, default_weights)
        gain_pct = 0
        if d_bench["explored_nodes"] > 0:
            gain_pct = _js_round(
                (d_bench["explored_nodes"] - a_bench["explored_nodes"]) / d_bench["explored_nodes"] * 100
            )

        add_log("INFO", "ROUTING", f"Computed route for {origin} -> {destination} using {primary_algo_name}")

        from datetime import datetime, timezone

        return {
            "recommended": recommended,
            "alternatives": alternatives,
            "benchmark": {
                "dijkstraExplored": d_bench["explored_nodes"],
                "dijkstraTimeMs": d_bench["execution_time_ms"],
                "astarExplored": a_bench["explored_nodes"],
                "astarTimeMs": a_bench["execution_time_ms"],
                "efficiencyGainPct": max(0, gain_pct),
            },
            "weights": default_weights,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }


routing_engine = RoutingEngine()
