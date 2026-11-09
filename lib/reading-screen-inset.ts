import { Platform } from "react-native";

/** Android 3-button navigation is about 48dp. A missing inset still has to clear it. */
const ANDROID_NAV_FALLBACK = 48;

/**
 * Bottom padding for a full-screen reading screen that has no tab bar.
 * Uses the safe-area inset, and on Android never less than the system nav bar.
 */
export function readingScreenBottomPad(insetBottom: number, extra = 24): number {
  const inset =
    Platform.OS === "android"
      ? Math.max(insetBottom, ANDROID_NAV_FALLBACK)
      : Math.max(0, insetBottom);
  return inset + extra;
}
