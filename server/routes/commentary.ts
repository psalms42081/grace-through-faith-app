import { Router } from "express";
import { db } from "../db";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import { getErrorStatusCode } from "../services/ai-semaphore";
import { bibleBooks, commentators, commentaryEntries } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

const BOOK_ID_TO_API: Record<number, string> = {
  1:"GEN",2:"EXO",3:"LEV",4:"NUM",5:"DEU",6:"JOS",7:"JDG",8:"RUT",
  9:"1SA",10:"2SA",11:"1KI",12:"2KI",13:"1CH",14:"2CH",15:"EZR",16:"NEH",
  17:"EST",18:"JOB",19:"PSA",20:"PRO",21:"ECC",22:"SNG",23:"ISA",24:"JER",
  25:"LAM",26:"EZK",27:"DAN",28:"HOS",29:"JOL",30:"AMO",31:"OBA",32:"JON",
  33:"MIC",34:"NAM",35:"HAB",36:"ZEP",37:"HAG",38:"ZEC",39:"MAL",
  40:"MAT",41:"MRK",42:"LUK",43:"JHN",44:"ACT",45:"ROM",46:"1CO",47:"2CO",
  48:"GAL",49:"EPH",50:"PHP",51:"COL",52:"1TH",53:"2TH",54:"1TI",55:"2TI",
  56:"TIT",57:"PHM",58:"HEB",59:"JAS",60:"1PE",61:"2PE",62:"1JN",63:"2JN",
  64:"3JN",65:"JUD",66:"REV",
};

const COMMENTARY_SOURCES = [
  { apiId: "matthew-henry", dbId: "matthew-henry", name: "Matthew Henry", dates: "1662–1714", tradition: "Reformed" },
  { apiId: "jamieson-fausset-brown", dbId: "jfb", name: "Jamieson, Fausset & Brown", dates: "1871", tradition: "Presbyterian" },
  { apiId: "adam-clarke", dbId: "adam-clarke", name: "Adam Clarke", dates: "1762–1832", tradition: "Wesleyan" },
  { apiId: "john-gill", dbId: "john-gill", name: "John Gill", dates: "1697–1771", tradition: "Baptist" },
];

/** Retired AI voices — match by slug dbId and display name, never by guessing UUIDs. */
const RETIRED_AI_COMMENTATOR_IDS = new Set([
  "egw",
  "uriah-smith",
  "jn-andrews",
  "john-loughborough",
  "joseph-bates",
  "james-white",
]);

const RETIRED_AI_COMMENTATOR_NAMES = new Set([
  "Ellen G. White",
  "Uriah Smith",
  "J.N. Andrews",
  "John Loughborough",
  "Joseph Bates",
  "James White",
]);

function isRetiredAiCommentator(row: {
  entry?: { commentatorId?: string | null };
  commentator?: { id?: string | null; name?: string | null } | null;
}): boolean {
  const id = row.entry?.commentatorId ?? row.commentator?.id ?? "";
  const name = row.commentator?.name ?? "";
  return RETIRED_AI_COMMENTATOR_IDS.has(id) || RETIRED_AI_COMMENTATOR_NAMES.has(name);
}

async function fetchRealCommentary(apiId: string, bookCode: string, ch: number): Promise<{ verses: { number: number; content: string }[] } | null> {
  try {
    const { fetchWithTimeout } = await import("../services/api-client");
    const resp = await fetchWithTimeout(`https://bible.helloao.org/api/c/${apiId}/${bookCode}/${ch}.json`, {
      service: "external",
      serviceLabel: "bible-commentary",
    });
    if (!resp.ok) return null;
    const data = await resp.json() as any;
    const items = data?.chapter?.content;
    if (!Array.isArray(items) || items.length === 0) return null;
    return {
      verses: items
        .map((v: any) => {
          const raw = v.content;
          const text = Array.isArray(raw) ? raw.join("\n") : (typeof raw === "string" ? raw : "");
          return { number: v.number, content: text };
        })
        .filter((v: any) => v.content && v.content.trim()),
    };
  } catch {
    return null;
  }
}

