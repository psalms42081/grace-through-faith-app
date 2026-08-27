import { Router } from "express";
import fetch from "node-fetch";

const router = Router();
const videoStatusCache = new Map<string, { available: boolean; expiresAt: number }>();
const VIDEO_STATUS_TTL_MS = 15 * 60 * 1000;

const SDA_SPEAKERS = [
  "Doug Batchelor",
  "Mark Finley",
  "John Bradshaw",
  "Shawn Boonstra",
  "Ivor Myers",
  "Carlton Byrd",
  "Wes Peppers",
  "Stephen Bohr",
];

router.get("/api/youtube/video-status", async (req, res) => {
  const videoId = typeof req.query.videoId === "string" ? req.query.videoId : "";
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ available: false, error: "Invalid YouTube video ID" });
  }

  const cached = videoStatusCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ available: cached.available });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ available: false, error: "Video verification unavailable" });
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "status");
    url.searchParams.set("id", videoId);
    url.searchParams.set("key", apiKey);
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(503).json({ available: false, error: "Video verification unavailable" });
    }

    const payload = await response.json() as {
      items?: Array<{
        status?: {
          privacyStatus?: string;
          uploadStatus?: string;
          embeddable?: boolean;
        };
      }>;
    };
    const status = payload.items?.[0]?.status;
    const available = Boolean(
      status &&
      (status.privacyStatus === "public" || status.privacyStatus === "unlisted") &&
      status.uploadStatus === "processed" &&
      status.embeddable !== false,
    );
    videoStatusCache.set(videoId, {
      available,
      expiresAt: Date.now() + VIDEO_STATUS_TTL_MS,
    });
    return res.json({ available });
  } catch {
    return res.status(503).json({ available: false, error: "Video verification unavailable" });
  }
});

router.get("/api/youtube/topic-videos", async (req, res) => {
  try {
    const { topic } = req.query;
    if (!topic) {
      return res.status(400).json({ error: "topic is required" });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "YouTube API key not configured" });
    }

    // Pick 3 random speakers for variety
    const shuffled = [...SDA_SPEAKERS].sort(() => Math.random() - 0.5);
    const selectedSpeakers = shuffled.slice(0, 3);

    const results = await Promise.all(
      selectedSpeakers.map(async (speaker) => {
        const query = encodeURIComponent(
          `${speaker} ${topic} Adventist sermon`
        );
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=2&videoEmbeddable=true&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json() as any;

        return (data.items || []).map((item: any) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          speaker: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.high?.url ||
                     item.snippet.thumbnails.medium?.url,
          publishedAt: item.snippet.publishedAt,
        }));
      })
    );

    const videos = results.flat().filter(v => v.videoId);

    return res.json({ videos });
  } catch (err) {
    console.error("[youtube] Topic video search failed:", err);
    return res.status(500).json({ error: "Failed to fetch videos" });
  }
});

export default router;
