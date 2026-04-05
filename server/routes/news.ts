import { Router } from "express";
import { fetchAnnFeed, getAnnFeedCacheStatus } from "../services/annFeedService";

const router = Router();

router.get("/api/news/adventist", async (_req, res) => {
  try {
    const articles = await fetchAnnFeed();
    res.json({ articles, count: articles.length, source: "Adventist News Network" });
  } catch (error: any) {
    console.error("[News] ANN feed error:", error);
    res.status(500).json({ error: "Failed to fetch news feed" });
  }
});

router.get("/api/news/adventist/refresh", async (_req, res) => {
  try {
    const articles = await fetchAnnFeed(true);
    res.json({ articles, count: articles.length, refreshed: true });
  } catch (error: any) {
    console.error("[News] ANN refresh error:", error);
    res.status(500).json({ error: "Failed to refresh news feed" });
  }
});

router.get("/api/news/status", async (_req, res) => {
  const status = getAnnFeedCacheStatus();
  res.json(status);
});

export default router;
