import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";

const QUEUE_KEY = "@grace-through-faith/analytics-queue";
const FLUSH_INTERVAL = 30_000;

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, string | number | boolean>;
  timestamp: number;
  platform: string;
}

let queue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function track(event: string, properties?: Record<string, string | number | boolean>) {
  const entry: AnalyticsEvent = {
    event,
    properties,
    timestamp: Date.now(),
    platform: Platform.OS,
  };
  queue.push(entry);

  if (queue.length >= 10) {
    flush();
  }
}

export async function flush() {
  if (queue.length === 0) return;

  const batch = [...queue];
  queue = [];

  try {
    const baseUrl = getApiUrl();
    const url = new URL("/api/analytics/events", baseUrl).toString();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
    });

    if (!res.ok) {
      queue.push(...batch);
      await persistQueue();
    }
  } catch {
    queue.push(...batch);
    await persistQueue();
  }
}

async function persistQueue() {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

async function loadQueue() {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AnalyticsEvent[];
      queue.push(...parsed);
      await AsyncStorage.removeItem(QUEUE_KEY);
    }
  } catch {}
}

export function initAnalytics() {
  loadQueue();

  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(() => {
    flush();
  }, FLUSH_INTERVAL);
}

export async function reportError(error: string, componentStack?: string) {
  try {
    const baseUrl = getApiUrl();
    const url = new URL("/api/analytics/error", baseUrl).toString();
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error,
        componentStack: componentStack?.substring(0, 2000),
        timestamp: Date.now(),
        platform: Platform.OS,
      }),
    });
  } catch {}
}
