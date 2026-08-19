import { db } from "../db";
import {
  contextCards,
  applicationTemplates,
  chapterContextCache,
  chapterPassageSections,
  bibleBooks,
  bibleVerses,
  searchCache,
} from "../../shared/schema";
import { SDA_LENS_VERSION } from "./sda-lens";
import { eq, and } from "drizzle-orm";
import {
  generateContextCards,
  generateApplicationStudy,
  generateChapterContext,
} from "./ai-engine";

const POPULAR_CHAPTERS: { bookId: number; chapter: number }[] = [
  { bookId: 1, chapter: 1 },
  { bookId: 1, chapter: 2 },
  { bookId: 1, chapter: 3 },
  { bookId: 2, chapter: 14 },
  { bookId: 2, chapter: 20 },
  { bookId: 5, chapter: 6 },
  { bookId: 19, chapter: 1 },
  { bookId: 19, chapter: 23 },
  { bookId: 19, chapter: 91 },
  { bookId: 19, chapter: 119 },
  { bookId: 20, chapter: 3 },
  { bookId: 23, chapter: 40 },
  { bookId: 23, chapter: 53 },
  { bookId: 27, chapter: 2 },
  { bookId: 27, chapter: 7 },
  { bookId: 40, chapter: 5 },
  { bookId: 40, chapter: 6 },
  { bookId: 40, chapter: 24 },
  { bookId: 43, chapter: 1 },
  { bookId: 43, chapter: 3 },
  { bookId: 43, chapter: 14 },
  { bookId: 44, chapter: 2 },
  { bookId: 45, chapter: 8 },
  { bookId: 45, chapter: 12 },
  { bookId: 46, chapter: 13 },
  { bookId: 48, chapter: 5 },
  { bookId: 49, chapter: 6 },
  { bookId: 50, chapter: 4 },
  { bookId: 58, chapter: 11 },
  { bookId: 66, chapter: 1 },
  { bookId: 66, chapter: 14 },
  { bookId: 66, chapter: 21 },
];

async function warmContextCards(bookId: number, chapter: number, bookName: string): Promise<boolean> {
  const existing = await db.select({ id: contextCards.id }).from(contextCards)
    .where(and(eq(contextCards.bookId, bookId), eq(contextCards.chapter, chapter))).limit(1);
  if (existing.length > 0) return false;

  const result = await generateContextCards({ bookId, chapter, bookName, depth: "standard" });
  await db.insert(contextCards).values({
    bookId, chapter,
    title: result.title, content: result.content,
    historicalBackground: result.historicalBackground,
    culturalNotes: result.culturalNotes,
    authorInfo: result.authorInfo,
    dateWritten: result.dateWritten,
    audience: result.audience,
    themes: result.themes,
  });
  return true;
}

async function warmApplicationTemplates(bookId: number, chapter: number, bookName: string): Promise<boolean> {
  const existing = await db.select({ id: applicationTemplates.id }).from(applicationTemplates)
    .where(and(eq(applicationTemplates.bookId, bookId), eq(applicationTemplates.chapter, chapter))).limit(1);
  if (existing.length > 0) return false;

  const result = await generateApplicationStudy({ bookId, chapter, bookName, depth: "standard" });
  await db.insert(applicationTemplates).values({
    bookId, chapter,
    thenContext: result.thenContext,
    nowApplication: result.nowApplication,
    reflectionQuestions: result.reflectionQuestions,
    prayerPrompt: result.prayerPrompt,
    keyTheme: result.keyTheme,
  });
  return true;
}

async function warmChapterContext(bookId: number, chapter: number, bookName: string): Promise<boolean> {
  const existing = await db.select({ id: chapterContextCache.id }).from(chapterContextCache)
    .where(and(eq(chapterContextCache.bookId, bookId), eq(chapterContextCache.chapter, chapter))).limit(1);
  if (existing.length > 0) return false;

  const result = await generateChapterContext({ bookId, chapter, bookName });
  await db.insert(chapterContextCache).values({
    bookId, chapter,
    locations: JSON.stringify(result.locations || []),
    timelineEvents: JSON.stringify(result.timelineEvents || []),
    keyFigures: JSON.stringify(result.keyFigures || []),
    culturalInsights: result.culturalInsights || null,
    geographicalNotes: result.geographicalNotes || null,
  });
  return true;
}

