# AeroRoute AI — Route Optimization & Graph Engine

## Objective Function
Rather than simple Euclidean distance routing, AeroRoute AI solves for optimal flight corridors using a configurable multi-objective cost function:

$$C(e) = w_d \cdot \frac{D_e}{D_{\max}} + w_t \cdot \frac{T_e}{T_{\max}} + w_w \cdot \frac{W_e}{100} + w_c \cdot \frac{C_e}{100} + w_r \cdot R_e$$

Where:
- $w_d$: Distance / Fuel Proxy Weight (Default: 0.30)
- $w_t$: Flight Time Proxy Weight (Default: 0.20)
- $w_w$: Weather Risk / METAR Penalty Weight (Default: 0.25)
- $w_c$: Terminal Airspace Congestion Weight (Default: 0.15)
- $w_r$: Historical Delay Risk Weight (Default: 0.10)

## Implemented Algorithms
1. **Dijkstra's Algorithm**:
   - Implemented from scratch using min-priority heaps (`heapq` / standard binary heap).
   - Guarantees mathematically lowest total cost on the directed graph with non-negative edge weights.
   - Visits nodes exhaustively in increasing order of cumulative path cost.

2. **A\* Search Algorithm**:
   - Utilizes an admissible and consistent heuristic:
     $$h(n) = \text{HaversineNM}(n, \text{Destination}) \times \min\left(\frac{\text{Cost}}{\text{NM}}\right)$$
   - Significantly reduces state exploration while finding an identically optimal solution under proportional cost bounds.
   - Compares explored node counts side-by-side with Dijkstra in the UI.

## Holistic Alternative Corridors
In addition to the primary optimal path, the engine calculates realistic tactical alternative corridors (e.g. Southern bypass around Midwestern convective weather, Northern corridor, and Direct Fuel-Minimization flight path).
