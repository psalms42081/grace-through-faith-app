import { and, asc, eq } from "drizzle-orm";
import { getCalendarDate } from "../../shared/calendar-date";
import { egwChapters } from "../../shared/schema";

const EGW_API_BASE = "https://a.egwwritings.org";
const EGW_TOKEN_URL = "https://cpanel.egwwritings.org/connect/token";

interface EgwToken {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: EgwToken | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.EGW_CLIENT_ID;
  const clientSecret = process.env.EGW_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("EGW_CLIENT_ID and EGW_CLIENT_SECRET are required");
  }

  if (tokenCache && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.accessToken;
  }

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "writings search",
  });

  const response = await fetch(EGW_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`EGW token request failed (${response.status}): ${text}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  console.log("[EGW] Access token obtained, expires in", data.expires_in, "seconds");
  return tokenCache.accessToken;
}

async function egwFetch(path: string, params?: Record<string, string>): Promise<any> {
  const token = await getAccessToken();
  const url = new URL(path, EGW_API_BASE);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`EGW API error (${response.status}): ${text}`);
  }

  return response.json();
}

export interface EgwBook {
  id: number;
  title: string;
  abbreviation: string;
  lang: string;
  type: string;
  coverUrl: string | null;
}

export interface EgwSearchResult {
  refcode: string;
  text: string;
  bookTitle: string;
  paraId: string;
}

export async function getBooks(lang = "en"): Promise<EgwBook[]> {
  const data = await egwFetch("/content/books", { lang, can_read: "true" });
  const books = data.results || data.items || (Array.isArray(data) ? data : []);
  return books.map((b: any) => ({
    id: b.book_id || b.pubnr || b.id,
    title: b.title || "",
    abbreviation: b.code || b.abbreviation || "",
    lang: b.lang || lang,
    type: b.type || "",
    coverUrl: `${EGW_API_BASE}/covers/${b.book_id || b.pubnr || b.id}?type=medium`,
  }));
}

export async function getBookToc(bookId: number): Promise<any> {
  return egwFetch(`/content/books/${bookId}/toc`);
}

export async function getChapter(bookId: number, paraId: string): Promise<any> {
  return egwFetch(`/content/books/${bookId}/chapter/${paraId}`);
}

export async function searchWritings(query: string, lang = "en"): Promise<EgwSearchResult[]> {
  const data = await egwFetch("/search", { query, lang });
  const results = data.results || data.items || [];
  return results.map((r: any) => ({
    refcode: r.refcode_short || r.refcode || "",
    text: r.snippet || r.content || r.text || "",
    bookTitle: r.pub_name || r.book_title || r.title || "",
    paraId: r.para_id || "",
  }));
}

export async function searchByScripture(reference: string, lang = "en"): Promise<any> {
  return egwFetch("/search/advanced/scripture", { query: reference, lang });
}

export async function searchTopical(topic: string, lang = "en"): Promise<any> {
  return egwFetch("/search/advanced/topical", { query: topic, lang });
}

export async function getBookCover(bookId: number, size: "small" | "medium" | "large" = "medium"): Promise<string> {
  return `${EGW_API_BASE}/covers/${bookId}?type=${size}`;
}

// Confirmed EGW book IDs from /api/egw/books — order is the existing month rotation.
const EGW_DEVOTIONAL_BOOKS = [
  { id: 108, title: "Steps to Christ", slug: "steps-to-christ" },
  { id: 130, title: "The Desire of Ages", slug: "desire-of-ages" },
  { id: 15, title: "Christ's Object Lessons", slug: "christs-object-lessons" },
] as const;

export const EGW_EXCERPT_MAX_CHARS = 600;

export type EgwDailySource = "local" | "live";

export type EgwDailyDevotion = {
  title: string;
  content: string;
  bookTitle: string;
  bookId: number;
  chapterNumber: number;
  date: string;
  sourceUrl: string;
  source: EgwDailySource;
};

function bookSourceUrl(bookId: number): string {
  return `https://egwwritings.org/book/b${bookId}`;
}

