import { sql } from "drizzle-orm";
import { odbPosts } from "../../shared/schema";
import { db } from "../db";
import { mapWpPost, type OdbMappedRow } from "../odb-map";
import { isOdbTableMissing } from "../odb-store";

export const ODB_WP_POSTS_URL = "https://odb.org/wp-json/wp/v2/posts";
export const ODB_FETCH_TIMEOUT_MS = 20_000;
export const ODB_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
export const ODB_BACKFILL_DAYS = 14;
export const ODB_REFRESH_PER_PAGE = 10;
export const ODB_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function listingUrl(perPage: number): string {
  return `${ODB_WP_POSTS_URL}?per_page=${perPage}&orderby=date&order=desc`;
}

export async function fetchOdbListing(perPage: number): Promise<OdbMappedRow[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ODB_FETCH_TIMEOUT_MS);
  const url = listingUrl(perPage);
  try {
    const resp = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": ODB_BROWSER_USER_AGENT,
      },
    });
    if (!resp.ok) {
      throw new Error(`ODB listing HTTP ${resp.status} from ${url}`);
    }
    const posts = await resp.json();
    if (!Array.isArray(posts)) return [];
    return posts
      .map((post) => mapWpPost(post))
      .filter((row): row is OdbMappedRow => row != null);
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`ODB listing timed out after ${ODB_FETCH_TIMEOUT_MS}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function upsertOdbPosts(rows: OdbMappedRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const unique = new Map<string, OdbMappedRow>();
  for (const row of rows) unique.set(row.date, row);
  const values = [...unique.values()].map((row) => ({
    date: row.date,
    title: row.title,
    author: row.author,
    scriptureRef: row.scriptureRef,
    readingRef: row.readingRef,
    bodyText: row.bodyText,
    verse: row.verse,
    thought: row.thought,
    response: row.response,
    insights: row.insights,
    insightsAuthor: row.insightsAuthor,
    bibleInAYear: row.bibleInAYear,
    sourceUrl: row.sourceUrl,
    imageUrl: row.imageUrl,
    sourceId: row.sourceId,
    fetchedAt: new Date(),
  }));
  await db
    .insert(odbPosts)
    .values(values)
    .onConflictDoUpdate({
      target: odbPosts.date,
      set: {
        title: sql`excluded.title`,
        author: sql`excluded.author`,
        scriptureRef: sql`excluded.scripture_ref`,
        readingRef: sql`excluded.reading_ref`,
        bodyText: sql`excluded.body_text`,
        verse: sql`excluded.verse`,
        thought: sql`excluded.thought`,
        response: sql`excluded.response`,
        insights: sql`excluded.insights`,
        insightsAuthor: sql`excluded.insights_author`,
        bibleInAYear: sql`excluded.bible_in_a_year`,
        sourceUrl: sql`excluded.source_url`,
        imageUrl: sql`excluded.image_url`,
        sourceId: sql`excluded.source_id`,
        fetchedAt: sql`excluded.fetched_at`,
      },
    });
  return values.length;
}

async function tableIsEmpty(): Promise<boolean> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(odbPosts);
  return (rows[0]?.count ?? 0) === 0;
}

export async function runOdbRefresh(): Promise<void> {
  const empty = await tableIsEmpty();
  const perPage = empty ? ODB_BACKFILL_DAYS : ODB_REFRESH_PER_PAGE;
  const url = listingUrl(perPage);
  console.log(
    `[ODB] refresh start ${empty ? "backfill" : "latest"} ${url}`,
  );
  const rows = await fetchOdbListing(perPage);
  const upserted = await upsertOdbPosts(rows);
  console.log(`[ODB] refresh ok upserted=${upserted} fetched=${rows.length}`);
}

export function initOdbRefresh(): void {
  const tick = () => {
    runOdbRefresh().catch((err) => {
      if (isOdbTableMissing(err)) {
        console.error(
          "[ODB] refresh skipped: odb_posts is missing — run migrations/0011_odb_posts.sql",
        );
        return;
      }
      console.error("[ODB] refresh failed:", err);
    });
  };
  tick();
  setInterval(tick, ODB_REFRESH_INTERVAL_MS);
}
