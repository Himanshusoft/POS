import { performance } from 'perf_hooks';
import crypto from 'crypto';
import { env } from '../config/env.js';

const SLOW_REQUEST_THRESHOLD_MS = env.SLOW_REQUEST_THRESHOLD_MS || 500;

/**
 * Lightweight, safe request profiling middleware.
 * Measures HTTP method, route, status, duration, and assigns a trace ID.
 * Logs warnings only for requests exceeding the configured slow threshold.
 * Never logs passwords, tokens, secrets, or sensitive customer payloads.
 */
export const requestProfiler = (req, res, next) => {
  const start = performance.now();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  if (!res.headersSent) {
    res.setHeader('X-Request-Id', requestId);
  }

  // Safely inject X-Response-Time before headers are flushed
  const originalEnd = res.end;
  res.end = function (...args) {
    if (!res.headersSent) {
      const duration = Math.round(performance.now() - start);
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
    return originalEnd.apply(this, args);
  };

  // Hook into response finish for clean, concise logging
  res.on('finish', () => {
    const duration = Math.round(performance.now() - start);
    const url = req.originalUrl || req.url;

    // Standard concise access log for all non-OPTIONS API routes:
    // Format: "METHOD /path status duration" (e.g., "GET /api/orders 200 124ms")
    if (req.method !== 'OPTIONS' && url.startsWith('/api')) {
      if ((env.PERF_LOGS_ENABLED || env.ENABLE_PROFILING) && duration >= SLOW_REQUEST_THRESHOLD_MS) {
        console.warn(
          `[SLOW REQUEST] [${requestId}] ${req.method} ${url} ` +
          `status=${res.statusCode} duration=${duration}ms (threshold=${SLOW_REQUEST_THRESHOLD_MS}ms)`
        );
      } else {
        console.log(`${req.method} ${url} ${res.statusCode} ${duration}ms`);
      }
    }
  });

  next();
};

export default requestProfiler;
