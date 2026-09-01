/**
 * Offline KJV poetry-line generator. One-time script output, unwired.
 *
 * Usage: npm run generate:kjv-poetry-lines
 */
import * as fs from "fs";
import * as path from "path";
import {
  POETRY_SCHEMA_VERSION,
  POETRY_SOURCE_BOOKS,
  isPoetrySourceBook,
  poetryChapterFromSource,
  type PoetryCorpus,
} from "./kjv-poetry-lines";
import type { SourceBook } from "./generate-kjv-headings";

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, "data", "kjv.json");
const OUTPUT_PATH = path.join(ROOT, "data", "kjv-poetry-lines.generated.json");
const MANIFEST_PATH = path.join(ROOT, "data", "kjv-poetry-lines.manifest.json");

function atomicJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

function main() {
  if (!fs.existsSync(SOURCE_PATH)) throw new Error("data/kjv.json is required and is never modified");
  const source: SourceBook[] = JSON.parse(fs.readFileSync(SOURCE_PATH, "utf8"));
  const chapters = source
    .filter((book) => isPoetrySourceBook(book.book))
    .flatMap((book) => book.chapters.map((chapter) => poetryChapterFromSource(book.book, chapter.chapter, chapter.verses)));
  const verses = chapters.reduce((n, chapter) => n + chapter.verses.length, 0);
  const splitVerses = chapters.reduce(
    (n, chapter) => n + chapter.verses.filter((verse) => verse.lines.length > 1).length,
    0,
  );
  const corpus: PoetryCorpus = {
    schemaVersion: POETRY_SCHEMA_VERSION,
    note: "NOT WIRED. Public-domain KJV punctuation lineation (q/q2-shaped). Do not attach to /api/passage or the reader until approved.",
    method: "Split on KJV ; : ! ? and Selah. indent 0 ≈ q, 1 ≈ q2, alternating within a verse; Selah is its own line and resets the couplet. Not NIV/YouVersion lineation.",
    chapters,
  };
  atomicJson(OUTPUT_PATH, corpus);
  atomicJson(MANIFEST_PATH, {
    schemaVersion: POETRY_SCHEMA_VERSION,
    source: "data/kjv.json",
    books: [...POETRY_SOURCE_BOOKS],
    chapters: chapters.length,
    verses,
    versesWithMultipleLines: splitVerses,
    generatedAt: new Date().toISOString(),
  });
  console.log(`poetry lines: ${chapters.length} chapters, ${verses} verses, ${splitVerses} with 2+ lines`);
}

main();
