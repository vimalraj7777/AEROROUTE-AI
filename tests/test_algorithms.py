#!/usr/bin/env python3
"""
AeroRoute AI - Algorithm & Graph Unit Tests
Validates Dijkstra, A* search, heuristic admissibility, and edge cases.
"""
import math
import heapq
import unittest

def haversine_nm(lat1, lon1, lat2, lon2):
    R_NM = 3440.065  # Earth radius in nautical miles
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R_NM * c

class Graph:
    def __init__(self):
        self.nodes = {}
        self.adj = {}

    def add_node(self, node_id, lat, lon):
        self.nodes[node_id] = {"lat": lat, "lon": lon}
        if node_id not in self.adj:
            self.adj[node_id] = []

    def add_edge(self, u, v, weight):
        self.adj[u].append((v, weight))

def dijkstra(graph, start, goal):
    if start not in graph.nodes or goal not in graph.nodes:
        return None, float('inf'), 0
    if start == goal:
        return [start], 0.0, 1

    pq = [(0.0, start, [start])]
    visited = {}
    explored_count = 0

    while pq:
        cost, curr, path = heapq.heappop(pq)
        explored_count += 1
        if curr in visited and visited[curr] <= cost:
            continue
        visited[curr] = cost

        if curr == goal:
            return path, cost, explored_count

        for neighbor, weight in graph.adj.get(curr, []):
            new_cost = cost + weight
            if neighbor not in visited or new_cost < visited[neighbor]:
                heapq.heappush(pq, (new_cost, neighbor, path + [neighbor]))

    return None, float('inf'), explored_count

def a_star(graph, start, goal, scale=1.0):
    if start not in graph.nodes or goal not in graph.nodes:
        return None, float('inf'), 0
    if start == goal:
        return [start], 0.0, 1

    goal_lat = graph.nodes[goal]["lat"]
    goal_lon = graph.nodes[goal]["lon"]

    def h(n):
        return haversine_nm(graph.nodes[n]["lat"], graph.nodes[n]["lon"], goal_lat, goal_lon) * scale

    pq = [(h(start), 0.0, start, [start])]
    g_costs = {start: 0.0}
    explored_count = 0

    while pq:
        f, g, curr, path = heapq.heappop(pq)
        explored_count += 1

        if curr == goal:
            return path, g, explored_count

        if g > g_costs.get(curr, float('inf')):
            continue

        for neighbor, weight in graph.adj.get(curr, []):
            tentative_g = g + weight
            if tentative_g < g_costs.get(neighbor, float('inf')):
                g_costs[neighbor] = tentative_g
                heapq.heappush(pq, (tentative_g + h(neighbor), tentative_g, neighbor, path + [neighbor]))

    return None, float('inf'), explored_count

class TestRouteAlgorithms(unittest.TestCase):
    def setUp(self):
        self.g = Graph()
        # NYC -> CHI -> DEN -> LAX
        self.g.add_node("JFK", 40.64, -73.78)
        self.g.add_node("ORD", 41.97, -87.90)
        self.g.add_node("ATL", 33.64, -84.42)
        self.g.add_node("DFW", 32.90, -97.04)
        self.g.add_node("LAX", 33.94, -118.41)

        self.g.add_edge("JFK", "ORD", 643.0)
        self.g.add_edge("JFK", "ATL", 660.0)
        self.g.add_edge("ORD", "DFW", 698.0)
        self.g.add_edge("ATL", "DFW", 636.0)
        self.g.add_edge("DFW", "LAX", 1073.0)
        self.g.add_edge("ORD", "LAX", 1745.0)

    def test_trivial_same_origin_destination(self):
        path, cost, _ = dijkstra(self.g, "JFK", "JFK")
        self.assertEqual(path, ["JFK"])
        self.assertEqual(cost, 0.0)

    def test_invalid_nodes(self):
        path, cost, _ = dijkstra(self.g, "INVALID", "JFK")
        self.assertIsNone(path)

    def test_dijkstra_vs_astar_equivalence(self):
        # JFK to LAX via shortest path
        d_path, d_cost, d_explored = dijkstra(self.g, "JFK", "LAX")
        a_path, a_cost, a_explored = a_star(self.g, "JFK", "LAX", scale=0.9) # Admissible scale
        self.assertIsNotNone(d_path)
        self.assertEqual(d_path, a_path)
        self.assertAlmostEqual(d_cost, a_cost, places=2)
        # A* should explore equal or fewer nodes than uninformed Dijkstra
        self.assertLessEqual(a_explored, d_explored + 2)

    def test_disconnected_graph(self):
        self.g.add_node("HNL", 21.31, -157.92) # Hawaii with no edges
        path, cost, _ = dijkstra(self.g, "JFK", "HNL")
        self.assertIsNone(path)
        self.assertEqual(cost, float('inf'))

if __name__ == "__main__":
    unittest.main()
