/**
 * Measure STEP tagged tokens vs alignMapsToSurface tappable words
 * for Genesis 1, Psalms 23, and John 3.
 *
 * Usage: npx tsx --env-file=.env scripts/measure-word-study-coverage.ts
 */
import { Pool } from "pg";
import { alignMapsToSurface, isAlignStopWord, tokenizeVerseSurface } from "../lib/reader-word-study";

const CHAPTERS = [
  { book: "Genesis", chapter: 1 },
  { book: "Psalms", chapter: 23 },
  { book: "John", chapter: 3 },
];

const STOP = new Set(
  "a an the of to in for and or but so as by at on from with without into unto upon than that this these those he she it they we i thou thee ye you his her its their our my thy your is are was were be been being am not no nor neither".split(
    " ",
  ),
);

function isContent(word: string): boolean {
  const n = word.toLowerCase().replace(/[^a-z']/g, "");
  return n.length > 0 && !STOP.has(n);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const totals = { tagged: 0, taggedContent: 0, tappable: 0, tappableContent: 0, maps: 0, mapsAligned: 0, contentMaps: 0, contentMapsAligned: 0 };

  for (const { book, chapter } of CHAPTERS) {
    const verses = await pool.query(
      `SELECT v.id, v.verse, v.text
         FROM bible_verse v
         JOIN bible_book b ON b.id = v.book_id
        WHERE b.name = $1 AND v.chapter = $2 AND v.translation_id = 'KJV'
        ORDER BY v.verse`,
      [book, chapter],
    );

    let tagged = 0;
    let taggedContent = 0;
    let tappable = 0;
    let tappableContent = 0;
    let mapsCount = 0;
    let mapsAligned = 0;
    let contentMaps = 0;
    let contentMapsAligned = 0;
    const misses: string[] = [];

    for (const row of verses.rows) {
      const maps = await pool.query(
        `SELECT m.translated_word AS "translatedWord",
                m.original_word AS "originalWord",
                m.strong_id AS "strongId",
                m.word_position AS "wordPosition",
                e.kjv_usage AS "kjvUsage"
           FROM verse_strong_map m
           LEFT JOIN strong_entry e ON e.id = m.strong_id
          WHERE m.verse_id = $1 AND m.source = 'step' AND m.is_ai_generated IS NOT TRUE
          ORDER BY m.word_position, m.token_index NULLS LAST`,
        [row.id],
      );
      const mapRows = maps.rows as Array<{
        translatedWord: string | null;
        originalWord: string;
        strongId: string;
        wordPosition: number;
        kjvUsage: string | null;
      }>;
      mapsCount += mapRows.length;
      const aligned = alignMapsToSurface(row.text, mapRows);
      const used = new Set(aligned.map((t) => t.mapIndex).filter((i) => i != null));
      mapsAligned += used.size;
      for (const [i, m] of mapRows.entries()) {
        const words = [...(m.translatedWord ?? "").matchAll(/[A-Za-z']+/g)].map((x) => x[0]);
        const particle = words.length > 0 && words.every((w) => isAlignStopWord(w) && !["me","my","him","his","you","your","i","we","us","it"].includes(w.toLowerCase()));
        if (particle) continue;
        const usage = [...(m.kjvUsage ?? "").matchAll(/[A-Za-z']+/g)].map((x) => x[0]);
        const content = [...words, ...usage].some((w) => !isAlignStopWord(w));
        if (!content && words.length > 0) continue;
        if (!content && words.length === 0) continue;
        contentMaps += 1;
        if (used.has(i)) contentMapsAligned += 1;
      }

      const words = tokenizeVerseSurface(row.text).filter((t) => t.kind === "word");
      const alignedWords = aligned.filter((t) => t.kind === "word");
      for (let i = 0; i < words.length; i++) {
        const surface = alignedWords[i]?.surface ?? words[i]!.surface;
        const hasTag = alignedWords[i]?.mapIndex != null;
        tagged += 1;
        if (isContent(surface)) taggedContent += 1;
        if (hasTag) {
          tappable += 1;
          if (isContent(surface)) tappableContent += 1;
        }
      }

      const unmatchedGlosses = mapRows
        .map((m, i) => ({ i, g: m.translatedWord ?? "" }))
        .filter((m) => !used.has(m.i) && m.g.trim());
      if (unmatchedGlosses.length && (book === "Psalms" || row.verse <= 3)) {
        misses.push(
          `${book} ${chapter}:${row.verse} unused glosses: ${unmatchedGlosses
            .map((m) => `"${m.g}"`)
            .join(", ")} | surface: ${row.text}`,
        );
      }
    }

    totals.tagged += tagged;
    totals.taggedContent += taggedContent;
    totals.tappable += tappable;
    totals.tappableContent += tappableContent;
    totals.maps += mapsCount;
    totals.mapsAligned += mapsAligned;
    totals.contentMaps += contentMaps;
    totals.contentMapsAligned += contentMapsAligned;

    const pct = taggedContent ? ((tappableContent / taggedContent) * 100).toFixed(1) : "0.0";
    const mapPct = mapsCount ? ((mapsAligned / mapsCount) * 100).toFixed(1) : "0.0";
    const contentPct = contentMaps ? ((contentMapsAligned / contentMaps) * 100).toFixed(1) : "0.0";
    console.log(
      `\n${book} ${chapter}: verses=${verses.rows.length} maps=${mapsCount} mapsAligned=${mapsAligned} (${mapPct}%)`,
    );
    console.log(
      `  content maps ${contentMapsAligned}/${contentMaps} (${contentPct}%) | tappable content words ${tappableContent}/${taggedContent} (${pct}%)`,
    );
    for (const m of misses.slice(0, 8)) console.log(`  ${m}`);
  }

  const contentPct = totals.contentMaps
    ? ((totals.contentMapsAligned / totals.contentMaps) * 100).toFixed(1)
    : "0.0";
  console.log(
    `\nALL: maps ${totals.mapsAligned}/${totals.maps}; content maps ${totals.contentMapsAligned}/${totals.contentMaps} (${contentPct}%)`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
