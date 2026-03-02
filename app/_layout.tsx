import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient, asyncStoragePersister } from "@/lib/query-client";
import { KidsModeProvider } from "@/context/KidsModeContext";
import { TranslationProvider } from "@/context/TranslationContext";
import { ProProvider } from "@/contexts/ProContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import {
  useFonts,
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_700Bold,
  Lora_400Regular_Italic,
} from "@expo-google-fonts/lora";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

const ONBOARDING_KEY = "@grace-through-faith/onboarded";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { fontFamily: "Lora_600SemiBold", fontSize: 17 },
      }}
    >
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="read/[bookId]/index" options={{ headerShown: true }} />
      <Stack.Screen name="read/[bookId]/[chapter]" options={{ headerShown: true }} />
      <Stack.Screen
        name="verse-actions"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.55, 0.8],
          sheetGrabberVisible: true,
          headerShown: true,
        }}
      />
      <Stack.Screen name="passage-context" options={{ headerShown: true }} />
      <Stack.Screen name="word-study" options={{ headerShown: false }} />
      <Stack.Screen name="devotionals" options={{ headerShown: true, title: "Devotional Plans" }} />
      <Stack.Screen name="devotional-day" options={{ headerShown: true, title: "Today's Reading" }} />
      <Stack.Screen name="kids-story/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="prayer-journal" options={{ headerShown: true, title: "Prayer Journal" }} />
      <Stack.Screen name="topic/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="(auth)"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen name="groups" options={{ headerShown: true, title: "Prayer Groups" }} />
      <Stack.Screen name="group/[id]" options={{ headerShown: true, title: "Group" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_700Bold,
    Lora_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => {
        setNeedsOnboarding(!value);
      })
      .catch(() => {
        setNeedsOnboarding(false);
      })
      .finally(() => setOnboardingChecked(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && onboardingChecked) {
      SplashScreen.hideAsync().catch(() => {});
      if (needsOnboarding) {
        setTimeout(() => router.replace("/onboarding"), 50);
      }
    }
  }, [fontsLoaded, onboardingChecked, needsOnboarding]);

  if (!fontsLoaded || !onboardingChecked) return null;

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24 * 30 }}
      >
        <AuthProvider>
          <TranslationProvider>
            <KidsModeProvider>
              <ProProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <RootLayoutNav />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </ProProvider>
            </KidsModeProvider>
          </TranslationProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
