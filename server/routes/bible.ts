import { Router } from "express";
  import { db } from "../db";
  import {
    bibleBooks,
    bibleVerses,
    bibleTranslations,
    bibleCache,
    bibleCacheStats,
  } from "../../shared/schema";
  import { eq, and, ilike, sql } from "drizzle-orm";
  import { cachedResponse } from "../middleware/response-cache";
  import { getTranslationId } from "../services/languageAwareContent";

  const router = Router();

  const NLT_BOOK_MAP: Record<string, string> = {
    "Genesis": "Gen", "Exodus": "Exod", "Leviticus": "Lev", "Numbers": "Num",
    "Deuteronomy": "Deut", "Joshua": "Josh", "Judges": "Judg", "Ruth": "Ruth",
    "1 Samuel": "1Sam", "2 Samuel": "2Sam", "1 Kings": "1Kgs", "2 Kings": "2Kgs",
    "1 Chronicles": "1Chr", "2 Chronicles": "2Chr", "Ezra": "Ezra", "Nehemiah": "Neh",
    "Esther": "Esth", "Job": "Job", "Psalms": "Ps", "Proverbs": "Prov",
    "Ecclesiastes": "Eccl", "Song of Solomon": "Song", "Isaiah": "Isa", "Jeremiah": "Jer",
    "Lamentations": "Lam", "Ezekiel": "Ezek", "Daniel": "Dan", "Hosea": "Hos",
    "Joel": "Joel", "Amos": "Amos", "Obadiah": "Obad", "Jonah": "Jonah",
    "Micah": "Mic", "Nahum": "Nah", "Habakkuk": "Hab", "Zephaniah": "Zeph",
    "Haggai": "Hag", "Zechariah": "Zech", "Malachi": "Mal",
    "Matthew": "Matt", "Mark": "Mark", "Luke": "Luke", "John": "John",
    "Acts": "Acts", "Romans": "Rom", "1 Corinthians": "1Cor", "2 Corinthians": "2Cor",
    "Galatians": "Gal", "Ephesians": "Eph", "Philippians": "Phil", "Colossians": "Col",
    "1 Thessalonians": "1Thess", "2 Thessalonians": "2Thess", "1 Timothy": "1Tim",
    "2 Timothy": "2Tim", "Titus": "Titus", "Philemon": "Phlm", "Hebrews": "Heb",
    "James": "Jas", "1 Peter": "1Pet", "2 Peter": "2Pet", "1 John": "1John",
    "2 John": "2John", "3 John": "3John", "Jude": "Jude", "Revelation": "Rev",
  };

  const API_BIBLE_BOOK_MAP: Record<string, string> = {
    "Genesis": "GEN", "Exodus": "EXO", "Leviticus": "LEV", "Numbers": "NUM",
    "Deuteronomy": "DEU", "Joshua": "JOS", "Judges": "JDG", "Ruth": "RUT",
    "1 Samuel": "1SA", "2 Samuel": "2SA", "1 Kings": "1KI", "2 Kings": "2KI",
    "1 Chronicles": "1CH", "2 Chronicles": "2CH", "Ezra": "EZR", "Nehemiah": "NEH",
    "Esther": "EST", "Job": "JOB", "Psalms": "PSA", "Proverbs": "PRO",
    "Ecclesiastes": "ECC", "Song of Solomon": "SNG", "Isaiah": "ISA", "Jeremiah": "JER",
    "Lamentations": "LAM", "Ezekiel": "EZK", "Daniel": "DAN", "Hosea": "HOS",
    "Joel": "JOL", "Amos": "AMO", "Obadiah": "OBA", "Jonah": "JON",
    "Micah": "MIC", "Nahum": "NAM", "Habakkuk": "HAB", "Zephaniah": "ZEP",
    "Haggai": "HAG", "Zechariah": "ZEC", "Malachi": "MAL",
    "Matthew": "MAT", "Mark": "MRK", "Luke": "LUK", "John": "JHN",
    "Acts": "ACT", "Romans": "ROM", "1 Corinthians": "1CO", "2 Corinthians": "2CO",
    "Galatians": "GAL", "Ephesians": "EPH", "Philippians": "PHP", "Colossians": "COL",
    "1 Thessalonians": "1TH", "2 Thessalonians": "2TH", "1 Timothy": "1TI",
    "2 Timothy": "2TI", "Titus": "TIT", "Philemon": "PHM", "Hebrews": "HEB",
    "James": "JAS", "1 Peter": "1PE", "2 Peter": "2PE", "1 John": "1JN",
    "2 John": "2JN", "3 John": "3JN", "Jude": "JUD", "Revelation": "REV",
  };

  const API_BIBLE_TRANSLATIONS: Record<string, { bibleId: string; name: string }> = {
    "NIV": { bibleId: "78a9f6124f344018-01", name: "New International Version" },
    "AMP": { bibleId: "a81b73293d3080c9-01", name: "Amplified Bible" },
    "NASB": { bibleId: "b8ee27bcd1cae43a-01", name: "New American Standard Bible 1995" },
  };

  const apiBibleCache = new Map<string, { data: any; expires: number }>();

  async function checkBibleCache(translation: string, bookId: number, chapterNum: number): Promise<any[] | null> {
    try {
      const cached = await db
        .select()
        .from(bibleCache)
        .where(
          and(
            eq(bibleCache.translation, translation),
            eq(bibleCache.bookId, bookId),
            eq(bibleCache.chapter, chapterNum)
          )
        )
        .limit(1);

      if (cached.length > 0) {
        await db
          .insert(bibleCacheStats)
          .values({ translation, cacheHits: 1, cacheMisses: 0, lastHitAt: new Date() })
          .onConflictDoUpdate({
            target: [bibleCacheStats.translation],
            set: {
              cacheHits: sql`${bibleCacheStats.cacheHits} + 1`,
              lastHitAt: new Date(),
            },
          })
          .catch(() => {});
        return cached[0].versesJson as any[];
      }

      await db
        .insert(bibleCacheStats)
        .values({ translation, cacheHits: 0, cacheMisses: 1, lastMissAt: new Date() })
        .onConflictDoUpdate({
          target: [bibleCacheStats.translation],
          set: {
            cacheMisses: sql`${bibleCacheStats.cacheMisses} + 1`,
            lastMissAt: new Date(),
          },
        })
        .catch(() => {});
      return null;
    } catch {
      return null;
    }
  }

  async function storeBibleCache(
    translation: string,
    bookId: number,
    bookName: string,
    chapterNum: number,
    verses: any[],
    sourceApi: string
  ): Promise<void> {
    try {
      await db
        .insert(bibleCache)
        .values({
          translation,
          bookId,
          bookName,
          chapter: chapterNum,
          versesJson: verses,
          verseCount: verses.length,
          sourceApi,
        })
        .onConflictDoNothing();
    } catch (err: any) {
      console.error(`[bible-cache] Failed to store ${translation} ${bookName} ${chapterNum}:`, err?.message);
    }
  }

  function parseApiBibleText(content: string, bookId: number, chapterNum: number, translationAbbr: string): any[] {
    const verses: any[] = [];
    const lines = content.split(/\n/);
    let currentVerse = 0;
    let currentText = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parts = trimmed.split(/\[(\d+)\]/);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (!part) continue;
        const num = parseInt(part, 10);
        if (!isNaN(num) && num > 0 && num <= 200 && parts[i - 1] !== undefined) {
          if (currentVerse > 0 && currentText.trim()) {
            verses.push({
              id: `${translationAbbr.toLowerCase()}-${bookId}-${chapterNum}-${currentVerse}`,
              translationId: translationAbbr,
              bookId,
              chapter: chapterNum,
              verse: currentVerse,
              text: currentText.trim(),
              searchVector: null,
            });
          }
          currentVerse = num;
          currentText = "";
        } else if (currentVerse > 0) {
          currentText += " " + part;
        } else if (i === 0 && parts.length > 1) {
          continue;
        }
      }
    }

    if (currentVerse > 0 && currentText.trim()) {
      verses.push({
        id: `${translationAbbr.toLowerCase()}-${bookId}-${chapterNum}-${currentVerse}`,
        translationId: translationAbbr,
        bookId,
        chapter: chapterNum,
        verse: currentVerse,
        text: currentText.trim(),
        searchVector: null,
      });
    }

    return verses;
  }

  async function fetchApiBibleChapter(bookName: string, bookId: number, chapterNum: number, translationAbbr: string) {
    const translationConfig = API_BIBLE_TRANSLATIONS[translationAbbr];
    if (!translationConfig) throw new Error(`Unknown API.Bible translation: ${translationAbbr}`);

    const cacheKey = `apibible-${translationAbbr}-${bookId}-${chapterNum}`;
    const cached = apiBibleCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const apiKey = process.env.API_BIBLE_KEY;
    if (!apiKey) throw new Error("API_BIBLE_KEY not configured");

    const apiBibleBookCode = API_BIBLE_BOOK_MAP[bookName];
    if (!apiBibleBookCode) throw new Error(`No API.Bible book mapping for: ${bookName}`);

    const chapterId = `${apiBibleBookCode}.${chapterNum}`;
    const url = `https://rest.api.bible/v1/bibles/${translationConfig.bibleId}/chapters/${chapterId}?content-type=text&include-verse-numbers=true&include-titles=false&include-chapter-numbers=false`;

    const response = await fetch(url, {
      headers: { "api-key": apiKey },
    });
    if (!response.ok) throw new Error(`API.Bible returned ${response.status}`);
    const json = await response.json() as any;
    const content = json.data?.content || "";
    const verses = parseApiBibleText(content, bookId, chapterNum, translationAbbr);
    const result = { verses };

    apiBibleCache.set(cacheKey, { data: result, expires: Date.now() + 3600_000 });
    if (apiBibleCache.size > 1000) {
      const oldest = [...apiBibleCache.entries()].sort((a, b) => a[1].expires - b[1].expires);
      for (let i = 0; i < 200; i++) apiBibleCache.delete(oldest[i][0]);
    }

    return result;
  }

  const nltPassageCache = new Map<string, { data: any; expires: number }>();

  function stripNestedSpan(html: string, className: string): string {
    let result = "";
    let i = 0;
    const openTag = `<span class="${className}"`;
    while (i < html.length) {
      const idx = html.toLowerCase().indexOf(openTag.toLowerCase(), i);
      if (idx === -1) {
        result += html.slice(i);
        break;
      }
      result += html.slice(i, idx);
      let depth = 1;
      let j = html.indexOf(">", idx) + 1;
      while (j < html.length && depth > 0) {
        if (html.slice(j, j + 5).toLowerCase() === "<span") {
          depth++;
          j = html.indexOf(">", j) + 1;
        } else if (html.slice(j, j + 7).toLowerCase() === "</span>") {
          depth--;
          j += 7;
        } else {
          j++;
        }
      }
      i = j;
    }
    return result;
  }

  function parseNltHtml(html: string, bookId: number, chapterNum: number): any[] {
    const verses: any[] = [];
    const verseRegex = /<verse_export[^>]*bk="[^"]*"[^>]*ch="(\d+)"[^>]*vn="(\d+)"[^>]*>([\s\S]*?)<\/verse_export>/gi;
    let match;
    while ((match = verseRegex.exec(html)) !== null) {
      const vn = parseInt(match[2], 10);
      let text = match[3];
      text = text.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, "");
      text = text.replace(/<p class="psa-title"[^>]*>[\s\S]*?<\/p>/gi, "");
      text = text.replace(/<p class="subhead"[^>]*>[\s\S]*?<\/p>/gi, "");
      text = stripNestedSpan(text, "tn");
      text = text
        .replace(/<a class="a-tn"[^>]*>\*?<\/a>/gi, "")
        .replace(/<span class="vn">\d+<\/span>/gi, "")
        .replace(/<span class="s-heb">[^<]*<\/span>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) {
        verses.push({
          id: `nlt-${bookId}-${chapterNum}-${vn}`,
          translationId: "NLT",
          bookId,
          chapter: chapterNum,
          verse: vn,
          text,
          searchVector: null,
        });
      }
    }
    return verses;
  }

  async function fetchNltChapter(bookName: string, bookId: number, chapterNum: number) {
    const cacheKey = `nlt-${bookId}-${chapterNum}`;
    const cached = nltPassageCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const apiKey = process.env.NLT_API_KEY;
    if (!apiKey) throw new Error("NLT_API_KEY not configured");

    const nltBook = NLT_BOOK_MAP[bookName] || bookName;
    const url = `https://api.nlt.to/api/passages?ref=${encodeURIComponent(nltBook)}.${chapterNum}&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`NLT API returned ${response.status}`);
    const html = await response.text();
    const verses = parseNltHtml(html, bookId, chapterNum);
    const result = { verses };

    nltPassageCache.set(cacheKey, { data: result, expires: Date.now() + 3600_000 });
    if (nltPassageCache.size > 500) {
      const oldest = [...nltPassageCache.entries()].sort((a, b) => a[1].expires - b[1].expires);
      for (let i = 0; i < 100; i++) nltPassageCache.delete(oldest[i][0]);
    }

    return result;
  }

  router.get("/api/passage", async (req, res) => {
  try {
    const { book, chapter, translation = "KJV" } = req.query;
    if (!book || !chapter) {
      return res.status(400).json({ error: "book and chapter are required" });
    }
    const chapterNum = Number(chapter);
    if (isNaN(chapterNum) || chapterNum < 1) {
      return res.status(400).json({ error: "chapter must be a positive number" });
    }

    let bookRecord;
    const bookNum = Number(book);
    if (!isNaN(bookNum)) {
      bookRecord = await db
        .select()
        .from(bibleBooks)
        .where(eq(bibleBooks.id, bookNum))
        .limit(1);
    } else {
      bookRecord = await db
        .select()
        .from(bibleBooks)
        .where(ilike(bibleBooks.name, String(book)))
        .limit(1);
    }

    if (!bookRecord || !bookRecord.length) {
      return res.status(404).json({ error: "Book not found" });
    }

    const bookId = bookRecord[0].id;
    const bookName = bookRecord[0].name;

    const translationUpper = String(translation).toUpperCase();

    if (translationUpper === "NLT") {
      const cachedVerses = await checkBibleCache("NLT", bookId, chapterNum);
      if (cachedVerses) {
        return res.json({ book: bookRecord[0], chapter: chapterNum, verses: cachedVerses, cached: true });
      }
      try {
        const nltData = await fetchNltChapter(bookName, bookId, chapterNum);
        if (nltData.verses.length > 0) {
          storeBibleCache("NLT", bookId, bookName, chapterNum, nltData.verses, "nlt_api");
        }
        return res.json({ book: bookRecord[0], chapter: chapterNum, verses: nltData.verses, cached: false });
      } catch (err: any) {
        console.error("NLT API error:", err?.message);
        return res.status(502).json({ error: "Could not fetch NLT translation" });
      }
    }

    if (API_BIBLE_TRANSLATIONS[translationUpper]) {
      const cachedVerses = await checkBibleCache(translationUpper, bookId, chapterNum);
      if (cachedVerses) {
        return res.json({ book: bookRecord[0], chapter: chapterNum, verses: cachedVerses, cached: true });
      }
      try {
        const abData = await fetchApiBibleChapter(bookName, bookId, chapterNum, translationUpper);
        if (!abData.verses.length) {
          console.error(`API.Bible (${translationUpper}): 0 verses parsed for ${bookName} ${chapterNum}`);
          return res.status(502).json({ error: `Could not parse ${translationUpper} content` });
        }
        storeBibleCache(translationUpper, bookId, bookName, chapterNum, abData.verses, "api_bible");
        return res.json({ book: bookRecord[0], chapter: chapterNum, verses: abData.verses, cached: false });
      } catch (err: any) {
        console.error(`API.Bible (${translationUpper}) error:`, err?.message);
        return res.status(502).json({ error: `Could not fetch ${translationUpper} translation` });
      }
    }

    const translationRecord = await db
      .select()
      .from(bibleTranslations)
      .where(eq(bibleTranslations.abbreviation, String(translation)))
      .limit(1);

    if (!translationRecord.length) {
      return res.status(404).json({ error: "Translation not found" });
    }

    const verses = await db
      .select()
      .from(bibleVerses)
      .where(
        and(
          eq(bibleVerses.bookId, bookId),
          eq(bibleVerses.chapter, chapterNum),
          eq(bibleVerses.translationId, translationRecord[0].id)
        )
      )
      .orderBy(bibleVerses.verse);

    return res.json({ book: bookRecord[0], chapter: chapterNum, verses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── BOOKS ──────────────────────────────────────────────────────────────────

router.get("/api/books", cachedResponse(300), async (_req, res) => {
  try {
    const books = await db.select().from(bibleBooks).orderBy(bibleBooks.orderIndex);
    return res.json(books);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── TRANSLATIONS ──────────────────────────────────────────────────────────

router.get("/api/translations", cachedResponse(600), async (_req, res) => {
  try {
    const translations = await db.select().from(bibleTranslations);
    if (process.env.NLT_API_KEY) {
      translations.push({
        id: "NLT",
        name: "New Living Translation",
        abbreviation: "NLT",
        language: "en",
      } as any);
    }
    if (process.env.API_BIBLE_KEY) {
      for (const [abbr, config] of Object.entries(API_BIBLE_TRANSLATIONS)) {
        translations.push({
          id: abbr,
          name: config.name,
          abbreviation: abbr,
          language: "en",
        } as any);
      }
    }
    return res.json(translations);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/translation-for-language", async (req, res) => {
  try {
    const { lang = "en" } = req.query;
    const translationAbbr = getTranslationId(String(lang));
    const record = await db
      .select()
      .from(bibleTranslations)
      .where(eq(bibleTranslations.abbreviation, translationAbbr))
      .limit(1);

    if (!record.length) {
      const fallback = await db
        .select()
        .from(bibleTranslations)
        .where(eq(bibleTranslations.abbreviation, "KJV"))
        .limit(1);
      return res.json(fallback[0] || { abbreviation: "KJV" });
    }

    return res.json(record[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── VERSE ──────────────────────────────────────────────────────────────────

router.get("/api/verse", async (req, res) => {
  try {
    const { book, chapter, verse, translation = "KJV" } = req.query;
    if (!book || !chapter || !verse) {
      return res.status(400).json({ error: "book, chapter, and verse are required" });
    }

    const chapterNum = Number(chapter);
    if (isNaN(chapterNum) || chapterNum < 1) {
      return res.status(400).json({ error: "chapter must be a positive number" });
    }

    const translationRecord = await db
      .select()
      .from(bibleTranslations)
      .where(eq(bibleTranslations.abbreviation, String(translation)))
      .limit(1);

    if (!translationRecord.length) {
      return res.status(404).json({ error: "Translation not found" });
    }

    const verseRecord = await db
      .select()
      .from(bibleVerses)
      .where(
        and(
          eq(bibleVerses.bookId, Number(book)),
          eq(bibleVerses.chapter, chapterNum),
          eq(bibleVerses.verse, Number(verse)),
          eq(bibleVerses.translationId, translationRecord[0].id)
        )
      )
      .limit(1);

    if (!verseRecord.length) {
      return res.status(404).json({ error: "Verse not found" });
    }

    return res.json(verseRecord[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── SEARCH ─────────────────────────────────────────────────────────────────

router.get("/api/search", async (req, res) => {
  try {
    const { q, translation = "KJV", limit: limitStr = "50" } = req.query;
    if (!q) {
      return res.status(400).json({ error: "q (query) is required" });
    }

    const query = String(q).trim();
    const resultLimit = Math.min(Number(limitStr) || 50, 100);

    const translationRecord = await db
      .select()
      .from(bibleTranslations)
      .where(eq(bibleTranslations.abbreviation, String(translation)))
      .limit(1);

    if (!translationRecord.length) {
      return res.status(404).json({ error: "Translation not found" });
    }

    const results = await db
      .select({
        id: bibleVerses.id,
        bookId: bibleVerses.bookId,
        chapter: bibleVerses.chapter,
        verse: bibleVerses.verse,
        text: bibleVerses.text,
        bookName: bibleBooks.name,
        bookAbbreviation: bibleBooks.abbreviation,
      })
      .from(bibleVerses)
      .innerJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
      .where(
        and(
          eq(bibleVerses.translationId, translationRecord[0].id),
          ilike(bibleVerses.text, `%${query}%`)
        )
      )
      .orderBy(bibleBooks.orderIndex, bibleVerses.chapter, bibleVerses.verse)
      .limit(resultLimit);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bibleVerses)
      .where(
        and(
          eq(bibleVerses.translationId, translationRecord[0].id),
          ilike(bibleVerses.text, `%${query}%`)
        )
      );

    const totalCount = Number(countResult[0]?.count ?? 0);

    return res.json({ results, total: totalCount, returned: results.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/search/reference", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: "q (query) is required" });
    }

    const query = String(q).trim();

    const refMatch = query.match(/^(\d?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/);
    if (!refMatch) {
      return res.json({ isReference: false });
    }

    const [, bookPart, chapterStr, verseStr, verseEndStr] = refMatch;
    const bookName = bookPart.trim().toLowerCase();

    const allBooks = await db.select().from(bibleBooks).orderBy(bibleBooks.orderIndex);
    const matchedBook = allBooks.find((b) =>
      b.name.toLowerCase() === bookName ||
      b.abbreviation.toLowerCase() === bookName ||
      b.name.toLowerCase().startsWith(bookName) ||
      b.name.toLowerCase().replace(/\s+/g, "").startsWith(bookName.replace(/\s+/g, ""))
    );

    if (!matchedBook) {
      return res.json({ isReference: false });
    }

    return res.json({
      isReference: true,
      bookId: matchedBook.id,
      bookName: matchedBook.name,
      chapter: parseInt(chapterStr, 10),
      verse: verseStr ? parseInt(verseStr, 10) : null,
      verseEnd: verseEndStr ? parseInt(verseEndStr, 10) : null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/bible-cache/stats", async (_req, res) => {
  try {
    const stats = await db.select().from(bibleCacheStats);
    const cacheRows = await db
      .select({
        translation: bibleCache.translation,
        cachedChapters: sql<number>`count(*)`,
        totalVerses: sql<number>`sum(${bibleCache.verseCount})`,
        oldestFetch: sql<string>`min(${bibleCache.fetchedAt})`,
        newestFetch: sql<string>`max(${bibleCache.fetchedAt})`,
      })
      .from(bibleCache)
      .groupBy(bibleCache.translation);

    const totalChapters = 1189;
    const apiTranslations = ["NLT", "NIV", "AMP", "NASB"];

    const summary = apiTranslations.map((t) => {
      const stat = stats.find((s) => s.translation === t);
      const cache = cacheRows.find((c) => c.translation === t);
      const hits = stat?.cacheHits ?? 0;
      const misses = stat?.cacheMisses ?? 0;
      const total = hits + misses;
      return {
        translation: t,
        cachedChapters: Number(cache?.cachedChapters ?? 0),
        totalPossibleChapters: totalChapters,
        cacheWarmthPct: Number(((Number(cache?.cachedChapters ?? 0) / totalChapters) * 100).toFixed(1)),
        totalVersesCached: Number(cache?.totalVerses ?? 0),
        cacheHits: hits,
        cacheMisses: misses,
        hitRatePct: total > 0 ? Number(((hits / total) * 100).toFixed(1)) : 0,
        lastHitAt: stat?.lastHitAt,
        lastMissAt: stat?.lastMissAt,
        oldestFetch: cache?.oldestFetch,
        newestFetch: cache?.newestFetch,
      };
    });

    return res.json({
      translations: summary,
      totalCachedRows: cacheRows.reduce((sum, r) => sum + Number(r.cachedChapters), 0),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

  export default router;
  