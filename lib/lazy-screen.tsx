import React, { Suspense, lazy, type ComponentType } from "react";
import { ActivityIndicator, View } from "react-native";
import { SWEEP_LIGHT } from "@/constants/light-sweep";

/**
 * Load a screen on navigation so it stays out of the first web download.
 * The fallback uses the app's cream surface so a loading chapter never flashes a grey screen.
 */
export function lazyScreen(
  load: () => Promise<{ default: ComponentType }>,
) {
  const Screen = lazy(load);
  function LazyRouteScreen() {
    return (
      <Suspense
        fallback={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: SWEEP_LIGHT.background }}>
            <ActivityIndicator color={SWEEP_LIGHT.text} />
          </View>
        }
      >
        <Screen />
      </Suspense>
    );
  }
  return LazyRouteScreen;
}
