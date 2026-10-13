import { app } from '../backend/app';
import { precomputeEdgeRisk } from '../backend/precompute';

// Vercel runs this as a serverless function. Eager edge-risk precomputation is
// skipped by default to keep cold starts small; enable with
// AEROROUTE_PRECOMPUTE_EDGE_RISK=true.
if (process.env.AEROROUTE_PRECOMPUTE_EDGE_RISK === 'true') {
  precomputeEdgeRisk();
}

export default function handler(req: any, res: any) {
  return app(req, res);
}
