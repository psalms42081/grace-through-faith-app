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
 * Android hardware back for the focused screen only.
 * A pushed screen pops. At that screen's stack root, `onAtRoot` runs
 * (Books for the reader, Home for the Bible tab root).
 * Unfocused screens return false so a later screen, or the root handler, can pop.
 */
export function useHardwareBackToHomeWhenAtStackRoot(
  enabled: boolean,
  canPopStack: boolean,
  onAtRoot?: () => void,
): void {
  const navigation = useNavigation();
  useEffect(() => {
    if (!enabled || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!navigation.isFocused()) return false;
      if (canPopStack) {
        router.back();
        return true;
      }
      if (onAtRoot) onAtRoot();
      else goHomeTab(router);
      return true;
    });
    return () => sub.remove();
  }, [enabled, canPopStack, navigation, onAtRoot]);
}
