const BIBLE_BOOK_IDS: Record<string, number> = {
  Genesis: 1,
  Exodus: 2,
  Leviticus: 3,
  Numbers: 4,
  Deuteronomy: 5,
  Joshua: 6,
  Judges: 7,
  Ruth: 8,
  "1 Samuel": 9,
  "2 Samuel": 10,
  "1 Kings": 11,
  "2 Kings": 12,
  "1 Chronicles": 13,
  "2 Chronicles": 14,
  Ezra: 15,
  Nehemiah: 16,
  Esther: 17,
  Job: 18,
  Psalms: 19,
  Psalm: 19,
  Proverbs: 20,
  Ecclesiastes: 21,
  "Song of Solomon": 22,
  Isaiah: 23,
  Jeremiah: 24,
  Lamentations: 25,
  Ezekiel: 26,
  Daniel: 27,
  Hosea: 28,
  Joel: 29,
  Amos: 30,
  Obadiah: 31,
  Jonah: 32,
  Micah: 33,
  Nahum: 34,
  Habakkuk: 35,
  Zephaniah: 36,
  Haggai: 37,
  Zechariah: 38,
  Malachi: 39,
  Matthew: 40,
  Mark: 41,
  Luke: 42,
  John: 43,
  Acts: 44,
  Romans: 45,
  "1 Corinthians": 46,
  "2 Corinthians": 47,
  Galatians: 48,
  Ephesians: 49,
  Philippians: 50,
  Colossians: 51,
  "1 Thessalonians": 52,
  "2 Thessalonians": 53,
  "1 Timothy": 54,
  "2 Timothy": 55,
  Titus: 56,
  Philemon: 57,
  Hebrews: 58,
  James: 59,
  "1 Peter": 60,
  "2 Peter": 61,
  "1 John": 62,
  "2 John": 63,
  "3 John": 64,
  Jude: 65,
  Revelation: 66,
};

const BOOK_ALIASES: Record<string, string> = {
  gen: "Genesis",
  "gen.": "Genesis",
  ex: "Exodus",
  "ex.": "Exodus",
  exod: "Exodus",
  "exod.": "Exodus",
  lev: "Leviticus",
  "lev.": "Leviticus",
  num: "Numbers",
  "num.": "Numbers",
  deut: "Deuteronomy",
  "deut.": "Deuteronomy",
  dt: "Deuteronomy",
  "dt.": "Deuteronomy",
  josh: "Joshua",
  "josh.": "Joshua",
  jos: "Joshua",
  "jos.": "Joshua",
  judg: "Judges",
  "judg.": "Judges",
  jdg: "Judges",
  "jdg.": "Judges",
  "1 sam": "1 Samuel",
  "1 sam.": "1 Samuel",
  "1sa": "1 Samuel",
  "2 sam": "2 Samuel",
  "2 sam.": "2 Samuel",
  "1 kgs": "1 Kings",
  "1 kgs.": "1 Kings",
  "1 ki": "1 Kings",
  "2 kgs": "2 Kings",
  "2 kgs.": "2 Kings",
  "1 chr": "1 Chronicles",
  "1 chr.": "1 Chronicles",
  "1 chron": "1 Chronicles",
  "1 chron.": "1 Chronicles",
  "2 chr": "2 Chronicles",
  "2 chr.": "2 Chronicles",
  "2 chron": "2 Chronicles",
  "2 chron.": "2 Chronicles",
  ps: "Psalms",
  "ps.": "Psalms",
  psa: "Psalms",
  "psa.": "Psalms",
  psalm: "Psalms",
  prov: "Proverbs",
  "prov.": "Proverbs",
  pr: "Proverbs",
  "pr.": "Proverbs",
  eccl: "Ecclesiastes",
  "eccl.": "Ecclesiastes",
  song: "Song of Solomon",
  "ss": "Song of Solomon",
  isa: "Isaiah",
  "isa.": "Isaiah",
  jer: "Jeremiah",
  "jer.": "Jeremiah",
  lam: "Lamentations",
  "lam.": "Lamentations",
  ezek: "Ezekiel",
  "ezek.": "Ezekiel",
  ezk: "Ezekiel",
  dan: "Daniel",
  "dan.": "Daniel",
  hos: "Hosea",
  "hos.": "Hosea",
  mal: "Malachi",
  "mal.": "Malachi",
  mt: "Matthew",
  "mt.": "Matthew",
  matt: "Matthew",
  "matt.": "Matthew",
  mk: "Mark",
  "mk.": "Mark",
  lk: "Luke",
  "lk.": "Luke",
  jn: "John",
  "jn.": "John",
  jhn: "John",
  "jhn.": "John",
  rom: "Romans",
  "rom.": "Romans",
  "1 cor": "1 Corinthians",
  "1 cor.": "1 Corinthians",
  "2 cor": "2 Corinthians",
  "2 cor.": "2 Corinthians",
  gal: "Galatians",
  "gal.": "Galatians",
  eph: "Ephesians",
  "eph.": "Ephesians",
  phil: "Philippians",
  "phil.": "Philippians",
  php: "Philippians",
  col: "Colossians",
  "col.": "Colossians",
  "1 th": "1 Thessalonians",
  "1 th.": "1 Thessalonians",
  "1 thess": "1 Thessalonians",
  "2 th": "2 Thessalonians",
  "1 tim": "1 Timothy",
  "1 tim.": "1 Timothy",
  "2 tim": "2 Timothy",
  "2 tim.": "2 Timothy",
  tit: "Titus",
  "tit.": "Titus",
  phlm: "Philemon",
  heb: "Hebrews",
  "heb.": "Hebrews",
  jas: "James",
  "jas.": "James",
  "1 pet": "1 Peter",
  "1 pet.": "1 Peter",
  "1 pe": "1 Peter",
  "2 pet": "2 Peter",
  "1 jn": "1 John",
  "1 jn.": "1 John",
  "1jn": "1 John",
  "2 jn": "2 John",
  "2jn": "2 John",
  "3 jn": "3 John",
  "3jn": "3 John",
  rev: "Revelation",
  "rev.": "Revelation",
};

