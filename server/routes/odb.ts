import { Router, type Request, type Response } from "express";
import { odbDateKeyFromTimeZone } from "../odb-select";
import type { OdbStore } from "../odb-store";

const UNAVAILABLE = { error: "Devotional not available yet" };

function dateKeyFromRequest(req: Request): string {
  return odbDateKeyFromTimeZone(req.query.timeZone);
}

function sendUnavailable(res: Response) {
  return res.status(503).json(UNAVAILABLE);
}

function isMissingTable(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  const message = err instanceof Error ? err.message : String(err);
  return code === "42P01" || /relation .*odb_posts.* does not exist/i.test(message);
}

export function createOdbRouter(store: OdbStore): Router {
  const router = Router();

  router.get("/api/odb/today", async (req: Request, res: Response) => {
    const dateKey = dateKeyFromRequest(req);
    try {
      const post = await store.findLatestOnOrBefore(dateKey);
      if (!post) return sendUnavailable(res);
      return res.json(post);
    } catch (err) {
      if (isMissingTable(err)) {
        console.warn("[ODB] today: odb_posts missing; returning 503");
        return sendUnavailable(res);
      }
      console.error(`[ODB] today error for ${dateKey}:`, err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/api/odb/recent", async (req: Request, res: Response) => {
    const dateKey = dateKeyFromRequest(req);
    const count = Math.max(1, Math.min(parseInt(String(req.query.count), 10) || 7, 30));
    try {
      const posts = await store.findRecentOnOrBefore(dateKey, count);
      if (posts.length === 0) return sendUnavailable(res);
      return res.json(posts);
    } catch (err) {
      if (isMissingTable(err)) {
        console.warn("[ODB] recent: odb_posts missing; returning 503");
        return sendUnavailable(res);
      }
      console.error(`[ODB] recent error for ${dateKey}:`, err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/api/odb/post/:id", async (req: Request, res: Response) => {
    const rawId = req.params.id;
    const id = Number.parseInt(typeof rawId === "string" ? rawId : rawId[0], 10);
    if (!Number.isFinite(id)) {
      return res.status(404).json({ error: "Devotional not found" });
    }
    try {
      const post = await store.findBySourceId(id);
      if (!post) return res.status(404).json({ error: "Devotional not found" });
      return res.json(post);
    } catch (err) {
      if (isMissingTable(err)) {
        console.warn("[ODB] post: odb_posts missing; returning 503");
        return sendUnavailable(res);
      }
      console.error("[ODB] post error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
