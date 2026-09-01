import { desc, eq, lte } from "drizzle-orm";
import { odbPosts } from "../shared/schema";
import { db } from "./db";
import { rowToOdbJson, type OdbPostJson } from "./odb-map";

function asDateKey(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function toJson(row: typeof odbPosts.$inferSelect): OdbPostJson {
  return rowToOdbJson({
    date: asDateKey(row.date),
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
  });
}

export function isOdbTableMissing(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  const message = err instanceof Error ? err.message : String(err);
  return code === "42P01" || /relation .*odb_posts.* does not exist/i.test(message);
}

export interface OdbStore {
  findLatestOnOrBefore(dateKey: string): Promise<OdbPostJson | null>;
  findRecentOnOrBefore(dateKey: string, count: number): Promise<OdbPostJson[]>;
  findBySourceId(id: number): Promise<OdbPostJson | null>;
}

export function createDefaultOdbStore(): OdbStore {
  return {
    async findLatestOnOrBefore(dateKey) {
      const rows = await db
        .select()
        .from(odbPosts)
        .where(lte(odbPosts.date, dateKey))
        .orderBy(desc(odbPosts.date))
        .limit(1);
      return rows[0] ? toJson(rows[0]) : null;
    },
    async findRecentOnOrBefore(dateKey, count) {
      const rows = await db
        .select()
        .from(odbPosts)
        .where(lte(odbPosts.date, dateKey))
        .orderBy(desc(odbPosts.date))
        .limit(count);
      return rows.map(toJson);
    },
    async findBySourceId(id) {
      const rows = await db
        .select()
        .from(odbPosts)
        .where(eq(odbPosts.sourceId, id))
        .limit(1);
      return rows[0] ? toJson(rows[0]) : null;
    },
  };
}
