import type { Router } from "expo-router";

export function safeGoBack(router: Router) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/(tabs)");
  }
}
