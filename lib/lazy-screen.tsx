import React, { Suspense, lazy, type ComponentType } from "react";
import { ActivityIndicator, View } from "react-native";

/** Load a screen on navigation so it stays out of the first web download. */
export function lazyScreen(
  load: () => Promise<{ default: ComponentType }>,
) {
  const Screen = lazy(load);
  function LazyRouteScreen() {
    return (
      <Suspense
        fallback={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        }
      >
        <Screen />
      </Suspense>
    );
  }
  return LazyRouteScreen;
}
