import fs from "fs";
import os from "os";
import path from "path";
import { Router, type Request, type Response } from "express";
import { getCalendarDate, normalizeTimeZone } from "../../shared/calendar-date";
import { pickPublishedForDate } from "../odb-select";

const router = Router();

const ODB_API = "https://odb.org/wp-json/wp/v2/posts";
const FRESH_TTL_MS = 24 * 60 * 60 * 1000;
const UNPUBLISHED_TTL_MS = 15 * 60 * 1000;
const CACHE_FILE = path.join(os.tmpdir(), "informed-ministries-odb-daily-cache.json");

type MappedPost = ReturnType<typeof mapPost>;

interface DailyCache {
  posts: MappedPost[];
  today: MappedPost;
  todayDateKey: string;
  exact: boolean;
  ts: number;
}

let memoryCache: DailyCache | null = null;

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .trim();
}

function extractScriptureRef(html: string): string {
  const match = (html || "").match(/search=([^"&]+)/);
  if (match) return decodeURIComponent(match[1].replace(/\+/g, " "));
  return stripHtml(html);
}

function mapPost(p: any) {
  return {
    id: p.id,
    title: stripHtml(p.title?.rendered || ""),
    date: p.date?.split("T")[0] || "",
    author: p.author_name || "",
    verse: stripHtml(p.verse || ""),
    verseRef: extractScriptureRef(p.verse || ""),
    passage: extractScriptureRef(p.passage || ""),
    content: stripHtml(p.content?.rendered || ""),
    thought: stripHtml(p.thought || ""),
    response: stripHtml(p.response || ""),
    insights: stripHtml(p.insights || ""),
    insightsAuthor: p.insights_author || "",
    bibleInAYear: stripHtml(p.bible_in_a_year || ""),
    url: p.link || `https://odb.org/${p.slug || ""}`,
    imageUrl: p.jetpack_featured_media_url || null,
  };
}

function dateKeyFromRequest(req: Request): string {
  return getCalendarDate(new Date(), normalizeTimeZone(req.query.timeZone)).dateKey;
}

function loadDiskCache(): DailyCache | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as DailyCache;
    if (!parsed?.today?.date || !parsed.todayDateKey || !parsed.ts) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDiskCache(cache: DailyCache) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch (err) {
    console.warn("[ODB] could not persist daily cache:", (err as Error).message);
  }
}

function getDailyCache(): DailyCache | null {
  if (memoryCache) return memoryCache;
  const disk = loadDiskCache();
  if (disk) memoryCache = disk;
  return memoryCache;
}

function storeDailyCache(cache: DailyCache) {
  memoryCache = cache;
  saveDiskCache(cache);
}

function cacheTtl(cache: DailyCache): number {
  return cache.exact ? FRESH_TTL_MS : UNPUBLISHED_TTL_MS;
}

function isFreshTodayCache(cache: DailyCache, dateKey: string): boolean {
  return (
    cache.todayDateKey === dateKey &&
    Date.now() - cache.ts < cacheTtl(cache)
  );
}

function isSourceUnreachable(err: unknown): boolean {
  const status = (err as { status?: number }).status;
  return status === 403 || status === 502 || status === 503 || status === 504;
}

async function fetchOdbPosts(perPage: number): Promise<any[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const resp = await fetch(`${ODB_API}?per_page=${perPage}&orderby=date&order=desc`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) {
      const snippet = await resp.text().catch(() => "");
      const blocked =
        resp.status === 403 ||
        resp.status === 503 ||
        /cloudflare|attention required|just a moment/i.test(snippet);
      const error = new Error(
        blocked
          ? `Could not reach ODB source (HTTP ${resp.status})`
          : `Failed to fetch ODB posts (HTTP ${resp.status})`,
      );
      (error as Error & { status: number; sourceStatus: number }).status =
        resp.status === 403 || resp.status === 503 ? resp.status : 502;
      (error as Error & { sourceStatus: number }).sourceStatus = resp.status;
      throw error;
    }
    const posts = await resp.json();
    return Array.isArray(posts) ? posts : [];
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      const error = new Error("Could not reach ODB source (timeout)");
      (error as Error & { status: number }).status = 504;
      throw error;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function serveCachedDay(res: Response, cache: DailyCache, reason: string) {
  console.warn(`[ODB] ${reason}; serving last cached day ${cache.today.date}`);
  return res.json(cache.today);
}

router.get("/api/odb/today", async (req: Request, res: Response) => {
  const dateKey = dateKeyFromRequest(req);
  const cached = getDailyCache();

  if (cached && isFreshTodayCache(cached, dateKey)) {
    return res.json(cached.today);
  }

  try {
    const posts = (await fetchOdbPosts(10)).map(mapPost);
    const picked = pickPublishedForDate(posts, dateKey);

    if (!picked) {
      console.error(`[ODB] today not published yet for ${dateKey}; no prior posts available`);
      if (cached?.today) {
        return serveCachedDay(res, cached, `today not published yet for ${dateKey}`);
      }
      return res.status(404).json({ error: "No devotional found" });
    }

    if (!picked.exact) {
      console.warn(`[ODB] today not published yet for ${dateKey}; serving ${picked.post.date}`);
    }

    storeDailyCache({
      posts,
      today: picked.post,
      todayDateKey: dateKey,
      exact: picked.exact,
      ts: Date.now(),
    });
    res.json(picked.post);
  } catch (err) {
    if (isSourceUnreachable(err) || (err as { sourceStatus?: number }).sourceStatus) {
      console.error(`[ODB] today could not reach source for ${dateKey}:`, err);
    } else {
      console.error(`[ODB] today error for ${dateKey}:`, err);
    }
    if (cached?.today) {
      return serveCachedDay(res, cached, `could not reach source for ${dateKey}`);
    }
    if ((err as { status?: number }).status === 403 || (err as { status?: number }).status === 503) {
      return res.status(502).json({ error: "Could not reach ODB source" });
    }
    if ((err as { status?: number }).status === 502 || (err as { status?: number }).status === 504) {
      return res.status(502).json({ error: "Could not reach ODB source" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/odb/recent", async (req: Request, res: Response) => {
  const dateKey = dateKeyFromRequest(req);
  const count = Math.max(1, Math.min(parseInt(req.query.count as string) || 7, 30));
  const cached = getDailyCache();

  try {
    if (
      cached &&
      cached.todayDateKey === dateKey &&
      Date.now() - cached.ts < cacheTtl(cached) &&
      cached.posts.length >= count
    ) {
      return res.json(cached.posts.filter((p) => p.date && p.date <= dateKey).slice(0, count));
    }

    const posts = (await fetchOdbPosts(Math.min(count + 5, 30))).map(mapPost);
    const mapped = posts.filter((p) => p.date && p.date <= dateKey);
    const picked = pickPublishedForDate(mapped, dateKey);
    if (picked) {
      const keepExistingToday = Boolean(cached && cached.todayDateKey === dateKey);
      storeDailyCache({
        posts: mapped,
        today: keepExistingToday && cached ? cached.today : picked.post,
        todayDateKey: dateKey,
        exact: keepExistingToday && cached ? cached.exact : picked.exact,
        ts: Date.now(),
      });
    }
    res.json(mapped.slice(0, count));
  } catch (err) {
    if (isSourceUnreachable(err) || (err as { sourceStatus?: number }).sourceStatus) {
      console.error(`[ODB] recent could not reach source for ${dateKey}:`, err);
    } else {
      console.error("[ODB] recent error:", err);
    }
    if (cached?.posts?.length) {
      console.warn(`[ODB] serving last cached recent days after source failure`);
      return res.json(cached.posts.filter((p) => p.date && p.date <= dateKey).slice(0, count));
    }
    if ((err as { status?: number }).status === 502 || (err as { status?: number }).status === 504 ||
        (err as { status?: number }).status === 403 || (err as { status?: number }).status === 503) {
      return res.status(502).json({ error: "Could not reach ODB source" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/odb/post/:id", async (req: Request, res: Response) => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const resp = await fetch(`${ODB_API}/${req.params.id}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    if (!resp.ok) {
      if (resp.status === 403 || resp.status === 503) {
        console.error(`[ODB] post could not reach source: HTTP ${resp.status}`);
        return res.status(502).json({ error: "Could not reach ODB source" });
      }
      return res.status(resp.status === 404 ? 404 : 502).json({ error: "Devotional not found" });
    }
    const post = await resp.json();
    res.json(mapPost(post));
  } catch (err) {
    console.error("[ODB] post could not reach source:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
