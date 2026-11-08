import { Router } from "express";
import { db } from "../db";
import { featuredVideos } from "../../shared/schema";
import { visibleFeaturedVideo, type FeaturedVideoRow } from "../services/watch-this-week";

const router = Router();

function mapRow(row: typeof featuredVideos.$inferSelect): FeaturedVideoRow {
  const published =
    row.publishedAt instanceof Date
      ? row.publishedAt.toISOString()
      : new Date(row.publishedAt).toISOString();
  return {
    youtubeId: row.youtubeId,
    title: row.title,
    channel: row.channel,
    publishedAt: published,
    featuredWeek: row.featuredWeek,
    hidden: row.hidden,
  };
}

router.get("/api/watch-this-week", async (_req, res) => {
  try {
    const rows = (await db.select().from(featuredVideos)).map(mapRow);
    const video = visibleFeaturedVideo(rows);
    if (!video) {
      res.json({ video: null });
      return;
    }
    res.json({
      video: {
        youtubeId: video.youtubeId,
        title: video.title,
        channel: video.channel,
        publishedAt: video.publishedAt,
        featuredWeek: video.featuredWeek,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[watch-this-week] read failed: ${message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database]")}`,
    );
    res.status(500).json({ video: null, error: "Watch this week is unavailable" });
  }
});

export default router;
