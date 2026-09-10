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
  "2 chr": "2 Chronicles",
  "2 chr.": "2 Chronicles",
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
const CITATION_RE = new RegExp(
  `(^|[^A-Za-z0-9])(${BOOK_LABEL_PATTERN})\\.?\\s+(\\d+)(?::(\\d+))?`,
  "gi",
);

export interface ParsedScriptureReference {
  bookId: number;
  chapter: number;
  verse?: number;
}

export interface ScriptureCitation extends ParsedScriptureReference {
  start: number;
  end: number;
  text: string;
}

export function parseScriptureReference(
  reference: string,
): ParsedScriptureReference | null {
  const match = reference.trim().match(/^(.+?)\s+(\d+)(?::(\d+))?/);
  if (!match) return null;

  const bookId = NORMALIZED_BOOK_IDS.get(match[1].trim().toLowerCase().replace(/\.$/, ""));
  const chapter = Number.parseInt(match[2], 10);
  const verse = match[3] ? Number.parseInt(match[3], 10) : undefined;

  if (!bookId || !Number.isInteger(chapter) || chapter < 1) return null;
  if (verse !== undefined && (!Number.isInteger(verse) || verse < 1)) {
    return null;
  }

  return { bookId, chapter, verse };
}

export function findScriptureCitations(text: string): ScriptureCitation[] {
  const hits: ScriptureCitation[] = [];
  CITATION_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CITATION_RE.exec(text))) {
    const prefix = match[1] ?? "";
    const start = match.index + prefix.length;
    const bookId = NORMALIZED_BOOK_IDS.get(match[2].toLowerCase());
    const chapter = Number.parseInt(match[3], 10);
    const verse = match[4] ? Number.parseInt(match[4], 10) : undefined;
    if (!bookId || !Number.isInteger(chapter) || chapter < 1) continue;
    hits.push({
      bookId,
      chapter,
      verse,
      start,
      end: match.index + match[0].length,
      text: text.slice(start, match.index + match[0].length),
    });
  }
  return hits;
}