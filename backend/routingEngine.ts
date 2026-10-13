import { GraphNode, GraphEdge, RouteWeights, RouteOptimizationResult, RouteRecommendationResponse } from './types';
import { dataService } from './dataService';
import { mlEngine } from './mlEngine';
import { addLog } from './logger';

// ML-derived delay risk (cached) replaces the static graph value so routing
// costs and reported risk reflect the trained model's severity predictions.
function edgeDelayRisk(edge: GraphEdge): number {
  return mlEngine.getEdgeDelayRisk(edge.from, edge.to);
}

// Haversine formula in Nautical Miles
export function haversineDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R_NM = 3440.065;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R_NM * c * 10) / 10;
}

// Compute single edge cost given weights
export function calculateEdgeCost(edge: GraphEdge, weights: RouteWeights): number {
  const normDistance = edge.distance_nm / 2500.0;
  const normTime = edge.base_time_min / 300.0;
  const normWeather = edge.weather_risk;
  const normCongestion = edge.congestion_risk;
  const normDelayRisk = edgeDelayRisk(edge);

  const cost =
    weights.distance * normDistance +
    weights.time * normTime +
    weights.weather * normWeather +
    weights.congestion * normCongestion +
    weights.delayRisk * normDelayRisk;

  return Math.max(0.001, cost);
}

// Min Priority Queue implementation
class PriorityQueue<T> {
  private items: { priority: number; value: T }[] = [];

