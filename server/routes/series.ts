import { Router } from "express";
import { db } from "../db";
import { biblicalSeries, biblicalEpisodes } from "../../shared/schema";
import { eq, asc, desc } from "drizzle-orm";
import { cachedResponse } from "../middleware/response-cache";
import { generateEasterEpisode6 } from "../generate-easter-ep6";
import { generateRev12V8 } from "../generate-rev12-v8";
import { generateDaniel7 } from "../generate-daniel7";
import { generateDaniel2 } from "../generate-daniel2";

const router = Router();

router.get("/api/series", cachedResponse(300), async (_req, res) => {
  try {
    const allSeries = await db
      .select()
      .from(biblicalSeries)
      .orderBy(desc(biblicalSeries.isFeatured), asc(biblicalSeries.sortOrder));

    const allEpisodes = await db
      .select()
      .from(biblicalEpisodes)
      .orderBy(asc(biblicalEpisodes.seriesId), asc(biblicalEpisodes.orderIndex));

    const episodesBySeriesId = new Map<string, typeof allEpisodes>();
    for (const ep of allEpisodes) {
      const list = episodesBySeriesId.get(ep.seriesId) || [];
      list.push(ep);
      episodesBySeriesId.set(ep.seriesId, list);
    }

    const seriesWithEpisodes = allSeries.map((s) => ({
      ...s,
      episodes: episodesBySeriesId.get(s.id) || [],
    }));

    res.json(seriesWithEpisodes);
  } catch (err) {
    console.error("Series list error:", err);
    res.status(500).json({ error: "Failed to fetch series" });
  }
});

router.get("/api/series/:id", cachedResponse(300), async (req, res) => {
  try {
    const { id } = req.params;
    const [series] = await db
      .select()
      .from(biblicalSeries)
      .where(eq(biblicalSeries.id, id));

    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }

    const episodes = await db
      .select()
      .from(biblicalEpisodes)
      .where(eq(biblicalEpisodes.seriesId, id))
      .orderBy(asc(biblicalEpisodes.orderIndex));

    res.json({ ...series, episodes });
  } catch (err) {
    console.error("Series detail error:", err);
    res.status(500).json({ error: "Failed to fetch series" });
  }
});

router.post("/api/series/generate-easter-ep6", async (_req, res) => {
  try {
    res.json({
      status: "started",
      message:
        "Easter Episode 6 'He Is Risen' pipeline started. Check server logs for progress.",
    });

    generateEasterEpisode6()
      .then((videoUrl) => {
        console.log(
          `[easter-ep6-route] Generation complete! Video: ${videoUrl}`
        );
      })
      .catch((err) => {
        console.error(`[easter-ep6-route] Generation failed:`, err);
      });
  } catch (err) {
    console.error("Easter ep6 trigger error:", err);
    res.status(500).json({ error: "Failed to start generation" });
  }
});

router.post("/api/series/generate-rev12-v8", async (_req, res) => {
  try {
    res.json({
      status: "started",
      message:
        "Rev 12 v8 'The Woman and the Dragon' pipeline started. Check server logs for progress.",
    });

    generateRev12V8()
      .then((videoUrl) => {
        console.log(
          `[rev12-v8-route] Generation complete! Video: ${videoUrl}`
        );
      })
      .catch((err) => {
        console.error(`[rev12-v8-route] Generation failed:`, err);
      });
  } catch (err) {
    console.error("Rev12 v8 trigger error:", err);
    res.status(500).json({ error: "Failed to start generation" });
  }
});

router.post("/api/series/generate-daniel7", async (_req, res) => {
  try {
    res.json({
      status: "started",
      message:
        "Daniel 7 'The Four Beasts and the Ancient of Days' pipeline started. Check server logs for progress.",
    });

    generateDaniel7()
      .then((videoUrl) => {
        console.log(
          `[daniel7-route] Generation complete! Video: ${videoUrl}`
        );
      })
      .catch((err) => {
        console.error(`[daniel7-route] Generation failed:`, err);
      });
  } catch (err) {
    console.error("Daniel 7 trigger error:", err);
    res.status(500).json({ error: "Failed to start generation" });
  }
});

router.post("/api/series/generate-daniel2", async (_req, res) => {
  try {
    res.json({
      status: "started",
      message:
        "Daniel 2 'The Great Image' pipeline started. Check server logs for progress.",
    });

    generateDaniel2()
      .then((videoUrl) => {
        console.log(
          `[daniel2-route] Generation complete! Video: ${videoUrl}`
        );
      })
      .catch((err) => {
        console.error(`[daniel2-route] Generation failed:`, err);
      });
  } catch (err) {
    console.error("Daniel 2 trigger error:", err);
    res.status(500).json({ error: "Failed to start generation" });
  }
});

export default router;
