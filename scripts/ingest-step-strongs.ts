/**
 * Download STEP Bible TAHOT + TAGNT and load KJV word maps into verse_strong_map.
 *
 * Repeatable. Files cache under data/step-bible/ (gitignored).
 * Usage: npx tsx --env-file=.env scripts/ingest-step-strongs.ts
 *        npx tsx scripts/ingest-step-strongs.ts --coverage-only
 */
import * as fs from "fs";
import * as https from "https";
import * as path from "path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, inArray, sql } from "drizzle-orm";
import { bibleBooks, bibleVerses, strongEntries, verseStrongMaps } from "../shared/schema";
import {
  collectTaggedVerseKeys,
  kjvVerseKeysFromNestedJson,
  parseStepTaggedFile,
  reportKjvCoverage,
  resolveLexiconStrongId,
  type StepTaggedToken,
  verseKey,
} from "../lib/step-bible-tagged";
import { STEP_STRONG_SOURCE } from "../lib/strong-map-policy";

const ROOT = path.resolve(process.cwd());
const DATA_DIR = path.join(ROOT, "data", "step-bible");
const KJV_JSON = path.join(ROOT, "data", "kjv.json");
const COVERAGE_JSON = path.join(ROOT, "data", "step-strongs-coverage.json");

const STEP_BASE =
  "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT/";

const STEP_FILES: Array<{ file: string; kind: "tahot" | "tagnt" }> = [
  { file: "TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt", kind: "tahot" },
  { file: "TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt", kind: "tahot" },
  { file: "TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt", kind: "tahot" },
  { file: "TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt", kind: "tahot" },
  { file: "TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt", kind: "tagnt" },
  { file: "TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt", kind: "tagnt" },
];

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tmp = `${dest}.partial`;
    const file = fs.createWriteStream(tmp);
    const get = (current: string) => {
      https
        .get(current, { headers: { "User-Agent": "informed-ministries-step-ingest" } }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            get(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            file.close();
            fs.rmSync(tmp, { force: true });
            reject(new Error(`HTTP ${res.statusCode} for ${current}`));
            return;
          }
          res.pipe(file);
          file.on("finish", () => {
            file.close();
            fs.renameSync(tmp, dest);
            resolve();
          });
        })
        .on("error", (err) => {
          file.close();
          fs.rmSync(tmp, { force: true });
          reject(err);
        });
    };
    get(url);
  });
}

async function ensureStepFiles(): Promise<void> {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const { file } of STEP_FILES) {
    const dest = path.join(DATA_DIR, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`  cached ${file}`);
      continue;
    }
    console.log(`  downloading ${file}...`);
    await download(STEP_BASE + encodeURIComponent(file), dest);
  }
}

function parseAllTokens(): StepTaggedToken[] {
  const tokens: StepTaggedToken[] = [];
  for (const { file, kind } of STEP_FILES) {
    const dest = path.join(DATA_DIR, file);
    const content = fs.readFileSync(dest, "utf8");
    const parsed = parseStepTaggedFile(content, kind);
    console.log(`  ${kind.toUpperCase()} ${file.split(" - ")[0]}: ${parsed.length} tokens`);
    tokens.push(...parsed);
  }
  return tokens;
}

function writeCoverage(tokens: StepTaggedToken[]) {
  if (!fs.existsSync(KJV_JSON)) {
    throw new Error("data/kjv.json is required for coverage");
  }
  const kjvKeys = kjvVerseKeysFromNestedJson(JSON.parse(fs.readFileSync(KJV_JSON, "utf8")));
  const taggedKeys = collectTaggedVerseKeys(tokens);
  const report = reportKjvCoverage(kjvKeys, taggedKeys);
  fs.writeFileSync(COVERAGE_JSON, JSON.stringify(report, null, 2));
  return report;
}

function printCoverage(report: ReturnType<typeof reportKjvCoverage>) {
  const pct = report.kjvVerseCount
    ? ((report.taggedVerseCount / report.kjvVerseCount) * 100).toFixed(1)
    : "0.0";
  console.log(`\nKJV verses: ${report.kjvVerseCount}`);
  console.log(`Tagged:     ${report.taggedVerseCount} (${pct}%)`);
  console.log(`Missing:    ${report.missingVerseCount}`);
  if (report.missingByBook.length === 0) {
    console.log("Missing books/ranges: none");
    return;
  }
  console.log("Missing by book:");
  for (const book of report.missingByBook) {
    const preview = book.ranges.slice(0, 8).join(", ");
    const extra = book.ranges.length > 8 ? ` … +${book.ranges.length - 8} more` : "";
    console.log(`  ${book.bookName}: ${book.missing}/${book.total}  ${preview}${extra}`);
  }
}