function cutAtSentenceBoundary(text: string, maxChars: number): string {
  const window = text.slice(0, maxChars);
  const matches = [...window.matchAll(/[.!?]["']?/g)];
  const last = matches[matches.length - 1];
  if (last?.index != null && last.index > 0) {
    return text.slice(0, last.index + last[0].length).trim();
  }
  const firstSentence = text.match(/^[\s\S]*?[.!?]["']?/);
  if (firstSentence) return firstSentence[0].trim();
  return text.trim();
}

/** First N paragraphs that fit the card length; never cuts mid-sentence. */
export function excerptEgwParagraphs(
  paragraphs: string[],
  maxChars = EGW_EXCERPT_MAX_CHARS,
): string {
  const parts = paragraphs.map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (parts.length === 0) return "";

  const selected: string[] = [];
  let size = 0;
  for (const para of parts) {
    const extra = selected.length === 0 ? para.length : 2 + para.length;
    if (selected.length === 0 && para.length > maxChars) {
      return cutAtSentenceBoundary(para, maxChars);
    }
    if (size + extra > maxChars) break;
    selected.push(para);
    size += extra;
  }
  return selected.join("\n\n");
}

function asEgwList(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export function resolveEgwDailyCalendar(instant: Date, timeZone: unknown) {
  const calendar = getCalendarDate(instant, timeZone);
  return {
    dateKey: calendar.dateKey,
    bookIndex: (calendar.month - 1) % EGW_DEVOTIONAL_BOOKS.length,
    dayOfMonthIndex: calendar.day - 1,
  };
}

async function getEgwLocalDailyDevotion(
  timeZone?: unknown,
): Promise<EgwDailyDevotion | null> {
  const local = resolveEgwDailyCalendar(new Date(), timeZone);
  const book = EGW_DEVOTIONAL_BOOKS[local.bookIndex];
  const { db } = await import("../db");

  const chapterRows = await db
    .select({ chapterNumber: egwChapters.chapterNumber })
    .from(egwChapters)
    .where(eq(egwChapters.bookSlug, book.slug))
    .orderBy(asc(egwChapters.chapterNumber));

  if (!chapterRows.length) return null;

  const picked = chapterRows[local.dayOfMonthIndex % chapterRows.length];
  const [chapter] = await db
    .select()
    .from(egwChapters)
    .where(
      and(
        eq(egwChapters.bookSlug, book.slug),
        eq(egwChapters.chapterNumber, picked.chapterNumber),
      ),
    )
    .limit(1);

  if (!chapter) return null;

  const paragraphs = Array.isArray(chapter.paragraphs) ? chapter.paragraphs : [];
  const content = excerptEgwParagraphs(paragraphs);
  if (!content) return null;

  return {
    title: chapter.chapterTitle,
    content,
    bookTitle: chapter.book || book.title,
    bookId: book.id,
    chapterNumber: chapter.chapterNumber,
    date: local.dateKey,
    sourceUrl: bookSourceUrl(book.id),
    source: "local",
  };
}

async function getEgwLiveDailyDevotion(
  lang: string,
  timeZone?: unknown,
): Promise<EgwDailyDevotion | null> {
  const local = resolveEgwDailyCalendar(new Date(), timeZone);
  const book = EGW_DEVOTIONAL_BOOKS[local.bookIndex];

  const toc = asEgwList(await egwFetch(`/content/books/${book.id}/toc`, { lang }));
  if (!toc.length) return null;

  const chapters = toc.filter((c: any) => c.level === 1 && c.title && !c.dup);
  const chapter = chapters[local.dayOfMonthIndex % chapters.length];
  if (!chapter) return null;

  const chapterRef = String(chapter.para_id);
  const chapterParaId = chapterRef.includes(".") ? chapterRef.split(".").pop()! : chapterRef;
  const sourceRef = chapterRef.includes(".") ? chapterRef : `${book.id}.${chapterRef}`;
  const content = await egwFetch(
    `/content/books/${book.id}/chapter/${chapterParaId}`,
    { lang }
  );
  if (!content) return null;

  const rawParagraphs: string[] = Array.isArray(content)
    ? content
        .filter((p: any) => p.element_type === "p" && !String(p.content || "").includes("non-egw-foreword") && String(p.content || "").length > 50)
        .map((p: any) => String(p.content || "").replace(/<[^>]+>/g, " "))
    : [String(content.content || "").replace(/<[^>]+>/g, " ")];

  const text = excerptEgwParagraphs(rawParagraphs);
  if (!text) return null;

  return {
    title: chapter.title || `Day ${local.dayOfMonthIndex + 1}`,
    content: text,
    bookTitle: book.title,
    bookId: book.id,
    chapterNumber: (local.dayOfMonthIndex % chapters.length) + 1,
    date: local.dateKey,
    sourceUrl: `https://text.egwwritings.org/read/${sourceRef}`,
    source: "live",
  };
}

export async function getEgwDailyDevotion(
  lang: string = "en",
  timeZone?: unknown,
): Promise<EgwDailyDevotion | null> {
  try {
    const local = await getEgwLocalDailyDevotion(timeZone);
    if (local) return local;
    console.warn("[egw] Local chapter miss for today's rotation; trying live API");
  } catch (err) {
    console.error("[egw] Local chapter lookup failed:", err);
  }

  if (!isEgwConfigured()) return null;

  try {
    return await getEgwLiveDailyDevotion(lang, timeZone);
  } catch (err) {
    console.error("[egw] Live API devotion failed:", err);
    return null;
  }
}

export function isEgwConfigured(): boolean {
  return !!(process.env.EGW_CLIENT_ID && process.env.EGW_CLIENT_SECRET);
}
