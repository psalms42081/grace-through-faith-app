import { useCallback, useEffect, useState, type RefObject } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

/**
 * True only while this screen is the focused one and the app is in the foreground.
 * Players unmount when this is false, so audio cannot continue on Home or in the background.
 *
 * `fullscreenLock` stays set while a video is in full screen. Android full screen
 * (expo-video's activity, or a WebView custom view) backgrounds this screen, and
 * that must not count as the user leaving — the player has to stay mounted and
 * keep playing. A real background still drops the surface on the next frame.
 */
export function useVideoSurfaceActive(
  fullscreenLock?: RefObject<boolean | null>,
): boolean {
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [settledForeground, setSettledForeground] = useState(
    AppState.currentState === "active",
  );

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" && fullscreenLock?.current) return;
      setForeground(state === "active");
    });
    return () => subscription.remove();
  }, [fullscreenLock]);

  useEffect(() => {
    if (foreground || fullscreenLock?.current) {
      setSettledForeground(true);
      return;
    }
    // Full-screen enter can be reported just after the background event.
    // Wait one frame so that signal can set the lock before the player unmounts.
    const id = requestAnimationFrame(() => {
      if (fullscreenLock?.current || AppState.currentState === "active") return;
      setSettledForeground(false);
    });
    return () => cancelAnimationFrame(id);
  }, [foreground, fullscreenLock]);

  return focused && settledForeground;
}
