import type { Request, Response, NextFunction } from "express";

interface CacheEntry {
  body: any;
  status: number;
  headers: Record<string, string>;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
let hits = 0;
let misses = 0;

const CLEANUP_INTERVAL = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
}, CLEANUP_INTERVAL).unref();

export function getCacheStats() {
  return {
    entries: cache.size,
    hits,
    misses,
    hitRate: hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0,
  };
}

const MAX_ENTRIES = 500;

function buildCacheKey(req: Request): string {
  const params = new URLSearchParams(req.query as Record<string, string>);
  params.sort();
  const qs = params.toString();
  const lang = req.headers["accept-language"] || req.headers["x-content-lang"] || "";
  const base = qs ? `${req.path}?${qs}` : req.path;
  return lang ? `${base}|lang=${lang}` : base;
}

export function cachedResponse(ttlSeconds: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
      return next();
    }

    const key = buildCacheKey(req);
    const cached = cache.get(key);

    if (cached && Date.now() < cached.expiresAt) {
      hits++;
      for (const [h, v] of Object.entries(cached.headers)) {
        res.setHeader(h, v);
      }
      res.setHeader("X-Cache", "HIT");
      return res.status(cached.status).json(cached.body);
    }

    misses++;

    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300 && cache.size < MAX_ENTRIES) {
        cache.set(key, {
          body,
          status: res.statusCode,
          headers: { "Content-Type": "application/json" },
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
      }
      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    } as any;

    next();
  };
}
