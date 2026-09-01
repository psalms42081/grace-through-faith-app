import { Router } from "express";
import { openaiClientOptions } from "../openai-env";
import { withSdaLens, SDA_LENS_VERSION } from "../services/sda-lens";
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

const EGW_COMMENTATOR = {
  dbId: "egw",
  name: "Ellen G. White",
  dates: "1827–1915",
  tradition: "Adventist",
};

const ADVENTIST_PIONEERS = [
  {
    dbId: "uriah-smith",
    name: "Uriah Smith",
    dates: "1832–1903",
    tradition: "Adventist",
    focus: "prophetic interpretation, Daniel and Revelation, sanctuary doctrine, second advent",
  },
  {
    dbId: "jn-andrews",
    name: "J.N. Andrews",
    dates: "1829–1883",
    tradition: "Adventist",
    focus: "Sabbath theology, church history, law and grace, prophetic fulfillment",
  },
  {
    dbId: "john-loughborough",
    name: "John Loughborough",
    dates: "1832–1924",
    tradition: "Adventist",
    focus: "early church history, spiritual gifts, Adventist distinctives",
  },
  {
    dbId: "joseph-bates",
    name: "Joseph Bates",
    dates: "1792–1872",
    tradition: "Adventist",
    focus: "Sabbath restoration, sanctification, the third angel's message",
  },
  {
    dbId: "james-white",
    name: "James White",
    dates: "1821–1881",
    tradition: "Adventist",
    focus: "grace and the law, church organization, prophetic study",
  },
];

async function generateEgwInsight(bookName: string, chapter: number): Promise<string | null> {
  try {
    const OpenAI = (await import("openai")).default;
    const { getTimeout } = await import("../services/api-client");
    const { withAIConcurrency } = await import("../services/ai-semaphore");
    const client = new OpenAI({
      ...openaiClientOptions(),
      timeout: getTimeout("openai"),
    });
    const resp = await withAIConcurrency(() => client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: withSdaLens(`You are an Adventist Bible study assistant. Provide a brief Adventist perspective on the given Bible chapter, drawing on themes commonly found in Ellen G. White's writings. Focus on the Great Controversy theme, character of God, practical Christian living, and the Sabbath where relevant. Do NOT fabricate specific EGW quotes — instead summarize thematic insights she emphasized. Keep the tone reverent and educational. Write in third person ("White emphasized..." not "I wrote..."). Limit to 2-3 paragraphs.`),
        },
        {
          role: "user",
          content: `Provide an Adventist perspective on ${bookName} chapter ${chapter}, highlighting themes Ellen G. White commonly addressed regarding this passage.`,
        },
      ],
    }));
    return resp.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[EGW Insight] Generation failed:", err);
    return null;
  }
}

