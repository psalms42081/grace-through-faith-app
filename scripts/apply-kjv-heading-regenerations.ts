/**
 * Apply independent heading re-outlines, then regenerate paragraph
 * groupings across the whole KJV corpus as natural sense units.
 *
 * Usage: npx tsx scripts/apply-kjv-heading-regenerations.ts
 */
import * as fs from "fs";
import * as path from "path";
import {
  HEADING_SCHEMA_VERSION,
  validateChapter,
  validateCorpus,
  type HeadingCorpus,
  type SourceBook,
} from "./generate-kjv-headings";
import { SDA_LENS_VERSION } from "../server/services/sda-lens";
import { reviewCorpus } from "./kjv-heading-sequence";
import { REGENERATED_HEADING_CHAPTERS, REGENERATION_REASONS } from "./kjv-heading-regenerations";
import { PARAGRAPH_HARD_MAX, regenerateSectionParagraphs } from "./kjv-paragraphs";

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, "data", "kjv.json");
const PROGRESS_PATH = path.join(ROOT, "data", "kjv-headings-progress.json");
const OUTPUT_PATH = path.join(ROOT, "data", "kjv-headings.generated.json");
const MANIFEST_PATH = path.join(ROOT, "data", "kjv-headings.manifest.json");
const REPORT_PATH = path.join(ROOT, "data", "kjv-headings.validation.json");
const SAMPLES_PATH = path.join(ROOT, "data", "kjv-headings.samples.json");
const SEQUENCE_REPORT_PATH = path.join(ROOT, "data", "kjv-headings.sequence-review.json");

function atomicJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

function chapterKey(book: string, chapter: number) {
  return `${book}\u0000${chapter}`;
}

function main() {
  const source: SourceBook[] = JSON.parse(fs.readFileSync(SOURCE_PATH, "utf8"));
  const corpus: HeadingCorpus = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
  const byKey = new Map(corpus.chapters.map((entry) => [chapterKey(entry.book, entry.chapter), entry]));
  const priorFlags = reviewCorpus(corpus.chapters);
  const sourceByKey = new Map(
    source.flatMap((book) =>
      book.chapters.map((chapter) => [chapterKey(book.book, Number(chapter.chapter)), { book, chapter }] as const),
    ),
  );

  for (const replacement of REGENERATED_HEADING_CHAPTERS) {
    const sourceBook = source.find((book) => book.book === replacement.book);
    const sourceChapter = sourceBook?.chapters.find((chapter) => Number(chapter.chapter) === replacement.chapter);
    if (!sourceChapter) throw new Error(`missing source ${replacement.book} ${replacement.chapter}`);
    const problems = validateChapter(sourceChapter, replacement);
    if (problems.length) throw new Error(`${replacement.book} ${replacement.chapter}: ${problems.join("; ")}`);
    byKey.set(chapterKey(replacement.book, replacement.chapter), replacement);
  }

  const headed: HeadingCorpus = {
    schemaVersion: HEADING_SCHEMA_VERSION,
    lensVersion: SDA_LENS_VERSION,
    chapters: corpus.chapters.map((entry) => byKey.get(chapterKey(entry.book, entry.chapter))!),
  };

  const next: HeadingCorpus = {
    ...headed,
    chapters: headed.chapters.map((entry) => {
      const sourceEntry = sourceByKey.get(chapterKey(entry.book, entry.chapter));
      if (!sourceEntry) throw new Error(`missing source ${entry.book} ${entry.chapter}`);
      return {
        ...entry,
        sections: entry.sections.map((section) =>
          regenerateSectionParagraphs(entry.book, entry.chapter, section, sourceEntry.chapter.verses),
        ),
      };
    }),
  };

  const report = validateCorpus(source, next);
  if (!report.valid) throw new Error(`patched corpus invalid: ${report.errors.slice(0, 5).join(" | ")}`);

  const longParagraphs: string[] = [];
  for (const chapter of next.chapters) {
    for (const section of chapter.sections) {
      for (const paragraph of section.paragraphs) {
        const length = paragraph.endVerse - paragraph.startVerse + 1;
        if (length > PARAGRAPH_HARD_MAX) {
          longParagraphs.push(`${chapter.book} ${chapter.chapter}:${paragraph.startVerse}-${paragraph.endVerse} (${length})`);
        }
      }
    }
  }
  if (longParagraphs.length) {
    throw new Error(`paragraphs longer than ${PARAGRAPH_HARD_MAX} verses: ${longParagraphs.slice(0, 8).join(" | ")}`);
  }

  const remaining = reviewCorpus(next.chapters);
  const patched = REGENERATED_HEADING_CHAPTERS.map((entry) => `${entry.book} ${entry.chapter}`);
  const leftoverOnPatched = remaining.filter((flag) => patched.includes(`${flag.book} ${flag.chapter}`));
  if (leftoverOnPatched.length) {
    throw new Error(`regenerated chapters still look lifted: ${leftoverOnPatched.map((f) => `${f.book} ${f.chapter}`).join(", ")}`);
  }

  for (const entry of next.chapters) byKey.set(chapterKey(entry.book, entry.chapter), entry);

  atomicJson(OUTPUT_PATH, next);
  atomicJson(PROGRESS_PATH, next);
  atomicJson(REPORT_PATH, report);
  const manifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) : {};
  atomicJson(MANIFEST_PATH, {
    ...manifest,
    schemaVersion: HEADING_SCHEMA_VERSION,
    lensVersion: SDA_LENS_VERSION,
    source: "data/kjv.json",
    ...report.counts,
    headingSequencePatch: {
      at: new Date().toISOString(),
      chapters: patched,
      note: "Independent re-outline of sequence-flagged chapters plus Psalm 119 letter titles; remainder of heading ranges unchanged.",
    },
    paragraphRegen: {
      at: new Date().toISOString(),
      hardMaxVerses: PARAGRAPH_HARD_MAX,
      note: "Whole-corpus sense-unit paragraphs; section headings unchanged except the headingSequencePatch chapters.",
    },
  });
  if (fs.existsSync(SAMPLES_PATH)) {
    const samples = JSON.parse(fs.readFileSync(SAMPLES_PATH, "utf8")) as HeadingCorpus["chapters"];
    atomicJson(
      SAMPLES_PATH,
      samples.map((entry) => byKey.get(chapterKey(entry.book, entry.chapter)) ?? entry),
    );
  }
  atomicJson(SEQUENCE_REPORT_PATH, {
    note: "Headings and paragraphs are wired through local KJV providerContent. Sequence screen against published heading sets. Generic single titles are allowed.",
    standard: "No chapter's full heading sequence should match a specific published edition's set. Consecutive runs of 4+ published titles are also flagged. Distinctive publisher packages that were a near-miss on exact match were regenerated after editorial review.",
    priorFlags,
    regenerated: patched,
    regenerationReasons: REGENERATION_REASONS,
    remainingFlags: remaining,
  });
  console.log(`patched ${patched.length} chapters; remaining sequence flags: ${remaining.length}; paragraphs capped at ${PARAGRAPH_HARD_MAX}`);
}

main();