const NORMALIZED_BOOK_IDS = new Map<string, number>();
for (const [name, id] of Object.entries(BIBLE_BOOK_IDS)) {
  NORMALIZED_BOOK_IDS.set(name.toLowerCase(), id);
}
for (const [alias, canonical] of Object.entries(BOOK_ALIASES)) {
  const id = BIBLE_BOOK_IDS[canonical];
  if (id) NORMALIZED_BOOK_IDS.set(alias.toLowerCase(), id);
}

const BOOK_LABELS = [...NORMALIZED_BOOK_IDS.keys()].sort((a, b) => b.length - a.length);
const BOOK_LABEL_PATTERN = BOOK_LABELS.map((label) =>
  label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
).join("|");
const BOOK_START_RE = new RegExp(`^(${BOOK_LABEL_PATTERN})\\.?`, "i");
const CHAPTER_RE =
  /^(\d+)(?::(\d+)(?:\s*[–—-]\s*(\d+)|((?:\s*,\s*\d+)+))?)?/;

/** Obadiah, Philemon, 2 John, 3 John, and Jude are a single chapter. */
const SINGLE_CHAPTER_BOOKS = new Set([31, 57, 63, 64, 65]);

export interface ParsedScriptureReference {
  bookId: number;
  chapter: number;
  verse?: number;
  verseEnd?: number;
  /** Set when the source lists verses that are not one continuous range. */
  verses?: number[];
}

export interface ScriptureCitation extends ParsedScriptureReference {
  start: number;
  end: number;
  text: string;
}

function verseList(start: number, end: number | null, extras: string | undefined): number[] {
  const verses = [start];
  if (end != null) {
    if (end < start) return [];
    for (let verse = start + 1; verse <= end; verse += 1) verses.push(verse);
    return verses;
  }
  if (extras) {
    for (const piece of extras.split(",")) {
      const verse = Number.parseInt(piece.trim(), 10);
      if (Number.isInteger(verse) && verse > 0) verses.push(verse);
    }
  }
  return verses;
}

function isContiguous(verses: number[]): boolean {
  for (let index = 1; index < verses.length; index += 1) {
    if (verses[index] !== verses[index - 1] + 1) return false;
  }
  return true;
}

function asCitation(
  text: string,
  start: number,
  end: number,
  bookId: number,
  chapter: number,
  verses: number[],
): ScriptureCitation | null {
  let verseStart = verses[0];
  let verseEnd = verses[verses.length - 1];
  let listed = verses;
  if (SINGLE_CHAPTER_BOOKS.has(bookId) && verses.length === 0) {
    verseStart = chapter;
    verseEnd = chapter;
    chapter = 1;
    listed = [verseStart];
  }
  if (!bookId || !Number.isInteger(chapter) || chapter < 1) return null;
  if (listed.some((verse) => !Number.isInteger(verse) || verse < 1)) return null;
  const contiguous = listed.length === 0 || isContiguous(listed);
  return {
    bookId,
    chapter,
    verse: listed.length ? verseStart : undefined,
    verseEnd: contiguous && listed.length > 1 ? verseEnd : undefined,
    verses: contiguous ? undefined : listed,
    start,
    end,
    text: text.slice(start, end),
  };
}