async function warmPassageSections(bookId: number, chapter: number, bookName: string): Promise<boolean> {
  const existing = await db.select({ id: chapterPassageSections.id }).from(chapterPassageSections)
    .where(and(eq(chapterPassageSections.bookId, bookId), eq(chapterPassageSections.chapter, chapter))).limit(1);
  if (existing.length > 0) return false;

  const verses = await db.select({ verse: bibleVerses.verse, text: bibleVerses.text }).from(bibleVerses)
    .where(and(eq(bibleVerses.bookId, bookId), eq(bibleVerses.chapter, chapter)))
    .orderBy(bibleVerses.verse);
  if (verses.length === 0) return false;

  const totalVerses = verses.length;
  const chapterText = verses.map(v => `${v.verse} ${v.text}`).join(" ");

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You divide Bible chapters into natural reading sections for inductive study. Return JSON only.

Rules:
- Sections must be contiguous and non-overlapping
- Together they must cover every verse (1 through ${totalVerses})
- Aim for 2-5 sections depending on chapter length
- Each section should be a coherent narrative or thematic unit
- Labels should be short descriptions (5-8 words max)
- For very short chapters (under 10 verses), return 1-2 sections`,
      },
      {
        role: "user",
        content: `Divide ${bookName} chapter ${chapter} (${totalVerses} verses) into natural study sections.

Chapter text:
${chapterText.substring(0, 4000)}

Return JSON array: [{"verseStart": number, "verseEnd": number, "label": "short description"}]`,
      },
    ],
  });

  let sections: { verseStart: number; verseEnd: number; label: string }[] = [];
  const raw = completion.choices[0]?.message?.content ?? "[]";
  const cleaned = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    sections = [{ verseStart: 1, verseEnd: totalVerses, label: "Full chapter" }];
  } else {
    const valid = parsed.every((s: any) =>
      typeof s.verseStart === "number" && typeof s.verseEnd === "number" &&
      s.verseStart >= 1 && s.verseEnd <= totalVerses && s.verseStart <= s.verseEnd &&
      typeof s.label === "string"
    );
    sections = valid ? parsed : [{ verseStart: 1, verseEnd: totalVerses, label: "Full chapter" }];
  }

  await db.insert(chapterPassageSections).values({ bookId, chapter, sections }).onConflictDoNothing();
  return true;
}

const SDA_LENS_MARKER_HASH = "sda-lens-cache-version";

/**
 * One-time purge of persistent AI-generated content caches whenever the
 * canonical SDA lens prompt version changes. These tables are keyed only by
 * book/chapter (no version column), so without this purge, content generated
 * under an older/generic prompt would keep serving indefinitely.
 */
export async function ensureSdaLensCacheVersion(): Promise<void> {
  const [marker] = await db.select().from(searchCache)
    .where(eq(searchCache.queryHash, SDA_LENS_MARKER_HASH)).limit(1);
  const stored = (marker?.results as { version?: string } | null)?.version;
  if (stored === SDA_LENS_VERSION) return;

  console.log(`[sda-lens] Cache version changed (${stored || "none"} -> ${SDA_LENS_VERSION}); purging generated content caches...`);
  await db.delete(contextCards);
  await db.delete(applicationTemplates);
  await db.delete(chapterContextCache);

  const farFuture = new Date("2099-01-01");
  await db.insert(searchCache).values({
    queryText: "SDA lens cache version marker",
    queryHash: SDA_LENS_MARKER_HASH,
    results: { version: SDA_LENS_VERSION },
    expiresAt: farFuture,
  }).onConflictDoUpdate({
    target: searchCache.queryHash,
    set: { results: { version: SDA_LENS_VERSION }, expiresAt: farFuture },
  });
  console.log("[sda-lens] Purge complete — caches will regenerate under the current lens.");
}

export async function runCacheWarmup(): Promise<void> {
  try {
    await ensureSdaLensCacheVersion();
  } catch (err: any) {
    console.error("[sda-lens] Cache version check failed:", err.message);
  }
  console.log(`[cache-warmup] Starting background warm-up for ${POPULAR_CHAPTERS.length} popular chapters...`);

  const allBooks = await db.select({ id: bibleBooks.id, name: bibleBooks.name }).from(bibleBooks);
  const bookNameMap = new Map(allBooks.map(b => [b.id, b.name]));

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const { bookId, chapter } of POPULAR_CHAPTERS) {
    const bookName = bookNameMap.get(bookId);
    if (!bookName) continue;

    const warmers = [
      { name: "context", fn: () => warmContextCards(bookId, chapter, bookName) },
      { name: "application", fn: () => warmApplicationTemplates(bookId, chapter, bookName) },
      { name: "chapter-context", fn: () => warmChapterContext(bookId, chapter, bookName) },
      { name: "passage-sections", fn: () => warmPassageSections(bookId, chapter, bookName) },
    ];

    for (const warmer of warmers) {
      try {
        const wasGenerated = await warmer.fn();
        if (wasGenerated) {
          generated++;
          console.log(`[cache-warmup] Generated ${warmer.name} for ${bookName} ${chapter}`);
        } else {
          skipped++;
        }
      } catch (err: any) {
        errors++;
        console.error(`[cache-warmup] Error generating ${warmer.name} for ${bookName} ${chapter}:`, err.message?.substring(0, 100));
      }
    }
  }

  console.log(`[cache-warmup] Complete: ${generated} generated, ${skipped} already cached, ${errors} errors`);
}
