/**
 * Builds data/net.json from the NET Bible® ePub published at https://bible.org/downloads
 * (NETBIBLE21.epub). bible.org sits behind a browser challenge, so download the file in a
 * browser and pass its path:
 *
 *   npx tsx scripts/prepare-net-bible.ts path/to/NETBIBLE21.epub
 *   npx tsx scripts/seed-verses-prod.ts
 *
 * Only the Bible text is kept. The ePub carries the translators' notes in separate
 * fileN_notes.xhtml documents, which are never read, and every note marker (<sup>) is
 * removed from the verse text, as are the Hebrew verse-number markers. Section titles,
 * Psalm superscriptions, acrostic letters
 * and Song of Songs speaker labels are headings, not verse text, and are left out as in
 * the other local versions.
 */
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

export interface NormalizedVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

/** The entries of a zip archive (an ePub is one), keyed by path. */
export function readZipEntries(archive: Buffer): Map<string, Buffer> {
  let end = archive.length - 22;
  while (end >= 0 && archive.readUInt32LE(end) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error("Not a zip archive");
  const count = archive.readUInt16LE(end + 10);
  let offset = archive.readUInt32LE(end + 16);
  const entries = new Map<string, Buffer>();
  for (let i = 0; i < count; i += 1) {
    if (archive.readUInt32LE(offset) !== 0x02014b50) throw new Error("Corrupt zip directory");
    const method = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localOffset = archive.readUInt32LE(offset + 42);
    const name = archive.toString("utf8", offset + 46, offset + 46 + nameLength);
    const dataStart = localOffset + 30 + archive.readUInt16LE(localOffset + 26) + archive.readUInt16LE(localOffset + 28);
    const raw = archive.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) entries.set(name, raw);
    else if (method === 8) entries.set(name, zlib.inflateRawSync(raw));
    else throw new Error(`Unsupported zip method ${method} for ${name}`);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const value = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Paragraph classes that hold headings rather than verse text. */
const HEADING_CLASSES = new Set(["paragraphtitle", "psasuper", "lamhebrew", "sosspeaker"]);

/** Verses of one NET chapter document; empty for book title pages. */
export function parseNetChapterDocument(html: string): NormalizedVerse[] {
  const title = /<title>NET Bible [\d.]+ (.+?) \d+<\/title>/.exec(html);
  if (!title) return [];
  const book = title[1].trim();

  const body = (html.split(/<body[^>]*>/)[1] ?? "").split("</body>")[0]
    .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, "")
    .replace(/<p class="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi, (whole, cls: string, inner: string) =>
      HEADING_CLASSES.has(cls) ? "" : ` ${inner} `,
    )
    .replace(/<span class="smcaps">([\s\S]*?)<\/span>/gi, (_m, inner: string) => inner.toUpperCase())
    .replace(/<br\s*\/?>/gi, " ");

  const verses: NormalizedVerse[] = [];
  const parts = body.split(/<span class="verse">([^<]+)<\/span>/i);
  for (let i = 1; i < parts.length; i += 2) {
    const ref = /^(\d+):(\d+)$/.exec(parts[i].trim());
    if (!ref) throw new Error(`Unexpected verse marker "${parts[i]}" in ${book}`);
    const text = decodeEntities(parts[i + 1].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;:!?’”)])/g, "$1")
      .replace(/([‘“(])\s+/g, "$1")
      // Hebrew-numbering markers such as "(32:1)" in Genesis 31:55.
      .replace(/\s*\(\d+:\d+[a-z]?\)\s*/g, " ")
      .trim();
    // NET leaves out verses absent from the oldest manuscripts (e.g. Acts 24:7); their
    // marker is followed only by a note, so nothing is stored for them.
    if (text) verses.push({ book, chapter: Number(ref[1]), verse: Number(ref[2]), text });
  }
  return verses;
}

/** Every verse in the ePub, in canonical order; notes documents are skipped. */
export function parseNetEpub(archive: Buffer): NormalizedVerse[] {
  const entries = readZipEntries(archive);
  const chapterFiles = [...entries.keys()]
    .filter((name) => /(^|\/)file\d+\.xhtml$/.test(name))
    .sort((a, b) => Number(/file(\d+)\.xhtml$/.exec(a)![1]) - Number(/file(\d+)\.xhtml$/.exec(b)![1]));
  return chapterFiles.flatMap((name) => parseNetChapterDocument(entries.get(name)!.toString("utf8")));
}

function main() {
  const source = process.argv[2] ?? path.resolve(process.cwd(), "data", "NETBIBLE21.epub");
  if (!fs.existsSync(source)) {
    console.error(`NET ePub not found at ${source}. Download NETBIBLE21.epub from https://bible.org/downloads first.`);
    process.exit(1);
  }
  const verses = parseNetEpub(fs.readFileSync(source));
  const books = new Set(verses.map((v) => v.book));
  const chapters = new Set(verses.map((v) => `${v.book} ${v.chapter}`));
  console.log(`NET: ${verses.length} verses, ${chapters.size} chapters, ${books.size} books`);
  if (books.size !== 66 || chapters.size !== 1189) {
    console.error("NET: expected 66 books and 1189 chapters; data/net.json was not written.");
    process.exit(1);
  }

  const dataDir = path.resolve(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const outPath = path.join(dataDir, "net.json");
  fs.writeFileSync(outPath, JSON.stringify(verses));
  console.log(`Saved ${outPath}. Next: npx tsx scripts/seed-verses-prod.ts`);
}

if (require.main === module) main();
