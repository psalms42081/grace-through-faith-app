import { sql } from "drizzle-orm";
import { odbPosts } from "../../shared/schema";
import {
  mapRssItem,
  mapWpPost,
  type OdbMappedRow,
  type OdbRssItem,
} from "../odb-map";
import { odbDateKeyFromTimeZone } from "../odb-select";

export const ODB_FEED_URL = "https://odb.org/feed/";
export const ODB_WP_POSTS_URL = "https://odb.org/wp-json/wp/v2/posts";
export const ODB_FETCH_TIMEOUT_MS = 20_000;
export const ODB_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
export const ODB_BACKOFF_INTERVAL_MS = 60 * 60 * 1000;
export const ODB_FAILURES_BEFORE_BACKOFF = 2;
export const ODB_JITTER_MS = 30_000;
export const ODB_CONTACT_EMAIL = "joseph@gracethroughfaith.app";
export const ODB_USER_AGENT =
  `Informed Ministries (https://gracethroughfaith.app; ${ODB_CONTACT_EMAIL})`;

const DATE_IN_PATH = /\/(\d{4})\/(\d{2})\/(\d{2})(?:\/|$)/;

export function addUtcDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day + days));
  return dt.toISOString().slice(0, 10);
}

export function odbWpDayUrl(dateKey: string): string {
  const prev = addUtcDays(dateKey, -1);
  const next = addUtcDays(dateKey, 1);
  return `${ODB_WP_POSTS_URL}?after=${prev}T23:59:59&before=${next}T00:00:00&per_page=3`;
}

export function odbDayPageUrl(dateKey: string): string {
  return `https://odb.org/${dateKey.replace(/-/g, "/")}`;
}

