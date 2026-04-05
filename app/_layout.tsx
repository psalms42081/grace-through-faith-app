import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient, asyncStoragePersister } from "@/lib/query-client";
import { KidsModeProvider } from "@/context/KidsModeContext";
import { TranslationProvider } from "@/context/TranslationContext";
import { ProProvider } from "@/contexts/ProContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { useTheme } from "@/hooks/useTheme";
import { initI18n } from "@/lib/i18n";
import { ContentLanguageProvider } from "@/contexts/ContentLanguageContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { StudyDepthProvider } from "@/contexts/StudyDepthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { PioneerProvider } from "@/contexts/PioneerContext";
import EllenWhiteHologram from "@/components/EllenWhiteHologram";
import MiniPlayer from "@/components/MiniPlayer";
import { initAnalytics, reportError } from "@/lib/analytics";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Android Expo Go (SDK 53+) removed push notification support entirely.
// Calling setNotificationHandler there throws — guard against it.
function _isAndroidExpoGo() {
  if (Platform.OS !== "android") return false;
  try {
    const env = (Constants as any).executionEnvironment;
    if (env) return env === "storeClient";
    return (Constants as any).appOwnership === "expo";
  } catch {
    return false;
  }
}

if (!_isAndroidExpoGo()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
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

if (typeof globalThis !== "undefined" && !globalThis.__rejectionHandlerSet) {
  globalThis.__rejectionHandlerSet = true;
  const handler = (event: any) => {
    const reason = event?.reason || event;
    const msg = reason instanceof Error ? reason.message : String(reason);
    const EXTENSION_PATTERNS = [
      "MetaMask",
      "ethereum",
      "chrome-extension://",
      "moz-extension://",
    ];
    if (EXTENSION_PATTERNS.some((p) => msg.includes(p))) {
      event?.preventDefault?.();
      return;
    }
    reportError(`Unhandled rejection: ${msg}`);
  };
  if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("unhandledrejection", handler);
  }

  const errorHandler = (event: any) => {
    const msg = event?.message || "";
    const stack = event?.error?.stack || "";
    const combined = msg + stack;
    const EXT_PATTERNS = ["MetaMask", "ethereum", "chrome-extension://", "moz-extension://"];
    if (EXT_PATTERNS.some((p) => combined.includes(p))) {
      event?.preventDefault?.();
      return;
    }
  };
  if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("error", errorHandler);
  }
}

function RootLayoutNav() {
  const { theme, isDark } = useTheme();

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
      <Stack.Screen name="book-picker" options={{ headerShown: false }} />
      <Stack.Screen name="deep-study-picker" options={{ headerShown: false }} />
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
      <Stack.Screen name="passage-context" options={{ headerShown: true, title: "Passage Context" }} />
      <Stack.Screen name="word-study" options={{ headerShown: false }} />
      <Stack.Screen name="historic-voices" options={{ headerShown: true, title: "Historic Voices" }} />
      <Stack.Screen name="verse-map" options={{ headerShown: false }} />
      <Stack.Screen name="study-guide" options={{ headerShown: false }} />
      <Stack.Screen name="devotionals" options={{ headerShown: true, title: "Devotional Plans" }} />
      <Stack.Screen name="devotional-day" options={{ headerShown: true, title: "Today's Reading" }} />
      <Stack.Screen name="prayer-journal" options={{ headerShown: true, title: "Prayer Journal" }} />
      <Stack.Screen name="topic/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="(auth)"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen name="groups" options={{ headerShown: true, title: "Live Fellowship" }} />
      <Stack.Screen name="group/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="church-connect" options={{ headerShown: false }} />
      <Stack.Screen name="church/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="how-it-works" options={{ headerShown: false }} />
      <Stack.Screen name="parent-controls" options={{ headerShown: false }} />
      <Stack.Screen name="study-path/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="study-paths" options={{ headerShown: false }} />
      <Stack.Screen name="lesson/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="stream/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="sabbath-experience" options={{ headerShown: false }} />
      <Stack.Screen name="great-controversy" options={{ headerShown: false }} />
      <Stack.Screen name="sabbath-school" options={{ headerShown: false }} />
      <Stack.Screen name="sabbath-school-day" options={{ headerShown: false }} />
      <Stack.Screen name="sabbath-school-discussion" options={{ headerShown: false }} />
      <Stack.Screen name="prophecy-explorer" options={{ headerShown: false }} />
      <Stack.Screen name="prophecy-hub" options={{ headerShown: false }} />
      <Stack.Screen name="growth-map" options={{ headerShown: false }} />
      <Stack.Screen name="resources" options={{ headerShown: false }} />
      <Stack.Screen name="resource-detail" options={{ headerShown: false }} />
      <Stack.Screen name="feedback" options={{ headerShown: false }} />
      <Stack.Screen name="sermon-player" options={{ headerShown: false }} />
      <Stack.Screen name="evangelism-videos" options={{ headerShown: false }} />
      <Stack.Screen name="study-category" options={{ headerShown: false }} />
      <Stack.Screen name="kids" options={{ headerShown: false }} />
      <Stack.Screen name="touchpoints" options={{ headerShown: false }} />
      <Stack.Screen name="touchpoint-topic" options={{ headerShown: false }} />
      <Stack.Screen name="touchpoint-study" options={{ headerShown: false }} />
      <Stack.Screen name="connect-media" options={{ headerShown: false }} />
      <Stack.Screen name="biblical-sabbaths" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="conference-portal" options={{ headerShown: false }} />
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
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true)).catch(() => setI18nReady(true));
    initAnalytics();
  }, []);

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
    if (fontsLoaded && onboardingChecked && i18nReady) {
      SplashScreen.hideAsync().catch(() => {});
      // Always show the splash/intro on every launch
      setTimeout(() => router.replace("/onboarding"), 50);
    }
  }, [fontsLoaded, onboardingChecked, needsOnboarding, i18nReady]);

  if (!fontsLoaded || !onboardingChecked || !i18nReady) return null;

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24 * 30 }}
      >
        <AuthProvider>
          <TranslationProvider>
            <ContentLanguageProvider>
              <KidsModeProvider>
                <ProProvider>
                  <StudyDepthProvider>
                    <TutorialProvider>
                      <AudioProvider>
                        <GestureHandlerRootView style={{ flex: 1 }}>
                          <KeyboardProvider>
                            <ToastProvider>
                              <PioneerProvider>
                                <RootLayoutNav />
                                <MiniPlayer />
                                <EllenWhiteHologram />
                              </PioneerProvider>
                            </ToastProvider>
                          </KeyboardProvider>
                        </GestureHandlerRootView>
                      </AudioProvider>
                    </TutorialProvider>
                  </StudyDepthProvider>
                </ProProvider>
              </KidsModeProvider>
            </ContentLanguageProvider>
          </TranslationProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
