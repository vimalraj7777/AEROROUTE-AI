import { dataService } from './dataService';
import { mlEngine } from './mlEngine';

// Warm the per-edge ML delay-risk cache so the first routing request is fast.
// Skipped automatically when the model is unavailable.
export function precomputeEdgeRisk(): void {
  if (!mlEngine.isModelLoaded()) return;
  const { edges } = dataService.getGraphData();
  const started = performance.now();
  for (const edge of edges) {
    mlEngine.getEdgeDelayRisk(edge.from, edge.to);
  }
  console.log(
    `[AeroRoute AI] Precomputed ML delay-risk for ${edges.length} network edges ` +
      `in ${Math.round(performance.now() - started)} ms.`
  );
}
