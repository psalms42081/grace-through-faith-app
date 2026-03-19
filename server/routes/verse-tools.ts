import { Router } from "express";
import { db } from "../db";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import { getErrorStatusCode } from "../services/ai-semaphore";
import {
  strongEntries,
  verseStrongMaps,
  verseMapCache,
  userPlanProgress,
} from "../../shared/schema";
import { eq } from "drizzle-orm";
import { generateVerseMap, generateQuickInsight } from "../services/ai-engine";

const router = Router();

router.get("/api/verse-map/:verseId", async (req, res) => {
  try {
    const verseId = String(req.params.verseId);

    const rawWords = await db
      .select({
        map: verseStrongMaps,
        entry: strongEntries,
      })
      .from(verseStrongMaps)
      .leftJoin(strongEntries, eq(verseStrongMaps.strongId, strongEntries.id))
      .where(eq(verseStrongMaps.verseId, verseId))
      .orderBy(verseStrongMaps.wordPosition);

    const seen = new Set<string>();
    const words = rawWords.filter((row) => {
      const key = `${row.map.strongId}-${row.map.wordPosition}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const [cached] = await db.select().from(verseMapCache)
      .where(eq(verseMapCache.verseId, String(verseId))).limit(1);

    const crossReferences = cached ? JSON.parse(cached.crossReferences) : [];
    const contextSnippet = cached?.contextSnippet || null;

    return res.json({ words, crossReferences, contextSnippet, hasCachedData: !!cached });
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.post("/api/verse-map/generate", aiGenerationLimiter, async (req, res) => {
  try {
    const { verseId, verseText, verseReference, bookName, chapter, verse } = req.body;
    if (!verseId || !verseText || !verseReference) {
      return res.status(400).json({ error: "verseId, verseText, and verseReference are required" });
    }

    const [existing] = await db.select().from(verseMapCache)
      .where(eq(verseMapCache.verseId, String(verseId))).limit(1);
    if (existing) {
      return res.json({ crossReferences: JSON.parse(existing.crossReferences), contextSnippet: existing.contextSnippet });
    }

    const result = await generateVerseMap({ verseText, verseReference });

    await db.insert(verseMapCache).values({
      verseId,
      crossReferences: JSON.stringify(result.crossReferences),
      contextSnippet: result.contextSnippet,
    }).onConflictDoUpdate({
      target: verseMapCache.verseId,
      set: {
        crossReferences: JSON.stringify(result.crossReferences),
        contextSnippet: result.contextSnippet,
      },
    });

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.post("/api/verses/explain", async (req, res) => {
  try {
    const { reference, lessonContext } = req.body;
    if (!reference || typeof reference !== "string" || reference.trim().length < 3) {
      return res.status(400).json({ error: "A valid Scripture reference is required" });
    }
    const { generateVerseExplanation } = await import("../services/ai-engine");
    const explanation = await generateVerseExplanation({
      reference: reference.trim(),
      lessonContext: lessonContext?.trim(),
    });
    return res.json({ explanation });
  } catch (err) {
    console.error("Verse explanation error:", err);
    return res.json({
      explanation: "Unable to generate an explanation at this time. Please try again later.",
    });
  }
});

router.post("/api/quick-insight", aiGenerationLimiter, async (req, res) => {
  try {
    const { passage, theme } = req.body;
    if (!passage || typeof passage !== "string" || passage.trim().length < 3) {
      return res.status(400).json({ error: "A valid passage reference is required" });
    }

    const insight = await generateQuickInsight({
      passage: passage.trim(),
      theme: theme?.trim(),
    });

    return res.json(insight);
  } catch (err) {
    console.error("Quick insight generation error:", err);
    return res.status(500).json({ error: "Failed to generate quick insight" });
  }
});

router.post("/api/devotionals/complete", async (req, res) => {
  try {
    const { enrollmentId, dayId, journalEntry } = req.body;
    if (!enrollmentId || !dayId) {
      return res.status(400).json({ error: "enrollmentId and dayId are required" });
    }

    const progress = await db
      .insert(userPlanProgress)
      .values({ enrollmentId, dayId, journalEntry })
      .onConflictDoNothing()
      .returning();

    return res.json({ progress: progress[0] ?? null });
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

export default router;
