/**
 * Offline review-data generator for Task #76. This is deliberately not imported
 * by the server: the generated data is editorial material until a future task
 * explicitly approves runtime use.
 *
 * Usage: npm run generate:kjv-headings
 * Resume: rerun the same command; valid chapter checkpoints are never requested again.
 * Force a subset: npm run generate:kjv-headings -- --chapters=Matthew:5,Revelation:14
 */
import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import { SDA_LENS_VERSION, withSdaLens } from "../server/services/sda-lens";

export const HEADING_SCHEMA_VERSION = "kjv-headings-v1";
const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, "data", "kjv.json");
const PROGRESS_PATH = path.join(ROOT, "data", "kjv-headings-progress.json");
const OUTPUT_PATH = path.join(ROOT, "data", "kjv-headings.generated.json");
const MANIFEST_PATH = path.join(ROOT, "data", "kjv-headings.manifest.json");
const REPORT_PATH = path.join(ROOT, "data", "kjv-headings.validation.json");
const SAMPLES_PATH = path.join(ROOT, "data", "kjv-headings.samples.json");
const MODEL = process.env.KJV_HEADINGS_MODEL || "gpt-4o-mini";
const BATCH_SIZE = Math.max(1, Number(process.env.KJV_HEADINGS_BATCH_SIZE || 2));
const CONCURRENCY = Math.max(1, Number(process.env.KJV_HEADINGS_CONCURRENCY || 2));
const RETRIES = Math.max(1, Number(process.env.KJV_HEADINGS_RETRIES || 4));

export interface SourceVerse { verse: string; text: string }
export interface SourceChapter { chapter: string; verses: SourceVerse[] }
export interface SourceBook { book: string; chapters: SourceChapter[] }
export interface ParagraphRange { startVerse: number; endVerse: number }
export interface Section { heading: string; startVerse: number; endVerse: number; paragraphs: ParagraphRange[] }
export interface ChapterHeadings { book: string; chapter: number; sections: Section[] }
export interface HeadingCorpus { schemaVersion: string; lensVersion: string; chapters: ChapterHeadings[] }

function atomicJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

export function chapterKey(book: string, chapter: number) { return `${book}\u0000${chapter}`; }

export function parseForceChapters(argv: string[]): Set<string> {
  const arg = argv.find((item) => item.startsWith("--chapters="));
  if (!arg) return new Set();
  const keys = new Set<string>();
  for (const token of arg.slice("--chapters=".length).split(",").map((item) => item.trim()).filter(Boolean)) {
    const separator = token.lastIndexOf(":");
    if (separator <= 0) throw new Error(`invalid --chapters token: ${token}`);
    keys.add(chapterKey(token.slice(0, separator), Number(token.slice(separator + 1))));
  }
  return keys;
}

/** Returns human-readable errors rather than accepting almost-valid AI output. */
export function validateChapter(source: SourceChapter, actual: ChapterHeadings): string[] {
  const errors: string[] = [];
  const expectedVerses = source.verses.map((verse) => Number(verse.verse));
  if (!Number.isInteger(actual.chapter) || actual.chapter !== Number(source.chapter)) errors.push("chapter does not match source");
  if (!Array.isArray(actual.sections) || actual.sections.length === 0) return [...errors, "no sections"];
  const seen: number[] = [];
  let previousEnd = 0;
  for (const [index, section] of actual.sections.entries()) {
    if (typeof section.heading !== "string" || !section.heading.trim()) errors.push(`section ${index}: empty heading`);
    if (!Number.isInteger(section.startVerse) || !Number.isInteger(section.endVerse)) errors.push(`section ${index}: non-integer range`);
    if (section.startVerse > section.endVerse) errors.push(`section ${index}: reversed range`);
    if (section.startVerse <= previousEnd) errors.push(`section ${index}: unordered or overlapping range`);
    previousEnd = section.endVerse;
    if (!Array.isArray(section.paragraphs) || section.paragraphs.length === 0) errors.push(`section ${index}: no paragraph groups`);
    let paragraphEnd = section.startVerse - 1;
    for (const paragraph of section.paragraphs || []) {
      if (!Number.isInteger(paragraph.startVerse) || !Number.isInteger(paragraph.endVerse) ||
        paragraph.startVerse > paragraph.endVerse || paragraph.startVerse !== paragraphEnd + 1 ||
        paragraph.startVerse < section.startVerse || paragraph.endVerse > section.endVerse) {
        errors.push(`section ${index}: invalid paragraph grouping`);
      }
      paragraphEnd = paragraph.endVerse;
    }
    if (paragraphEnd !== section.endVerse) errors.push(`section ${index}: paragraphs do not cover section`);
    for (let verse = section.startVerse; verse <= section.endVerse; verse++) seen.push(verse);
  }
  if (seen.length !== expectedVerses.length || seen.some((verse, i) => verse !== expectedVerses[i])) {
    errors.push("section ranges do not cover each source verse exactly once");
  }
  return errors;
}

