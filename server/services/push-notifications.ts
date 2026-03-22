import { db } from "../db";
import { deviceTokens } from "../../shared/schema";
import { eq, inArray } from "drizzle-orm";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
}

export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!tokens.length) return;

  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: "default",
  }));

  const chunks = chunkArray(messages, 100);

  for (const chunk of chunks) {
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        console.error(
          `[push] Expo push API error: ${response.status} ${response.statusText}`
        );
      }
    } catch (err) {
      console.error("[push] Failed to send push notifications:", err);
    }
  }
}

export async function getGroupMemberTokens(
  groupId: string,
  excludeUserId?: string
): Promise<string[]> {
  const { prayerGroupMembers } = await import("../../shared/schema");

  let memberQuery = db
    .select({ userId: prayerGroupMembers.userId })
    .from(prayerGroupMembers)
    .where(eq(prayerGroupMembers.groupId, groupId));

  const members = await memberQuery;

  const userIds = members
    .map((m) => m.userId)
    .filter((id) => id !== excludeUserId);

  if (!userIds.length) return [];

  const tokens = await db
    .select({ pushToken: deviceTokens.pushToken })
    .from(deviceTokens)
    .where(inArray(deviceTokens.userId, userIds));

  return tokens.map((t) => t.pushToken);
}

export async function notifyGroupMembers(
  groupId: string,
  excludeUserId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const tokens = await getGroupMemberTokens(groupId, excludeUserId);
    if (tokens.length > 0) {
      await sendPushNotifications(tokens, title, body, data);
    }
  } catch (err) {
    console.error("[push] notifyGroupMembers error:", err);
  }
}

export async function notifyUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const tokens = await db
      .select({ pushToken: deviceTokens.pushToken })
      .from(deviceTokens)
      .where(eq(deviceTokens.userId, userId));
    const tokenList = tokens.map((t) => t.pushToken);
    if (tokenList.length > 0) {
      await sendPushNotifications(tokenList, title, body, data);
    }
  } catch (err) {
    console.error("[push] notifyUser error:", err);
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