function readChapter(
  source: string,
  requireVerse: boolean,
): { chapter: number; verses: number[]; length: number } | null {
  const match = source.match(CHAPTER_RE);
  if (!match) return null;
  const chapter = Number.parseInt(match[1], 10);
  if (!Number.isInteger(chapter) || chapter < 1) return null;
  const verse = match[2] ? Number.parseInt(match[2], 10) : null;
  if (requireVerse && verse == null) return null;
  const rangeEnd = match[3] ? Number.parseInt(match[3], 10) : null;
  const verses = verse == null ? [] : verseList(verse, rangeEnd, match[4]);
  if (verse != null && verses.length === 0) return null;
  return { chapter, verses, length: match[0].length };
}

/**
 * Reads every citation in a label, including ranges (3:14–18), verse lists
 * (36:15, 16), and a following reference that inherits the book (15:20, 21).
 */
export function parseScriptureReferenceList(reference: string): ScriptureCitation[] {
  const text = reference;
  const hits: ScriptureCitation[] = [];
  let index = 0;
  let lastBookId: number | null = null;

  const push = (citation: ScriptureCitation | null) => {
    if (!citation) return false;
    hits.push(citation);
    lastBookId = citation.bookId;
    index = citation.end;
    return true;
  };

  while (index < text.length) {
    const atBoundary = index === 0 || /[^A-Za-z0-9]/.test(text[index - 1] ?? "");
    const slice = text.slice(index);
    const bookMatch = atBoundary ? slice.match(BOOK_START_RE) : null;
    const bookId = bookMatch
      ? NORMALIZED_BOOK_IDS.get(bookMatch[1].toLowerCase()) ?? null
      : null;

    if (bookId && bookMatch) {
      const afterBook = slice.slice(bookMatch[0].length);
      const space = afterBook.match(/^\s+/)?.[0].length ?? 0;
      if (space > 0) {
        const chapter = readChapter(afterBook.slice(space), false);
        if (chapter) {
          const start = index;
          const end = index + bookMatch[0].length + space + chapter.length;
          if (
            push(
              asCitation(
                text,
                start,
                end,
                bookId,
                SINGLE_CHAPTER_BOOKS.has(bookId) && chapter.verses.length === 0
                  ? 1
                  : chapter.chapter,
                SINGLE_CHAPTER_BOOKS.has(bookId) && chapter.verses.length === 0
                  ? [chapter.chapter]
                  : chapter.verses,
              ),
            )
          ) {
            consumeInherited(text, hits, () => lastBookId);
            index = hits[hits.length - 1]?.end ?? end;
            continue;
          }
        }
      }
    }

    index += 1;
  }

  return hits;

  function consumeInherited(
    source: string,
    existing: ScriptureCitation[],
    book: () => number | null,
  ) {
    while (existing.length > 0) {
      let cursor = existing[existing.length - 1].end;
      let separator = cursor;
      while (separator < source.length && /[\s,;]/.test(source[separator] ?? "")) separator += 1;
      if (separator === cursor || !/[,;]/.test(source.slice(cursor, separator))) return;
      if (BOOK_START_RE.test(source.slice(separator))) return;
      const inherited = book();
      if (!inherited) return;
      const chapter = readChapter(source.slice(separator), true);
      if (!chapter) return;
      const citation = asCitation(
        source,
        separator,
        separator + chapter.length,
        inherited,
        chapter.chapter,
        chapter.verses,
      );
      if (!citation) return;
      existing.push(citation);
    }
  }
}

export function parseScriptureReference(
  reference: string,
): ParsedScriptureReference | null {
  const hit = parseScriptureReferenceList(reference.trim()).find((item) => item.start === 0);
  if (!hit) return null;
  return {
    bookId: hit.bookId,
    chapter: hit.chapter,
    ...(hit.verse != null ? { verse: hit.verse } : {}),
    ...(hit.verseEnd != null ? { verseEnd: hit.verseEnd } : {}),
    ...(hit.verses ? { verses: hit.verses } : {}),
  };
}

export function findScriptureCitations(text: string): ScriptureCitation[] {
  return parseScriptureReferenceList(text);
}