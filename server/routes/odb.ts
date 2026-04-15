import { Router, type Request, type Response } from "express";

const router = Router();

const ODB_API = "https://odb.org/wp-json/wp/v2/posts";
const CACHE_TTL = 15 * 60 * 1000;

interface CachedData<T> {
  data: T;
  ts: number;
}

let todayCache: CachedData<any> | null = null;
let recentCache: CachedData<any[]> | null = null;

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

router.get("/api/odb/today", async (_req: Request, res: Response) => {
  try {
    if (todayCache && Date.now() - todayCache.ts < CACHE_TTL) {
      return res.json(todayCache.data);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const resp = await fetch(`${ODB_API}?per_page=1&orderby=date&order=desc`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!resp.ok) {
      return res.status(502).json({ error: "Failed to fetch ODB devotional" });
    }
    const posts = await resp.json();
    if (!posts.length) {
      return res.status(404).json({ error: "No devotional found" });
    }

    const mapped = mapPost(posts[0]);
    todayCache = { data: mapped, ts: Date.now() };
    res.json(mapped);
  } catch (err) {
    console.error("[ODB] today error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/odb/recent", async (req: Request, res: Response) => {
  try {
    const count = Math.max(1, Math.min(parseInt(req.query.count as string) || 7, 30));

    if (recentCache && Date.now() - recentCache.ts < CACHE_TTL && recentCache.data.length >= count) {
      return res.json(recentCache.data.slice(0, count));
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const resp = await fetch(`${ODB_API}?per_page=${count}&orderby=date&order=desc`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!resp.ok) {
      return res.status(502).json({ error: "Failed to fetch ODB devotionals" });
    }
    const posts = await resp.json();
    const mapped = posts.map(mapPost);
    recentCache = { data: mapped, ts: Date.now() };
    res.json(mapped);
  } catch (err) {
    console.error("[ODB] recent error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/odb/post/:id", async (req: Request, res: Response) => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const resp = await fetch(`${ODB_API}/${req.params.id}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!resp.ok) {
      return res.status(resp.status === 404 ? 404 : 502).json({ error: "Devotional not found" });
    }
    const post = await resp.json();
    res.json(mapPost(post));
  } catch (err) {
    console.error("[ODB] post error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
