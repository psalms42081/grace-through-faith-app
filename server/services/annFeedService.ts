import Parser from "rss-parser";

export interface AnnArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  imageUrl: string | null;
  guid: string;
}

interface AnnFeedCache {
  articles: AnnArticle[];
  fetchedAt: number;
}

const FEED_URL = "https://feeds.feedburner.com/ann-en?format=xml";
const CACHE_TTL_MS = 30 * 60 * 1000;

let feedCache: AnnFeedCache | null = null;

const parser = new Parser({
  customFields: {
    item: [["enclosure", "enclosure", { keepArray: false }]],
  },
});

function extractImageUrl(item: any): string | null {
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  if (item.enclosure?.$?.url) {
    return item.enclosure.$.url;
  }
  const content = item["content:encoded"] || item.content || item.description || "";
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  return null;
}

export async function fetchAnnFeed(forceRefresh = false): Promise<AnnArticle[]> {
  if (
    !forceRefresh &&
    feedCache &&
    Date.now() - feedCache.fetchedAt < CACHE_TTL_MS
  ) {
    return feedCache.articles;
  }

  try {
    const feed = await parser.parseURL(FEED_URL);

    const articles: AnnArticle[] = (feed.items || []).map((item: any) => ({
      title: item.title || "",
      link: item.link || "",
      pubDate: item.pubDate || item.isoDate || "",
      description: (item.contentSnippet || item.description || "").substring(0, 300),
      imageUrl: extractImageUrl(item),
      guid: item.guid || item.link || "",
    }));

    feedCache = {
      articles,
      fetchedAt: Date.now(),
    };

    console.log(`[ANN Feed] Fetched ${articles.length} articles, ${articles.filter(a => a.imageUrl).length} with images`);
    return articles;
  } catch (error) {
    console.error("[ANN Feed] Fetch error:", error);
    if (feedCache) {
      console.log("[ANN Feed] Returning stale cache");
      return feedCache.articles;
    }
    return [];
  }
}

export function getAnnFeedCacheStatus() {
  return {
    cached: !!feedCache,
    articleCount: feedCache?.articles.length || 0,
    fetchedAt: feedCache?.fetchedAt ? new Date(feedCache.fetchedAt).toISOString() : null,
    ageMinutes: feedCache ? Math.round((Date.now() - feedCache.fetchedAt) / 60000) : null,
    stale: feedCache ? Date.now() - feedCache.fetchedAt > CACHE_TTL_MS : true,
  };
}
