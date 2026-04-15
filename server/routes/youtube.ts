import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

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
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=2&key=${apiKey}`;
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