  push(value: T, priority: number) {
    this.items.push({ priority, value });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  pop(): T | undefined {
    return this.items.shift()?.value;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export class RoutingEngine {
  // Dijkstra Shortest Path Search
  public solveDijkstra(
    origin: string,
    destination: string,
    weights: RouteWeights,
    penaltyEdges: Set<string> = new Set()
  ): { path: string[] | null; totalScore: number; exploredNodes: number; executionTimeMs: number } {
    const startTime = performance.now();
    const { nodes, edges } = dataService.getGraphData();

    if (!nodes[origin] || !nodes[destination]) {
      return { path: null, totalScore: Infinity, exploredNodes: 0, executionTimeMs: 0 };
    }

    if (origin === destination) {
      return { path: [origin], totalScore: 0, exploredNodes: 1, executionTimeMs: performance.now() - startTime };
    }

    // Adjacency map
    const adj: Record<string, { to: string; edge: GraphEdge; cost: number }[]> = {};
    for (const key of Object.keys(nodes)) {
      adj[key] = [];
    }
    for (const edge of edges) {
      if (adj[edge.from]) {
        let cost = calculateEdgeCost(edge, weights);
        const edgeKey = `${edge.from}->${edge.to}`;
        if (penaltyEdges.has(edgeKey)) {
          cost += 2.5; // Penalty for alternative path diversity
        }
        adj[edge.from].push({ to: edge.to, edge, cost });
      }
    }

    const pq = new PriorityQueue<{ node: string; cost: number; path: string[] }>();
    const minCost: Record<string, number> = {};
    let explored = 0;

    pq.push({ node: origin, cost: 0, path: [origin] }, 0);
    minCost[origin] = 0;

    while (!pq.isEmpty()) {
      const current = pq.pop()!;
      explored++;

      if (current.node === destination) {
        const timeMs = performance.now() - startTime;
        return {
          path: current.path,
          totalScore: Math.round(current.cost * 100) / 100,
          exploredNodes: explored,
          executionTimeMs: Math.round(timeMs * 100) / 100,
        };
      }

      if (current.cost > (minCost[current.node] ?? Infinity)) {
        continue;
      }

      for (const neighbor of adj[current.node] || []) {
        const newCost = current.cost + neighbor.cost;
        if (newCost < (minCost[neighbor.to] ?? Infinity)) {
          minCost[neighbor.to] = newCost;
          pq.push({ node: neighbor.to, cost: newCost, path: [...current.path, neighbor.to] }, newCost);
        }
      }
    }

    const timeMs = performance.now() - startTime;
    return { path: null, totalScore: Infinity, exploredNodes: explored, executionTimeMs: Math.round(timeMs * 100) / 100 };
  }

  // A* Search Algorithm with Admissible Haversine Heuristic
  public solveAStar(
    origin: string,
    destination: string,
    weights: RouteWeights,
    penaltyEdges: Set<string> = new Set()
  ): { path: string[] | null; totalScore: number; exploredNodes: number; executionTimeMs: number } {
    const startTime = performance.now();
    const { nodes, edges } = dataService.getGraphData();

    if (!nodes[origin] || !nodes[destination]) {
      return { path: null, totalScore: Infinity, exploredNodes: 0, executionTimeMs: 0 };
    }

    if (origin === destination) {
      return { path: [origin], totalScore: 0, exploredNodes: 1, executionTimeMs: performance.now() - startTime };
    }

    const destNode = nodes[destination];

    // Admissible heuristic: minimum cost per NM
    const minCostPerNm = 0.0003;
    const heuristic = (nodeId: string): number => {
      const n = nodes[nodeId];
      if (!n) return 0;
      const dist = haversineDistanceNm(n.lat, n.lon, destNode.lat, destNode.lon);
      return dist * minCostPerNm * (weights.distance + 0.1);
    };

    const adj: Record<string, { to: string; edge: GraphEdge; cost: number }[]> = {};
    for (const key of Object.keys(nodes)) {
      adj[key] = [];
    }
    for (const edge of edges) {
      if (adj[edge.from]) {
        let cost = calculateEdgeCost(edge, weights);
        const edgeKey = `${edge.from}->${edge.to}`;
        if (penaltyEdges.has(edgeKey)) {
          cost += 2.5;
        }
        adj[edge.from].push({ to: edge.to, edge, cost });
      }
    }

    const pq = new PriorityQueue<{ node: string; g: number; path: string[] }>();
    const gScore: Record<string, number> = {};
    let explored = 0;

    pq.push({ node: origin, g: 0, path: [origin] }, heuristic(origin));
    gScore[origin] = 0;

    while (!pq.isEmpty()) {
      const current = pq.pop()!;
      explored++;

      if (current.node === destination) {
        const timeMs = performance.now() - startTime;
        return {
          path: current.path,
          totalScore: Math.round(current.g * 100) / 100,
          exploredNodes: explored,
          executionTimeMs: Math.round(timeMs * 100) / 100,
        };
      }

      if (current.g > (gScore[current.node] ?? Infinity)) {
        continue;
      }

      for (const neighbor of adj[current.node] || []) {
        const tentativeG = current.g + neighbor.cost;
        if (tentativeG < (gScore[neighbor.to] ?? Infinity)) {
          gScore[neighbor.to] = tentativeG;
          const fScore = tentativeG + heuristic(neighbor.to);
          pq.push({ node: neighbor.to, g: tentativeG, path: [...current.path, neighbor.to] }, fScore);
        }
      }
    }

    const timeMs = performance.now() - startTime;
    return { path: null, totalScore: Infinity, exploredNodes: explored, executionTimeMs: Math.round(timeMs * 100) / 100 };
  }

  // Construct full optimization result with component accounting & human explainability
  public buildResult(
    path: string[],
    algorithm: string,
    weights: RouteWeights,
    explored: number,
    timeMs: number
  ): RouteOptimizationResult {
    const { nodes, edges } = dataService.getGraphData();
    const waypoints: GraphNode[] = path.map((id) => nodes[id] || {
      iata: id,
      icao: `K${id}`,
      name: id,
      lat: 0,
      lon: 0,
      region: 'Unknown',
      weather_risk: 0,
      congestion_index: 0,
      elevation_ft: 0,
    });

    let totalDist = 0;
    let totalTime = 0;
    let sumWeather = 0;
    let sumDelayRisk = 0;
    let sumCongestion = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const edge = edges.find((e) => e.from === from && e.to === to);
      if (edge) {
        totalDist += edge.distance_nm;
        totalTime += edge.base_time_min;
        sumWeather += edge.weather_risk * 100;
        sumDelayRisk += edgeDelayRisk(edge) * 100;
        sumCongestion += edge.congestion_risk * 100;
      } else {
        const n1 = nodes[from];
        const n2 = nodes[to];
        if (n1 && n2) {
          totalDist += haversineDistanceNm(n1.lat, n1.lon, n2.lat, n2.lon);
          totalTime += 120;
          sumWeather += ((n1.weather_risk + n2.weather_risk) / 2);
          sumCongestion += ((n1.congestion_index + n2.congestion_index) / 2);
          sumDelayRisk += 25;
        }
      }
    }

    const edgeCount = Math.max(1, path.length - 1);
    const avgWeather = Math.round(sumWeather / edgeCount);
    const avgDelayRisk = Math.round(sumDelayRisk / edgeCount);
    const avgCongestion = Math.round(sumCongestion / edgeCount);

    const distanceCost = Math.round(weights.distance * (totalDist / 2500) * 100) / 100;
    const timeCost = Math.round(weights.time * (totalTime / 300) * 100) / 100;
    const weatherCost = Math.round(weights.weather * (avgWeather / 100) * 100) / 100;
    const congestionCost = Math.round(weights.congestion * (avgCongestion / 100) * 100) / 100;
    const delayRiskCost = Math.round(weights.delayRisk * (avgDelayRisk / 100) * 100) / 100;

    const totalScore = Math.round((distanceCost + timeCost + weatherCost + congestionCost + delayRiskCost) * 100) / 100;
    const fuelProxyGal = Math.round(totalDist * 1.85);

    // Explainability reasoning
    const reasons: string[] = [];
    if (avgWeather < 25) {
      reasons.push(`Low route meteorological turbulence (Avg Weather Risk: ${avgWeather}/100, VFR corridors).`);
    } else if (avgWeather > 50) {
      reasons.push(`Navigates through moderate convective or low-ceiling weather zones (${avgWeather}/100).`);
    }

    if (avgCongestion < 45) {
      reasons.push(`Avoids heavily congested terminal metering sectors (Airspace load factor: ${avgCongestion}/100).`);
    } else {
      reasons.push(`Passes through primary high-throughput hub corridors (${avgCongestion}/100).`);
    }

    if (path.length === 2) {
      reasons.push(`Direct city-pair connection (${totalDist} NM) maximizing block-hour efficiency.`);
    } else {
      reasons.push(`Multi-hop airway routing via ${path.slice(1, -1).join(', ')} to bypass restricted airspace/weather.`);
    }

    return {
      algorithm,
      path,
      waypoints,
      totalScore,
      metrics: {
        totalDistanceNm: Math.round(totalDist),
        estimatedTimeMin: Math.round(totalTime),
        weatherRiskScore: avgWeather,
        delayRiskScore: avgDelayRisk,
        congestionRiskScore: avgCongestion,
        fuelProxyGal,
      },
      componentCosts: {
        distanceCost,
        timeCost,
        weatherCost,
        congestionCost,
        delayRiskCost,
      },
      exploredNodeCount: explored,
      executionTimeMs: timeMs,
      explanation: reasons,
    };
  }

  // Holistic Route Recommendation with Alternatives and Benchmark
  public recommendRoute(
    origin: string,
    destination: string,
    selectedAlgo: 'dijkstra' | 'astar' | 'both',
    weights: RouteWeights
  ): RouteRecommendationResponse {
    const defaultWeights: RouteWeights = {
      distance: weights.distance ?? 0.3,
      time: weights.time ?? 0.2,
      weather: weights.weather ?? 0.25,
      congestion: weights.congestion ?? 0.15,
      delayRisk: weights.delayRisk ?? 0.1,
    };

    // Primary route run
    const primaryAlgoName = selectedAlgo === 'astar' ? 'A*' : 'Dijkstra';
    const primaryResult =
      selectedAlgo === 'astar'
        ? this.solveAStar(origin, destination, defaultWeights)
        : this.solveDijkstra(origin, destination, defaultWeights);

    if (!primaryResult.path) {
      throw new Error(`No viable flight corridor found between ${origin} and ${destination} in the current network graph.`);
    }

    const recommended = this.buildResult(
      primaryResult.path,
      primaryAlgoName,
      defaultWeights,
      primaryResult.exploredNodes,
      primaryResult.executionTimeMs
    );

    // Alternative 1: Weather-Averse Corridor
    const weatherWeights: RouteWeights = {
      distance: 0.15,
      time: 0.1,
      weather: 0.55,
      congestion: 0.1,
      delayRisk: 0.1,
    };
    const penalty1 = new Set<string>();
    if (primaryResult.path.length > 2) {
      for (let i = 0; i < primaryResult.path.length - 1; i++) {
        penalty1.add(`${primaryResult.path[i]}->${primaryResult.path[i + 1]}`);
      }
    }
    const alt1 = this.solveDijkstra(origin, destination, weatherWeights, penalty1);

    // Alternative 2: Direct Fuel/Distance Focused
    const directWeights: RouteWeights = {
      distance: 0.6,
      time: 0.2,
      weather: 0.1,
      congestion: 0.05,
      delayRisk: 0.05,
    };
    const penalty2 = new Set<string>();
    if (alt1.path) {
      for (let i = 0; i < alt1.path.length - 1; i++) {
        penalty2.add(`${alt1.path[i]}->${alt1.path[i + 1]}`);
      }
    }
    const alt2 = this.solveAStar(origin, destination, directWeights, penalty2);

    const alternatives: RouteOptimizationResult[] = [];
    if (alt1.path && JSON.stringify(alt1.path) !== JSON.stringify(primaryResult.path)) {
      alternatives.push(
        this.buildResult(alt1.path, 'Dijkstra (Weather Averse)', weatherWeights, alt1.exploredNodes, alt1.executionTimeMs)
      );
    }
    if (
      alt2.path &&
      JSON.stringify(alt2.path) !== JSON.stringify(primaryResult.path) &&
      (!alt1.path || JSON.stringify(alt2.path) !== JSON.stringify(alt1.path))
    ) {
      alternatives.push(
        this.buildResult(alt2.path, 'A* (Fuel / Minimum Distance)', directWeights, alt2.exploredNodes, alt2.executionTimeMs)
      );
    }

    // Benchmark comparison (Dijkstra vs A*)
    const dBench = this.solveDijkstra(origin, destination, defaultWeights);
    const aBench = this.solveAStar(origin, destination, defaultWeights);
    const gainPct =
      dBench.exploredNodes > 0
        ? Math.round(((dBench.exploredNodes - aBench.exploredNodes) / dBench.exploredNodes) * 100)
        : 0;

    addLog('INFO', 'ROUTING', `Computed route for ${origin} -> ${destination} using ${primaryAlgoName}`);

    return {
      recommended,
      alternatives,
      benchmark: {
        dijkstraExplored: dBench.exploredNodes,
        dijkstraTimeMs: dBench.executionTimeMs,
        astarExplored: aBench.exploredNodes,
        astarTimeMs: aBench.executionTimeMs,
        efficiencyGainPct: Math.max(0, gainPct),
      },
      weights: defaultWeights,
      timestamp: new Date().toISOString(),
    };
  }
}

export const routingEngine = new RoutingEngine();
