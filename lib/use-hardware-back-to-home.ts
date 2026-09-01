import { useEffect } from "react";
import { BackHandler, Platform } from "react-native";
import { router } from "expo-router";
import { goHomeTab } from "@/lib/bible-tab-navigation";

/**
 * Android hardware back at a Bible-tab (or root Books) stack root goes to Home.
 * When the nested stack can pop, return false so React Navigation pops normally.
 */
export function useHardwareBackToHomeWhenAtStackRoot(enabled: boolean, canPopStack: boolean): void {
  useEffect(() => {
    if (!enabled || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canPopStack) return false;
      goHomeTab(router);
      return true;
    });
    return () => sub.remove();
  }, [enabled, canPopStack]);
}