export function validateCorpus(source: SourceBook[], corpus: HeadingCorpus): { valid: boolean; errors: string[]; counts: Record<string, number> } {
  const errors: string[] = [];
  const expected = source.flatMap((book) => book.chapters.map((chapter) => ({ book: book.book, chapter })));
  const actual = new Map<string, ChapterHeadings>();
  for (const entry of corpus.chapters || []) {
    const key = chapterKey(entry.book, entry.chapter);
    if (actual.has(key)) errors.push(`duplicate chapter ${entry.book} ${entry.chapter}`);
    actual.set(key, entry);
  }
  for (const item of expected) {
    const entry = actual.get(chapterKey(item.book, Number(item.chapter.chapter)));
    if (!entry) errors.push(`missing chapter ${item.book} ${item.chapter.chapter}`);
    else errors.push(...validateChapter(item.chapter, entry).map((error) => `${item.book} ${item.chapter.chapter}: ${error}`));
  }
  for (const entry of actual.values()) {
    if (!expected.some((item) => item.book === entry.book && Number(item.chapter.chapter) === entry.chapter)) errors.push(`unexpected chapter ${entry.book} ${entry.chapter}`);
  }
  return { valid: errors.length === 0, errors, counts: { books: source.length, chapters: expected.length, verses: source.reduce((n, b) => n + b.chapters.reduce((m, c) => m + c.verses.length, 0), 0), sections: (corpus.chapters || []).reduce((n, c) => n + c.sections.length, 0) } };
}

function schema() {
  return {
    name: "kjv_chapter_headings", strict: true,
    schema: { type: "object", additionalProperties: false, required: ["chapters"], properties: {
      chapters: { type: "array", items: { type: "object", additionalProperties: false, required: ["book", "chapter", "sections"], properties: {
        book: { type: "string" }, chapter: { type: "integer" },
        sections: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["heading", "startVerse", "endVerse", "paragraphs"], properties: {
          heading: { type: "string", minLength: 1 }, startVerse: { type: "integer" }, endVerse: { type: "integer" },
          paragraphs: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["startVerse", "endVerse"], properties: { startVerse: { type: "integer" }, endVerse: { type: "integer" } } } }
        } } }
      } } }
    } }
  };
}

function requestText(batch: { book: string; chapter: SourceChapter }[]) {
  return batch.map(({ book, chapter }) => `${book} ${chapter.chapter}\n${chapter.verses.map((v) => `${v.verse}. ${v.text}`).join("\n")}`).join("\n\n");
}