export function htmlIsOdbSpaShell(html: string): boolean {
  return /id=["']root["']/.test(html) && /id=["']loading-screen["']/.test(html);
}

export function nextOdbRefreshDelayMs(consecutiveFailures: number): number {
  return consecutiveFailures >= ODB_FAILURES_BEFORE_BACKOFF
    ? ODB_BACKOFF_INTERVAL_MS
    : ODB_REFRESH_INTERVAL_MS;
}

export function withOdbJitter(
  delayMs: number,
  random: () => number = Math.random,
): number {
  const unit = Math.min(1, Math.max(0, random()));
  return delayMs + Math.floor(unit * ODB_JITTER_MS);
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function tagValue(block: string, tag: string): string {
  const cdata = block.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"),
  );
  if (cdata) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return plain ? decodeXml(plain[1]) : "";
}

export function dateKeyFromOdbUrl(url: string): string | null {
  const match = url.match(DATE_IN_PATH);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function parseOdbRss(xml: string): OdbRssItem[] {
  if (!xml || /just a moment|cf-browser-verification|challenge-platform/i.test(xml)) {
    return [];
  }
  const items: OdbRssItem[] = [];
  for (const match of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const block = match[0];
    const link = tagValue(block, "link") || tagValue(block, "guid");
    const date = dateKeyFromOdbUrl(link);
    if (!date) continue;
    const imageRaw = tagValue(block, "image");
    items.push({
      date,
      title: tagValue(block, "title"),
      author: tagValue(block, "dc:creator") || tagValue(block, "author"),
      descriptionHtml: tagValue(block, "description"),
      sourceUrl: link || `https://odb.org/${date.replace(/-/g, "/")}/`,
      imageUrl: imageRaw || null,
    });
  }
  return items;
}

export function pickNewestMissingOdbItem(
  items: OdbRssItem[],
  existingDates: Iterable<string>,
  todayKey: string,
): OdbRssItem | null {
  const have = new Set(
    [...existingDates].map((value) => String(value).slice(0, 10)),
  );
  const missing = items.filter((item) => {
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
      item.date <= todayKey &&
      !have.has(item.date)
    );
  });
  missing.sort((a, b) => b.date.localeCompare(a.date));
  return missing[0] ?? null;
}

function odbHeaders(accept: string): HeadersInit {
  return {
    Accept: accept,
    "User-Agent": ODB_USER_AGENT,
  };
}

async function fetchOdbText(url: string, accept: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ODB_FETCH_TIMEOUT_MS);
  const started = Date.now();
  try {
    const resp = await fetch(url, {
      signal: ctrl.signal,
      headers: odbHeaders(accept),
    });
    const ms = Date.now() - started;
    const body = await resp.text();
    console.log(`[ODB] fetch ${resp.status} ${ms}ms ${url}`);
    if (resp.status === 429 || resp.status === 403) {
      throw new Error(`ODB HTTP ${resp.status} from ${url}`);
    }
    if (!resp.ok) {
      throw new Error(`ODB HTTP ${resp.status} from ${url}`);
    }
    if (/just a moment|cf-browser-verification|challenge-platform/i.test(body)) {
      throw new Error(`ODB Cloudflare challenge from ${url}`);
    }
    return body;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`ODB timed out after ${ODB_FETCH_TIMEOUT_MS}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchOdbWpDay(dateKey: string): Promise<OdbMappedRow | null> {
  const url = odbWpDayUrl(dateKey);
  const body = await fetchOdbText(url, "application/json");
  if (body.trimStart().startsWith("<")) {
    throw new Error(`ODB WP day returned HTML from ${url}`);
  }
  const posts = JSON.parse(body) as unknown;
  if (!Array.isArray(posts)) return null;
  for (const post of posts) {
    const row = mapWpPost(post);
    if (row?.date === dateKey) return row;
  }
  return null;
}

function isOdbTableMissing(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  const message = err instanceof Error ? err.message : String(err);
  return code === "42P01" || /relation .*odb_posts.* does not exist/i.test(message);
}

async function getDb() {
  const { db } = await import("../db");
  return db;
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
  const db = await getDb();
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

async function existingOdbDates(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.select({ date: odbPosts.date }).from(odbPosts);
  return new Set(rows.map((row) => String(row.date).slice(0, 10)));
}

export async function runOdbRefresh(): Promise<void> {
  console.log(`[ODB] refresh start ${ODB_FEED_URL}`);
  const xml = await fetchOdbText(
    ODB_FEED_URL,
    "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
  );
  const items = parseOdbRss(xml);
  if (items.length === 0) {
    throw new Error(`ODB RSS contained no items from ${ODB_FEED_URL}`);
  }
  const todayKey = odbDateKeyFromTimeZone(undefined);
  const existing = await existingOdbDates();
  const next = pickNewestMissingOdbItem(items, existing, todayKey);
  if (!next) {
    console.log("[ODB] refresh ok no new dates");
    return;
  }
  const wpUrl = odbWpDayUrl(next.date);
  const dayPageUrl = odbDayPageUrl(next.date);
  console.log(`[ODB] refresh start day ${wpUrl} ${dayPageUrl}`);
  let row: OdbMappedRow | null = null;
  try {
    row = await fetchOdbWpDay(next.date);
  } catch (err) {
    console.warn("[ODB] refresh day WP failed:", err);
  }
  if (!row) {
    try {
      const html = await fetchOdbText(dayPageUrl, "text/html");
      if (htmlIsOdbSpaShell(html)) {
        console.log(`[ODB] refresh day html is SPA shell; using RSS item for ${next.date}`);
      }
    } catch (err) {
      console.warn("[ODB] refresh day html failed:", err);
    }
    row = mapRssItem(next);
  }
  if (!row) {
    throw new Error(`ODB could not map ${next.date}`);
  }
  const upserted = await upsertOdbPosts([row]);
  console.log(`[ODB] refresh ok upserted=${upserted} date=${row.date}`);
}

export function initOdbRefresh(): void {
  let consecutiveFailures = 0;
  const tick = () => {
    runOdbRefresh()
      .then(() => {
        consecutiveFailures = 0;
      })
      .catch((err) => {
        consecutiveFailures += 1;
        if (isOdbTableMissing(err)) {
          console.error(
            "[ODB] refresh skipped: odb_posts is missing — run migrations/0011_odb_posts.sql",
          );
          consecutiveFailures = 0;
          return;
        }
        console.error("[ODB] refresh failed:", err);
      })
      .finally(() => {
        const delay = withOdbJitter(nextOdbRefreshDelayMs(consecutiveFailures));
        console.log(
          `[ODB] next run in ${Math.round(delay / 1000)}s failures=${consecutiveFailures}`,
        );
        setTimeout(tick, delay);
      });
  };
  tick();
}
