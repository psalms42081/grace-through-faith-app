/**
 * Spot-check extract: headings + poetry for the review chapters.
 *
 * Usage: npx tsx scripts/refresh-kjv-headings-review.ts
 */
import * as fs from "fs";
import * as path from "path";
import type { HeadingCorpus } from "./generate-kjv-headings";
import { isKjvReaderPoetryBook, type PoetryCorpus } from "./kjv-poetry-lines";

const ROOT = process.cwd();
const HEADINGS_PATH = path.join(ROOT, "data", "kjv-headings.generated.json");
const POETRY_PATH = path.join(ROOT, "data", "kjv-poetry-lines.generated.json");
const SEQUENCE_PATH = path.join(ROOT, "data", "kjv-headings.sequence-review.json");
const REVIEW_PATH = path.join(ROOT, "data", "kjv-headings.review.json");

const SPOT_CHECK: [string, number][] = [
  ["Genesis", 1],
  ["Psalms", 23],
  ["Psalms", 119],
  ["Matthew", 5],
  ["Matthew", 6],
  ["Matthew", 7],
  ["Luke", 6],
  ["John", 3],
  ["John", 14],
  ["Daniel", 2],
  ["Daniel", 7],
  ["Revelation", 12],
  ["Revelation", 13],
  ["Revelation", 14],
];

function atomicJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

function main() {
  const headings: HeadingCorpus = JSON.parse(fs.readFileSync(HEADINGS_PATH, "utf8"));
  const poetry: PoetryCorpus = JSON.parse(fs.readFileSync(POETRY_PATH, "utf8"));
  const sequenceReview = fs.existsSync(SEQUENCE_PATH)
    ? JSON.parse(fs.readFileSync(SEQUENCE_PATH, "utf8"))
    : null;
  const headingByKey = new Map(headings.chapters.map((entry) => [`${entry.book} ${entry.chapter}`, entry]));
  const poetryByKey = new Map(poetry.chapters.map((entry) => [`${entry.book} ${entry.chapter}`, entry]));
  const chapters = SPOT_CHECK.map(([book, chapter]) => {
    const heading = headingByKey.get(`${book} ${chapter}`);
    if (!heading) throw new Error(`missing headings for ${book} ${chapter}`);
    const poetryChapter = poetryByKey.get(`${book} ${chapter}`);
    return {
      book,
      chapter,
      sections: heading.sections,
      poetry: isKjvReaderPoetryBook(book) ? poetryChapter?.verses ?? [] : null,
    };
  });
  atomicJson(REVIEW_PATH, {
    note: "WIRED. Local KJV chapters attach headings and paragraphs as providerContent. Poetry line-breaks are applied only for Job, Psalms, Proverbs, Ecclesiastes, Song of Solomon, and Lamentations — prophets stay prose.",
    howToOpen: "In Cursor: Ctrl+P (Quick Open), type kjv-headings.review.json, Enter. Or File > Open File and choose data/kjv-headings.review.json. Each chapter has sections (headings) and poetry (verse lines, or null when the book is outside the six poetic books).",
    schemaVersion: headings.schemaVersion,
    poetrySchemaVersion: poetry.schemaVersion,
    lensVersion: headings.lensVersion,
    sourceManifest: "data/kjv-headings.manifest.json",
    poetryManifest: "data/kjv-poetry-lines.manifest.json",
    sequenceReview: sequenceReview
      ? {
          regenerated: sequenceReview.regenerated,
          regenerationReasons: sequenceReview.regenerationReasons,
          remainingFlags: sequenceReview.remainingFlags,
          standard: sequenceReview.standard,
        }
      : null,
    chapters,
  });
  console.log(`review extract: ${chapters.length} chapters -> ${path.relative(ROOT, REVIEW_PATH)}`);
}

main();
