import { eq } from "drizzle-orm";
import { userBlocks } from "../../shared/schema";
import { db } from "../db";

/** Members this viewer has blocked. Empty when the table is not migrated yet. */
export async function blockedUserIdSet(
  viewerId: string | null | undefined,
): Promise<Set<string>> {
  if (!viewerId) return new Set();
  try {
    const rows = await db
      .select({ id: userBlocks.blockedUserId })
      .from(userBlocks)
      .where(eq(userBlocks.blockerUserId, viewerId));
    return new Set(rows.map((row) => row.id));
  } catch {
    return new Set();
  }
}

export function withoutBlockedUsers<T extends { userId: string | null }>(
  rows: T[],
  blocked: Set<string>,
): T[] {
  if (blocked.size === 0) return rows;
  return rows.filter((row) => !row.userId || !blocked.has(row.userId));
}
