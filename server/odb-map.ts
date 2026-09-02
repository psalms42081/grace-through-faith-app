export type OdbPostJson = {
  id: number;
  title: string;
  date: string;
  author: string;
  verse: string;
  verseRef: string;
  passage: string;
  content: string;
  thought: string;
  response: string;
  insights: string;
  insightsAuthor: string;
  bibleInAYear: string;
  url: string;
  imageUrl: string | null;
};

export type OdbMappedRow = {
  date: string;
  title: string;
  author: string;
  scriptureRef: string;
  readingRef: string;
  bodyText: string;
  verse: string;
  thought: string;
  response: string;
  insights: string;
  insightsAuthor: string;
  bibleInAYear: string;
  sourceUrl: string;
  imageUrl: string | null;
  sourceId: number | null;
};

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .trim();
}

function extractScriptureRef(html: string): string {
  const match = (html || "").match(/search=([^"&]+)/);
  if (match) return decodeURIComponent(match[1].replace(/\+/g, " "));
  return stripHtml(html);
}

export function mapWpPost(p: {
  id?: number;
  title?: { rendered?: string };
  date?: string;
  author_name?: string;
  verse?: string;
  passage?: string;
  content?: { rendered?: string };
  thought?: string;
  response?: string;
  insights?: string;
  insights_author?: string;
  bible_in_a_year?: string;
  link?: string;
  slug?: string;
  jetpack_featured_media_url?: string | null;
}): OdbMappedRow | null {
  const date = (p.date || "").split("T")[0] || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return {
    date,
    title: stripHtml(p.title?.rendered || ""),
    author: p.author_name || "",
    scriptureRef: extractScriptureRef(p.verse || ""),
    readingRef: extractScriptureRef(p.passage || ""),
    bodyText: stripHtml(p.content?.rendered || ""),
    verse: stripHtml(p.verse || ""),
    thought: stripHtml(p.thought || ""),
    response: stripHtml(p.response || ""),
    insights: stripHtml(p.insights || ""),
    insightsAuthor: p.insights_author || "",
    bibleInAYear: stripHtml(p.bible_in_a_year || ""),
    sourceUrl: p.link || `https://odb.org/${p.slug || ""}`,
    imageUrl: p.jetpack_featured_media_url || null,
    sourceId: typeof p.id === "number" ? p.id : null,
  };
}

export type OdbRssItem = {
  date: string;
  title: string;
  author: string;
  descriptionHtml: string;
  sourceUrl: string;
  imageUrl: string | null;
};

export function mapRssItem(item: OdbRssItem): OdbMappedRow | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return null;
  return {
    date: item.date,
    title: stripHtml(item.title),
    author: stripHtml(item.author),
    scriptureRef: "",
    readingRef: "",
    bodyText: stripHtml(item.descriptionHtml),
    verse: "",
    thought: "",
    response: "",
    insights: "",
    insightsAuthor: "",
    bibleInAYear: "",
    sourceUrl: item.sourceUrl,
    imageUrl: item.imageUrl,
    sourceId: null,
  };
}

export function rowToOdbJson(row: OdbMappedRow): OdbPostJson {
  return {
    id: row.sourceId ?? 0,
    title: row.title,
    date: row.date,
    author: row.author,
    verse: row.verse,
    verseRef: row.scriptureRef,
    passage: row.readingRef,
    content: row.bodyText,
    thought: row.thought,
    response: row.response,
    insights: row.insights,
    insightsAuthor: row.insightsAuthor,
    bibleInAYear: row.bibleInAYear,
    url: row.sourceUrl,
    imageUrl: row.imageUrl,
  };
}