async function generatePioneerInsight(pioneer: typeof ADVENTIST_PIONEERS[number], bookName: string, chapter: number): Promise<string | null> {
  try {
    const OpenAI = (await import("openai")).default;
    const { getTimeout } = await import("../services/api-client");
    const { withAIConcurrency } = await import("../services/ai-semaphore");
    const client = new OpenAI({
      ...openaiClientOptions(),
      timeout: getTimeout("openai"),
    });
    const resp = await withAIConcurrency(() => client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: withSdaLens(`You are an Adventist Bible study assistant. Provide a brief thematic summary of how ${pioneer.name} (${pioneer.dates}), an early Adventist pioneer, would have approached the given Bible chapter based on their known theological emphases: ${pioneer.focus}. Do NOT fabricate specific quotes — instead summarize thematic insights ${pioneer.name.split(" ").pop()} was known to emphasize. Write in third person ("${pioneer.name.split(" ").pop()} emphasized..." or "${pioneer.name.split(" ").pop()} argued..."). Keep the tone reverent and educational. Limit to 2-3 paragraphs.`),
        },
        {
          role: "user",
          content: `Provide a thematic summary of how ${pioneer.name} would have approached ${bookName} chapter ${chapter}, based on their theological emphases: ${pioneer.focus}.`,
        },
      ],
    }));
    return resp.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error(`[Pioneer Insight] ${pioneer.name} generation failed:`, err);
    return null;
  }
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

    const existingIds = new Set(existing.map((e: any) => e.entry?.commentatorId || e.commentatorId));

    const allExpectedIds = [
      EGW_COMMENTATOR.dbId,
      ...ADVENTIST_PIONEERS.map(p => p.dbId),
      ...COMMENTARY_SOURCES.map(s => s.dbId),
    ];
    const hasMissing = allExpectedIds.some(id => !existingIds.has(id));

    if (existing.length > 0 && !hasMissing) {
      return res.json(existing);
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

    if (!commentatorMap[EGW_COMMENTATOR.dbId]) {
      await db.insert(commentators).values({
        id: EGW_COMMENTATOR.dbId,
        name: EGW_COMMENTATOR.name,
        dates: EGW_COMMENTATOR.dates,
        tradition: EGW_COMMENTATOR.tradition,
      }).onConflictDoNothing();
    }

    const existingEgw = await db.select()
      .from(commentaryEntries)
      .where(and(
        eq(commentaryEntries.commentatorId, EGW_COMMENTATOR.dbId),
        eq(commentaryEntries.bookId, Number(bookId)),
        eq(commentaryEntries.chapter, Number(chapter))
      ))
      .limit(1);

    if (existingEgw.length > 0) {
      const egwRow = await db.select().from(commentators).where(eq(commentators.id, EGW_COMMENTATOR.dbId)).limit(1);
      results.unshift({ entry: existingEgw[0], commentator: egwRow[0] || null });
    } else {
      const egwContent = await generateEgwInsight(bookName, Number(chapter));
      if (egwContent) {
        const [egwInserted] = await db
          .insert(commentaryEntries)
          .values({
            commentatorId: EGW_COMMENTATOR.dbId,
            bookId: Number(bookId),
            chapter: Number(chapter),
            content: egwContent,
            title: `${bookName} ${chapter} — ${EGW_COMMENTATOR.name}`,
          })
          .returning();

        const egwRow = await db.select().from(commentators).where(eq(commentators.id, EGW_COMMENTATOR.dbId)).limit(1);
        results.unshift({ entry: egwInserted, commentator: egwRow[0] || null });
      }
    }

    for (const pioneer of ADVENTIST_PIONEERS) {
      if (!commentatorMap[pioneer.dbId]) {
        await db.insert(commentators).values({
          id: pioneer.dbId,
          name: pioneer.name,
          dates: pioneer.dates,
          tradition: pioneer.tradition,
        }).onConflictDoNothing();
        commentatorMap[pioneer.dbId] = pioneer.dbId;
      }

      const existingPioneer = await db.select()
        .from(commentaryEntries)
        .where(and(
          eq(commentaryEntries.commentatorId, pioneer.dbId),
          eq(commentaryEntries.bookId, Number(bookId)),
          eq(commentaryEntries.chapter, Number(chapter))
        ))
        .limit(1);

      if (existingPioneer.length > 0) {
        const pRow = await db.select().from(commentators).where(eq(commentators.id, pioneer.dbId)).limit(1);
        results.push({ entry: existingPioneer[0], commentator: pRow[0] || null });
      } else {
        const content = await generatePioneerInsight(pioneer, bookName, Number(chapter));
        if (content) {
          const [inserted] = await db
            .insert(commentaryEntries)
            .values({
              commentatorId: pioneer.dbId,
              bookId: Number(bookId),
              chapter: Number(chapter),
              content,
              title: `${bookName} ${chapter} — ${pioneer.name}`,
            })
            .returning();

          const pRow = await db.select().from(commentators).where(eq(commentators.id, pioneer.dbId)).limit(1);
          results.push({ entry: inserted, commentator: pRow[0] || null });
        }
      }
    }

    return res.json(results);
  } catch (err) {
    console.error("Commentary fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch commentary" });
  }
});

export default router;
