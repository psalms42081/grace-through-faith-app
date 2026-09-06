import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_SHARE_URL } from "@/constants/app";

export const HOME_SHARE_DISMISS_KEY = "home-share-app-dismissed-at";
export const HOME_SHARE_DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

export const HOME_SHARE_MESSAGE =
  `Informed Ministries — Scripture, devotions and Sabbath School in one place: ${APP_SHARE_URL}`;

export type AppShareOutcome = "shared" | "copied" | "cancelled";

/** Home card only: Share now persists the same 30-day hide as Dismiss. */
export function homeShareNowShouldDismiss(outcome: AppShareOutcome): boolean {
  switch (outcome) {
    case "shared":
    case "copied":
    case "cancelled":
      return true;
  }
}

export function shouldShowHomeShareCard(
  dismissedAt: number | null,
  now: number,
): boolean {
  if (dismissedAt == null) return true;
  if (!Number.isFinite(dismissedAt)) return true;
  return now - dismissedAt >= HOME_SHARE_DISMISS_MS;
}

export async function readHomeShareDismissedAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(HOME_SHARE_DISMISS_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function persistHomeShareDismissedAt(now: number): Promise<void> {
  await AsyncStorage.setItem(HOME_SHARE_DISMISS_KEY, String(now));
}
