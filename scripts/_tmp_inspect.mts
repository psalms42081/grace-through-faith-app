import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const q = async (label: string, sql: string, params: unknown[] = []) => {
  const r = await pool.query(sql, params);
  console.log(`--- ${label}`);
  console.table(r.rows);
};

await q(
  "translations with <...> / &lt; markers in text",
  `SELECT t.abbreviation, count(*)::int AS verses
     FROM bible_verse v JOIN bible_translation t ON t.id = v.translation_id
    WHERE v.text ~ '(&lt;|<)[A-Z]+(&gt;|>)'
    GROUP BY 1 ORDER BY 2 DESC`,
);
await q(
  "BBE markers by book/chapter",
  `SELECT b.name, v.chapter, count(*)::int AS n, min(v.verse) AS first, max(v.verse) AS last
     FROM bible_verse v JOIN bible_translation t ON t.id = v.translation_id JOIN bible_book b ON b.id = v.book_id
    WHERE t.abbreviation = 'BBE' AND v.text ~ '(&lt;|<)[A-Z]+(&gt;|>)'
    GROUP BY 1, 2 ORDER BY 1, 2`,
);
await q(
  "BBE samples",
  `SELECT b.name, v.chapter, v.verse, left(v.text, 70) AS text
     FROM bible_verse v JOIN bible_translation t ON t.id = v.translation_id JOIN bible_book b ON b.id = v.book_id
    WHERE t.abbreviation = 'BBE' AND v.text ~ '(&lt;|<)[A-Z]+(&gt;|>)'
    ORDER BY b.id, v.chapter, v.verse LIMIT 30`,
);
await q(
  "KJV Psalm 119 v1, v9 (for comparison)",
  `SELECT v.verse, left(v.text, 70) AS text
     FROM bible_verse v JOIN bible_translation t ON t.id = v.translation_id JOIN bible_book b ON b.id = v.book_id
    WHERE t.abbreviation = 'KJV' AND b.name = 'Psalms' AND v.chapter = 119 AND v.verse IN (1, 9)`,
);
await q(
  "bible_cache columns",
  `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bible_cache' ORDER BY ordinal_position`,
);
await pool.end();
