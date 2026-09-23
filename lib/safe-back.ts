import type { ImperativeRouter } from "expo-router";

export function safeGoBack(router: ImperativeRouter, fallbackTab?: string) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackTab || "/(tabs)/explore" as any);
  }
}
