import { Router } from "express";
import {
  isEgwConfigured,
  getBooks,
  getBookToc,
  getChapter,
  searchWritings,
  searchByScripture,
  searchTopical,
  getBookCover,
  getEgwDailyDevotion,
} from "../services/egwService";

const router = Router();

router.get("/status", (_req, res) => {
  res.json({
    configured: isEgwConfigured(),
    message: isEgwConfigured()
      ? "EGW Writings API is configured and ready"
      : "EGW_CLIENT_ID and EGW_CLIENT_SECRET environment variables are required",
  });
});

router.get("/books", async (req, res) => {
  if (!isEgwConfigured()) {
    return res.status(503).json({ error: "EGW API credentials not configured" });
  }
  try {
    const lang = (req.query.lang as string) || "en";
    const books = await getBooks(lang);
    res.json({ books, count: books.length });
  } catch (error: any) {
    console.error("[EGW] Books error:", error.message);
    res.status(500).json({ error: "Failed to fetch EGW books" });
  }
});

router.get("/books/:bookId/toc", async (req, res) => {
  if (!isEgwConfigured()) {
    return res.status(503).json({ error: "EGW API credentials not configured" });
  }
  try {
    const toc = await getBookToc(parseInt(req.params.bookId));
    res.json(toc);
  } catch (error: any) {
    console.error("[EGW] TOC error:", error.message);
    res.status(500).json({ error: "Failed to fetch table of contents" });
  }
});

router.get("/books/:bookId/chapter/:paraId", async (req, res) => {
  if (!isEgwConfigured()) {
    return res.status(503).json({ error: "EGW API credentials not configured" });
  }
  try {
    const content = await getChapter(parseInt(req.params.bookId), req.params.paraId);
    res.json(content);
  } catch (error: any) {
    console.error("[EGW] Chapter error:", error.message);
    res.status(500).json({ error: "Failed to fetch chapter content" });
  }
});

router.get("/search", async (req, res) => {
  if (!isEgwConfigured()) {
    return res.status(503).json({ error: "EGW API credentials not configured" });
  }
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }
  try {
    const lang = (req.query.lang as string) || "en";
    const results = await searchWritings(query, lang);
    res.json({ results, count: results.length, query });
  } catch (error: any) {
    console.error("[EGW] Search error:", error.message);
    res.status(500).json({ error: "Failed to search EGW writings" });
  }
});

router.get("/search/scripture", async (req, res) => {
  if (!isEgwConfigured()) {
    return res.status(503).json({ error: "EGW API credentials not configured" });
  }
  const reference = req.query.ref as string;
  if (!reference) {
    return res.status(400).json({ error: "Query parameter 'ref' is required" });
  }
  try {
    const lang = (req.query.lang as string) || "en";
    const results = await searchByScripture(reference, lang);
    res.json(results);
  } catch (error: any) {
    console.error("[EGW] Scripture search error:", error.message);
    res.status(500).json({ error: "Failed to search by scripture reference" });
  }
});

router.get("/search/topical", async (req, res) => {
  if (!isEgwConfigured()) {
    return res.status(503).json({ error: "EGW API credentials not configured" });
  }
  const topic = req.query.topic as string;
  if (!topic) {
    return res.status(400).json({ error: "Query parameter 'topic' is required" });
  }
  try {
    const lang = (req.query.lang as string) || "en";
    const results = await searchTopical(topic, lang);
    res.json(results);
  } catch (error: any) {
    console.error("[EGW] Topical search error:", error.message);
    res.status(500).json({ error: "Failed to search by topic" });
  }
});

router.get("/covers/:bookId", async (req, res) => {
  try {
    const size = (req.query.size as "small" | "medium" | "large") || "medium";
    const coverUrl = await getBookCover(parseInt(req.params.bookId), size);
    res.json({ coverUrl });
  } catch (error: any) {
    console.error("[EGW] Cover error:", error.message);
    res.status(500).json({ error: "Failed to get cover URL" });
  }
});

router.get("/api/egw/devotional/today", async (req, res) => {
  try {
    const lang = String(req.query.lang || "en");
    const devotion = await getEgwDailyDevotion(lang);
    if (!devotion) {
      return res.status(404).json({
        error: "No devotional available",
      });
    }
    return res.json(devotion);
  } catch (err) {
    console.error("[egw] Devotional endpoint error:", err);
    return res.status(500).json({ error: "Failed to fetch devotional" });
  }
});

export default router;