router.get("/api/commentary", async (req, res) => {
  try {
    const { book, chapter } = req.query;
    if (!book || !chapter) {
      return res.status(400).json({ error: "book and chapter are required" });
    }

    const entries = await db
      .select({ entry: commentaryEntries, commentator: commentators })
      .from(commentaryEntries)
      .leftJoin(commentators, eq(commentaryEntries.commentatorId, commentators.id))
      .where(
        and(
          eq(commentaryEntries.bookId, Number(book)),
          eq(commentaryEntries.chapter, Number(chapter))
        )
      );

    const seen = new Set<string>();
    const deduped = entries.filter((e) => {
      if (isRetiredAiCommentator(e)) return false;
      const key = `${e.entry.commentatorId}_${e.entry.bookId}_${e.entry.chapter}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.json(deduped);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.post("/api/commentary/generate", aiGenerationLimiter, async (req, res) => {
  try {
    const { bookId, chapter } = req.body;
    if (!bookId || !chapter) {
      return res.status(400).json({ error: "bookId and chapter are required" });
    }

    const existing = await db
      .select({ entry: commentaryEntries, commentator: commentators })
      .from(commentaryEntries)
      .leftJoin(commentators, eq(commentaryEntries.commentatorId, commentators.id))
      .where(
        and(
          eq(commentaryEntries.bookId, Number(bookId)),
          eq(commentaryEntries.chapter, Number(chapter))
        )
      );

    const classicExisting = existing.filter((e) => !isRetiredAiCommentator(e));
    const existingIds = new Set(classicExisting.map((e: any) => e.entry?.commentatorId || e.commentatorId));

    const allExpectedIds = COMMENTARY_SOURCES.map(s => s.dbId);
    const hasMissing = allExpectedIds.some(id => !existingIds.has(id));

    if (classicExisting.length > 0 && !hasMissing) {
      return res.json(classicExisting);
    }

    const bookCode = BOOK_ID_TO_API[Number(bookId)];
    if (!bookCode) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    const bookRows = await db
      .select()
      .from(bibleBooks)
      .where(eq(bibleBooks.id, Number(bookId)));

    if (bookRows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    const bookName = bookRows[0].name;

    const existingCommentators = await db.select().from(commentators);
    const commentatorMap: Record<string, string> = {};
    for (const c of existingCommentators) {
      commentatorMap[c.id] = c.id;
    }

    for (const src of COMMENTARY_SOURCES) {
      if (!commentatorMap[src.dbId]) {
        await db.insert(commentators).values({ id: src.dbId, name: src.name, dates: src.dates, tradition: src.tradition }).onConflictDoNothing();
        commentatorMap[src.dbId] = src.dbId;
      }
    }

    const results: any[] = [];

    for (const src of COMMENTARY_SOURCES) {
      const existingSrc = await db.select().from(commentaryEntries).where(
        and(
          eq(commentaryEntries.commentatorId, src.dbId),
          eq(commentaryEntries.bookId, Number(bookId)),
          eq(commentaryEntries.chapter, Number(chapter))
        )
      ).limit(1);

      if (existingSrc.length > 0) {
        const cRow = await db.select().from(commentators).where(eq(commentators.id, src.dbId)).limit(1);
        results.push({ entry: existingSrc[0], commentator: cRow[0] || null });
        continue;
      }

      const data = await fetchRealCommentary(src.apiId, bookCode, Number(chapter));
      if (!data || data.verses.length === 0) continue;

      const fullText = data.verses
        .map(v => v.content.trim())
        .join("\n\n");

      const trimmed = fullText.length > 3000 ? fullText.substring(0, 3000) + "..." : fullText;

      const [inserted] = await db
        .insert(commentaryEntries)
        .values({
          commentatorId: src.dbId,
          bookId: Number(bookId),
          chapter: Number(chapter),
          content: trimmed,
          title: `${bookName} ${chapter} — ${src.name}`,
        })
        .returning();

      const cRow = await db.select().from(commentators).where(eq(commentators.id, src.dbId)).limit(1);
      results.push({ entry: inserted, commentator: cRow[0] || null });
    }

    return res.json(results);
  } catch (err) {
    console.error("Commentary fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch commentary" });
  }
});

export default router;
