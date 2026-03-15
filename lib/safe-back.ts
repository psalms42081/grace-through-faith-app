import type { Router } from "expo-router";

export function safeGoBack(router: Router, fallbackTab?: string) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackTab || "/(tabs)/explore" as any);
  }
}