async function generateBatch(client: OpenAI, batch: { book: string; chapter: SourceChapter }[]): Promise<ChapterHeadings[]> {
  const system = withSdaLens(`SDA lens version: ${SDA_LENS_VERSION}.
You create original, concise, descriptive headings and structural paragraph breaks for KJV chapters. Do not quote, imitate, retrieve, or reuse headings from YouVersion, publishers, Bible editions, or any external source. Read only the supplied KJV text. Return every requested chapter exactly once. Section and paragraph ranges must be contiguous, ordered, non-overlapping, in bounds, and cover every verse exactly once. Headings must be original wording, not verse quotations.`);
  let lastError: unknown;
  let correction = "";
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL, temperature: 0,
        response_format: { type: "json_schema", json_schema: schema() } as any,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `${requestText(batch)}${correction}`,
          },
        ],
      });
      const parsed = JSON.parse(response.choices[0]?.message?.content || "");
      if (!Array.isArray(parsed.chapters) || parsed.chapters.length !== batch.length) throw new Error("structured response has wrong chapter count");
      const requested = new Map(batch.map((item) => [chapterKey(item.book, Number(item.chapter.chapter)), item.chapter]));
      const returned = new Set<string>();
      for (const entry of parsed.chapters as ChapterHeadings[]) {
        const key = chapterKey(entry.book, entry.chapter);
        const source = requested.get(key);
        if (returned.has(key)) throw new Error(`duplicate chapter in structured response: ${entry.book} ${entry.chapter}`);
        returned.add(key);
        const problems = source ? validateChapter(source, entry) : ["unexpected chapter"];
        if (problems.length) throw new Error(`${entry.book} ${entry.chapter}: ${problems.join("; ")}`);
      }
      if (returned.size !== requested.size) throw new Error("structured response omitted a requested chapter");
      return parsed.chapters;
    } catch (error) {
      lastError = error;
      const problem = error instanceof Error ? error.message : String(error);
      correction = `\n\nCORRECTION REQUIRED: The previous structured response failed validation: ${problem}. Recalculate the ranges from the supplied numbered verses. Cover every verse exactly once with no gaps or overlap.`;
      if (attempt < RETRIES) await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    }
  }
  if (batch.length > 1) {
    const isolated: ChapterHeadings[] = [];
    for (const item of batch) {
      isolated.push(...await generateBatch(client, [item]));
    }
    return isolated;
  }
  throw new Error(`generation failed after ${RETRIES} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function main() {
  if (!fs.existsSync(SOURCE_PATH)) throw new Error("data/kjv.json is required and is never modified");
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) throw new Error("AI_INTEGRATIONS_OPENAI_API_KEY is required for generation");
  const source: SourceBook[] = JSON.parse(fs.readFileSync(SOURCE_PATH, "utf8"));
  const prior: HeadingCorpus = fs.existsSync(PROGRESS_PATH) ? JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8")) : { schemaVersion: HEADING_SCHEMA_VERSION, lensVersion: SDA_LENS_VERSION, chapters: [] };
  const expected = source.flatMap((book) => book.chapters.map((chapter) => ({ book: book.book, chapter })));
  const force = parseForceChapters(process.argv);
  const completed = new Map(prior.chapters.filter((entry) => {
    const sourceChapter = expected.find((item) => item.book === entry.book && Number(item.chapter.chapter) === entry.chapter)?.chapter;
    return !!sourceChapter && validateChapter(sourceChapter, entry).length === 0;
  }).map((entry) => [chapterKey(entry.book, entry.chapter), entry]));
  for (const key of force) completed.delete(key);
  const pending = expected.filter((item) => !completed.has(chapterKey(item.book, Number(item.chapter.chapter))));
  const batches: typeof pending[] = [];
  for (let i = 0; i < pending.length; i += BATCH_SIZE) batches.push(pending.slice(i, i + BATCH_SIZE));
  const client = new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL, timeout: 120000 });
  let cursor = 0;
  let fatalError: unknown;
  async function worker() {
    while (cursor < batches.length && !fatalError) {
      const batch = batches[cursor++];
      try {
        const generated = await generateBatch(client, batch);
        for (const entry of generated) completed.set(chapterKey(entry.book, entry.chapter), entry);
        atomicJson(PROGRESS_PATH, { schemaVersion: HEADING_SCHEMA_VERSION, lensVersion: SDA_LENS_VERSION, chapters: expected.map((item) => completed.get(chapterKey(item.book, Number(item.chapter.chapter)))).filter(Boolean) });
        console.log(`checkpoint: ${completed.size}/${expected.length} chapters`);
      } catch (error) {
        fatalError = error;
        throw error;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));
  const corpus: HeadingCorpus = { schemaVersion: HEADING_SCHEMA_VERSION, lensVersion: SDA_LENS_VERSION, chapters: expected.map((item) => completed.get(chapterKey(item.book, Number(item.chapter.chapter)))!) };
  const report = validateCorpus(source, corpus);
  atomicJson(REPORT_PATH, report);
  if (!report.valid) throw new Error(`complete-corpus validation failed: ${report.errors.slice(0, 5).join(" | ")}`);
  atomicJson(OUTPUT_PATH, corpus);
  atomicJson(MANIFEST_PATH, { schemaVersion: HEADING_SCHEMA_VERSION, lensVersion: SDA_LENS_VERSION, model: MODEL, source: "data/kjv.json", generatedAt: new Date().toISOString(), ...report.counts });
  const sampleKeys: [string, number][] = [["Genesis", 1], ["Psalms", 23], ["Matthew", 5], ["Revelation", 22]];
  atomicJson(SAMPLES_PATH, sampleKeys.map(([book, chapter]) => completed.get(chapterKey(book, chapter))));
  console.log(`complete: ${report.counts.books} books, ${report.counts.chapters} chapters, ${report.counts.verses} verses`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => { console.error(`KJV headings generation failed: ${error.message}`); process.exitCode = 1; });
}