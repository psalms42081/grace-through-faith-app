import { apiRequest, getApiUrl } from "./query-client";

const DEBOUNCE_WINDOW_MS = 30_000;

const recentCalls = new Map<string, number>();

function makeKey(topic: string, topicType: string): string {
  return `${topic.toLowerCase().trim()}::${topicType}`;
}

function pruneStaleEntries() {
  const now = Date.now();
  for (const [key, ts] of recentCalls) {
    if (now - ts >= DEBOUNCE_WINDOW_MS) {
      recentCalls.delete(key);
    }
  }
}

export async function logEngagement(params: {
  userId: string;
  topic: string;
  topicType: string;
  contentId?: string;
  durationSec?: number;
}): Promise<boolean> {
  const { userId, topic, topicType, contentId, durationSec } = params;
  const key = makeKey(topic, topicType);
  const now = Date.now();

  const lastCall = recentCalls.get(key);
  if (lastCall && now - lastCall < DEBOUNCE_WINDOW_MS) {
    return false;
  }

  recentCalls.set(key, now);

  if (recentCalls.size > 500) {
    pruneStaleEntries();
  }

  try {
    await apiRequest("POST", "/api/analytics/engagement", {
      user_id: userId,
      topic,
      topic_type: topicType,
      content_id: contentId,
      duration_sec: durationSec ?? 0,
    });
    return true;
  } catch (err) {
    console.warn("[EngagementLogger] Failed to log engagement:", err);
    return false;
  }
}

export function resetEngagementDebounce() {
  recentCalls.clear();
}
