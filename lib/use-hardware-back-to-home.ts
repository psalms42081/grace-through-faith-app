import { useEffect } from "react";
import { BackHandler, Platform } from "react-native";
import { router, useNavigation } from "expo-router";
import { goHomeTab, stackCanGoBackFromState } from "@/lib/bible-tab-navigation";

/** Nested-stack pop check via expo-router's useNavigation — not @react-navigation/native. */
export function useCanPopNestedStack(): boolean {
  const navigation = useNavigation();
  return stackCanGoBackFromState(navigation.getState());
}

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
