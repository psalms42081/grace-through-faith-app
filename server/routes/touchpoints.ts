import { Router } from "express";
import { TOUCHPOINTS_DATA, TOUCHPOINT_CATEGORIES, searchTouchpoints } from "../data/touchpoints";
import { BIBLE_PROJECT_VIDEOS } from "../data/bibleProjectVideos";
import { db } from "../db";
import { searchCache } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import { getErrorStatusCode } from "../services/ai-semaphore";

const router = Router();

router.get("/api/signposts/daily", (req, res) => {
  try {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const topic = TOUCHPOINTS_DATA[dayOfYear % TOUCHPOINTS_DATA.length];
    if (!topic) {
      return res.status(404).json({ error: "No signpost available" });
    }
    return res.json({
      id: topic.id,
      title: topic.title,
      description: topic.overview,
    });
  } catch (err) {
    console.error("[signposts/daily]", err);
    return res.status(500).json({ error: "Failed to fetch daily signpost" });
  }
});

router.get("/api/touchpoints", (req, res) => {
  const { search } = req.query;
  const topics = search
    ? searchTouchpoints(search as string)
    : TOUCHPOINTS_DATA;

  const summary = topics.map(t => ({
    id: t.id,
    title: t.title,
    category: t.category,
    questionCount: t.questions.length,
  }));

  res.json({ categories: TOUCHPOINT_CATEGORIES, topics: summary });
});

router.get("/api/touchpoints/:topicId", (req, res) => {
  const topic = TOUCHPOINTS_DATA.find(t => t.id === req.params.topicId);
  if (!topic) return res.status(404).json({ error: "Topic not found" });
  const videos = BIBLE_PROJECT_VIDEOS[topic.id] || [];
  res.json({ ...topic, bibleProjectVideos: videos });
});

router.post("/api/touchpoints/:topicId/bible-study", aiGenerationLimiter, async (req, res) => {
  try {
    const topic = TOUCHPOINTS_DATA.find(t => t.id === req.params.topicId);
    if (!topic) return res.status(404).json({ error: "Topic not found" });

    const cacheKey = `touchpoint-study-${topic.id}`;
    const [cached] = await db.select().from(searchCache)
      .where(eq(searchCache.queryHash, cacheKey))
      .limit(1);

    if (cached && cached.expiresAt > new Date()) {
      return res.json(cached.results);
    }

    const allVerses = topic.questions.flatMap(q =>
      q.verses.map(v => `${v.ref}: "${v.text}"`)
    ).join("\n");

    const client = new (await import("openai")).default({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a faithful Bible teacher creating a structured Bible study. Generate a complete Bible study on the topic of "${topic.title}" that:
1. Points to Jesus Christ and the gospel
2. Grounds every point in Scripture
3. Encourages fellowship and church community
4. Provides practical application

Format as JSON:
{
  "title": "Bible Study: ${topic.title}",
  "introduction": "2-3 paragraph introduction connecting the topic to faith",
  "sections": [
    {
      "heading": "Section title",
      "scripture": "Key verse reference",
      "scriptureText": "The verse text",
      "teaching": "2-3 paragraphs of teaching",
      "reflection": "A reflection question"
    }
  ],
  "conclusion": "Closing paragraph pointing to Christ",
  "prayerPrompt": "A suggested prayer",
  "groupDiscussion": ["3-4 discussion questions for small groups"]
}

Use 3-5 sections. Keep it warm, personal, and Christ-centered.`,
        },
        {
          role: "user",
          content: `Create a Bible study on "${topic.title}". Here are key scriptures to consider:\n${allVerses}`,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const studyContent = JSON.parse(response.choices[0]?.message?.content || "{}");

    await db.insert(searchCache).values({
      queryText: `Bible Study: ${topic.title}`,
      queryHash: cacheKey,
      results: studyContent,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    }).onConflictDoUpdate({
      target: searchCache.queryHash,
      set: { results: studyContent, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    });

    return res.json(studyContent);
  } catch (err: any) {
    console.error("Signpost Bible study error:", err);
    const status = getErrorStatusCode(err);
    return res.status(status || 500).json({ error: "Could not generate Bible study" });
  }
});

export default router;
