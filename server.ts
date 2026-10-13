import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { app } from './backend/app';
import { precomputeEdgeRisk } from './backend/precompute';

const PORT = Number(process.env.PORT) || 3000;

// Vite Middleware for Full-Stack dev mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Precompute ML delay-risk for every network edge so the first routing
  // request does not pay the one-time inference cost.
  precomputeEdgeRisk();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AeroRoute AI] Full-stack engine listening on http://localhost:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\n[AeroRoute AI] Port ${PORT} is already in use.` +
          `\nClose the process using it, or start with a different port:  $env:PORT=3001; npm run dev\n`,
      );
    } else {
      console.error('[AeroRoute AI] Failed to start server:', err);
    }
    process.exit(1);
  });
}

startServer();