async function ingestToDb(tokens: StepTaggedToken[]) {
  if (!process.env.DATABASE_URL) {
    console.log("\nDATABASE_URL not set — skipping DB ingest.");
    return { inserted: 0, skipped: true as const };
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  try {
    const books = await db.select({ id: bibleBooks.id, name: bibleBooks.name }).from(bibleBooks);
    const bookIdByName = new Map(books.map((b) => [b.name, b.id]));

    const kjvVerses = await db
      .select({
        id: bibleVerses.id,
        bookId: bibleVerses.bookId,
        chapter: bibleVerses.chapter,
        verse: bibleVerses.verse,
      })
      .from(bibleVerses)
      .where(eq(bibleVerses.translationId, "KJV"));

    const bookNameById = new Map(books.map((b) => [b.id, b.name]));
    const verseIdByKey = new Map<string, string>();
    for (const row of kjvVerses) {
      const name = bookNameById.get(row.bookId);
      if (!name) continue;
      verseIdByKey.set(verseKey(name, row.chapter, row.verse), row.id);
    }

    const lexiconRows = await db.select({ id: strongEntries.id }).from(strongEntries);
    const lexiconIds = new Set(lexiconRows.map((r) => r.id));

    const rows: Array<{
      verseId: string;
      strongId: string;
      wordPosition: number;
      originalWord: string;
      translatedWord: string;
      source: string;
      isAiGenerated: boolean;
      tokenIndex: number;
    }> = [];
    const stubs = new Map<string, { id: string; language: "he" | "gr"; lemma: string; definition: string }>();
    const positionByVerse = new Map<string, number>();
    let unmatchedVerses = 0;

    for (const token of tokens) {
      const key = verseKey(token.bookName, token.chapter, token.verse);
      const verseId = verseIdByKey.get(key);
      if (!verseId) {
        unmatchedVerses += 1;
        continue;
      }
      const strongId = resolveLexiconStrongId(token.strongId, lexiconIds);
      if (!lexiconIds.has(strongId) && !stubs.has(strongId)) {
        stubs.set(strongId, {
          id: strongId,
          language: token.language,
          lemma: token.originalWord || strongId,
          definition: token.translatedWord || strongId,
        });
      }
      const next = (positionByVerse.get(verseId) ?? 0) + 1;
      positionByVerse.set(verseId, next);
      rows.push({
        verseId,
        strongId,
        wordPosition: next,
        originalWord: token.originalWord || token.translatedWord || strongId,
        translatedWord: token.translatedWord,
        source: STEP_STRONG_SOURCE,
        isAiGenerated: false,
        tokenIndex: token.tokenIndex,
      });
    }

    if (stubs.size > 0) {
      const stubRows = [...stubs.values()];
      for (let i = 0; i < stubRows.length; i += 400) {
        await db.insert(strongEntries).values(stubRows.slice(i, i + 400)).onConflictDoNothing();
      }
      console.log(`  stub lexicon entries: ${stubRows.length}`);
    }

    const kjvVerseIds = [...new Set(kjvVerses.map((v) => v.id))];
    const CHUNK = 400;
    for (let i = 0; i < kjvVerseIds.length; i += CHUNK) {
      await db.delete(verseStrongMaps).where(inArray(verseStrongMaps.verseId, kjvVerseIds.slice(i, i + CHUNK)));
    }
    console.log(`  cleared existing KJV maps for ${kjvVerseIds.length} verses`);

    for (let i = 0; i < rows.length; i += CHUNK) {
      await db.insert(verseStrongMaps).values(rows.slice(i, i + CHUNK));
      if ((i + CHUNK) % 20000 < CHUNK) {
        console.log(`  inserted ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
      }
    }

    const mapped = await db.execute(sql`
      SELECT COUNT(DISTINCT verse_id)::int AS n
      FROM verse_strong_map
      WHERE source = ${STEP_STRONG_SOURCE}
    `);
    const mappedN = Number((mapped as any).rows?.[0]?.n ?? (mapped as any)[0]?.n ?? 0);
    console.log(`  inserted ${rows.length} STEP maps across ${mappedN} verses`);
    if (unmatchedVerses > 0) {
      console.log(`  STEP tokens with no KJV verse row: ${unmatchedVerses}`);
    }
    return { inserted: rows.length, skipped: false as const, mappedVerses: mappedN };
  } finally {
    await pool.end();
  }
}

async function main() {
  const coverageOnly = process.argv.includes("--coverage-only");
  console.log("STEP Bible TAHOT/TAGNT ingest (CC BY 4.0)");
  await ensureStepFiles();
  console.log("Parsing...");
  const tokens = parseAllTokens();
  console.log(`Total tagged tokens: ${tokens.length}`);
  const report = writeCoverage(tokens);
  printCoverage(report);
  console.log(`Wrote ${COVERAGE_JSON}`);
  if (coverageOnly) return;
  console.log("\nIngesting into verse_strong_map...");
  try {
    await ingestToDb(tokens);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`DB ingest failed (${message}). Coverage file is written; re-run when DATABASE_URL can connect.`);
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
