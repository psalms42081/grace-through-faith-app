import { Router } from "express";
import { db } from "../db";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import { getErrorStatusCode } from "../services/ai-semaphore";
import { strongEntries, verseStrongMaps } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateStrongWordStudy } from "../services/ai-engine";

const router = Router();

router.get("/api/strong/search", async (req, res) => {
  try {
    const { q, language } = req.query;
    if (!q || String(q).trim().length < 2) {
      return res.json([]);
    }
    const searchTerm = `%${String(q).trim().toLowerCase()}%`;
    const conditions = [
      sql`(LOWER(${strongEntries.definition}) LIKE ${searchTerm} OR LOWER(${strongEntries.lemma}) LIKE ${searchTerm} OR LOWER(${strongEntries.transliteration}) LIKE ${searchTerm} OR LOWER(${strongEntries.kjvUsage}) LIKE ${searchTerm} OR LOWER(${strongEntries.id}) LIKE ${searchTerm})`,
    ];
    if (language && (language === "he" || language === "gr")) {
      conditions.push(eq(strongEntries.language, String(language)));
    }
    const results = await db
      .select()
      .from(strongEntries)
      .where(and(...conditions))
      .limit(50);
    return res.json(results);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/strong/:id", async (req, res) => {
  try {
    const [entry] = await db
      .select()
      .from(strongEntries)
      .where(eq(strongEntries.id, String(req.params.id)))
      .limit(1);
    if (!entry) return res.status(404).json({ error: "Strong's entry not found" });
    return res.json(entry);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/strong/verse/:verseId", async (req, res) => {
  try {
    const maps = await db
      .select({
        map: verseStrongMaps,
        entry: strongEntries,
      })
      .from(verseStrongMaps)
      .leftJoin(strongEntries, eq(verseStrongMaps.strongId, strongEntries.id))
      .where(eq(verseStrongMaps.verseId, String(req.params.verseId)))
      .orderBy(verseStrongMaps.wordPosition);

    const seen = new Set<string>();
    const unique = maps.filter((row) => {
      const key = `${row.map.strongId}-${row.map.wordPosition}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.json(unique);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.post("/api/strong/generate", aiGenerationLimiter, async (req, res) => {
  try {
    const { verseId, bookName, chapter, verse, verseText } = req.body;
    if (!verseId || !verseText) {
      return res.status(400).json({ error: "verseId and verseText are required" });
    }

    const existing = await db
      .select({ map: verseStrongMaps, entry: strongEntries })
      .from(verseStrongMaps)
      .leftJoin(strongEntries, eq(verseStrongMaps.strongId, strongEntries.id))
      .where(eq(verseStrongMaps.verseId, verseId))
      .orderBy(verseStrongMaps.wordPosition);

    if (existing.length > 0) {
      const seen = new Set<string>();
      const deduped = existing.filter((row) => {
        const key = `${row.map.strongId}-${row.map.wordPosition}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return res.json(deduped);
    }

    let parsed: any[];
    try {
      parsed = await generateStrongWordStudy({ verseText, bookName, chapter, verse });
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    const langCode = (bookName && ["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"].includes(bookName)) ? "gr" : "he";

    const results: any[] = [];
    const insertedKeys = new Set<string>();

    for (let i = 0; i < parsed.length; i++) {
      const w = parsed[i];
      const sid = w.strongId || `${langCode === "he" ? "H" : "G"}${9000 + i}`;
      const mapKey = `${verseId}-${sid}-${i + 1}`;

      if (insertedKeys.has(mapKey)) continue;
      insertedKeys.add(mapKey);

      await db.insert(strongEntries).values({
        id: sid,
        language: langCode,
        lemma: w.lemma || w.originalWord || "",
        transliteration: w.transliteration || null,
        pronunciation: w.pronunciation || null,
        definition: w.definition || "",
        kjvUsage: w.kjvUsage || null,
      }).onConflictDoNothing();

      const [mapEntry] = await db.insert(verseStrongMaps).values({
        verseId,
        strongId: sid,
        wordPosition: i + 1,
        originalWord: w.originalWord || w.lemma || "",
        translatedWord: w.translatedWord || null,
      }).returning();

      const entry = (await db.select().from(strongEntries).where(eq(strongEntries.id, sid)).limit(1))[0];

      results.push({ map: mapEntry, entry });
    }

    return res.json(results);
  } catch (err) {
    console.error("Word study generation error:", err);
    return res.status(500).json({ error: "Failed to generate word study" });
  }
});

export default router;
