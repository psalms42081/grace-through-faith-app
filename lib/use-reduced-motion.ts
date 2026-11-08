import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

/**
 * Reduced motion from React Native's accessibility setting or the web
 * `prefers-reduced-motion` query. Either one is enough to skip animation.
 */
export function usePrefersReducedMotion(): { reduced: boolean; ready: boolean } {
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const a11y = useRef(false);
  const media = useRef(false);

  useEffect(() => {
    let alive = true;
    const publish = () => {
      if (!alive) return;
      setReduced(a11y.current || media.current);
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        a11y.current = value;
        publish();
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true);
      });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      a11y.current = value;
      publish();
    });

    let query: MediaQueryList | null = null;
    const onMedia = () => {
      media.current = !!query?.matches;
      publish();
    };
    if (Platform.OS === "web" && typeof matchMedia === "function") {
      query = matchMedia("(prefers-reduced-motion: reduce)");
      media.current = query.matches;
      publish();
      query.addEventListener?.("change", onMedia);
    }

    return () => {
      alive = false;
      subscription.remove();
      query?.removeEventListener?.("change", onMedia);
    };
  }, []);

  return { reduced, ready };
}
