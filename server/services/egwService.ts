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
    text: r.content || r.text || "",
    bookTitle: r.book_title || r.title || "",
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

// Known EGW devotional book IDs from egwwritings.org
// My Life Today = 821, Morning Watch = 137,
// With God at Dawn = 822, Reflecting Christ = 823
const EGW_DEVOTIONAL_BOOKS = [
  { id: 108, title: "Steps to Christ" },
  { id: 130, title: "The Desire of Ages" },
  { id: 15, title: "Christ's Object Lessons" },
];

export async function getEgwDailyDevotion(
  lang: string = "en"
): Promise<{
  title: string;
  content: string;
  bookTitle: string;
  bookId: number;
  date: string;
} | null> {
  try {
    // Use day of year to pick consistent daily entry
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Pick book based on month (rotate through devotionals)
    const bookIndex = now.getMonth() % EGW_DEVOTIONAL_BOOKS.length;
    const book = EGW_DEVOTIONAL_BOOKS[bookIndex];

    // Fetch table of contents for the book
    const toc = await egwFetch(`/content/books/${book.id}/toc`, { lang });
    if (!Array.isArray(toc) || !toc.length) return null;

    // Pick chapter based on day of month
    const dayOfMonth = now.getDate() - 1;
    const chapters = toc.filter((c: any) => c.level === 1 && c.title && !c.dup);
    const chapter = chapters[dayOfMonth % chapters.length];
    if (!chapter) return null;

    // Fetch chapter content
    const content = await egwFetch(
      `/content/books/${book.id}/chapter/${chapter.para_id}`,
      { lang }
    );
    if (!content) return null;

    const rawText = Array.isArray(content)
      ? content.filter((p: any) => p.element_type === "p").map((p: any) => p.content || "").join(" ")
      : (content.content || "");
    const text = rawText
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 600);

    return {
      title: chapter.title || `Day ${dayOfMonth + 1}`,
      content: text,
      bookTitle: book.title,
      bookId: book.id,
      date: now.toISOString().split("T")[0],
    };
  } catch (err) {
    console.error("[egw] Daily devotion fetch failed:", err);
    return null;
  }
}

export function isEgwConfigured(): boolean {
  return !!(process.env.EGW_CLIENT_ID && process.env.EGW_CLIENT_SECRET);
}
