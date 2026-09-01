import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Platform, View } from "react-native";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PathB } from "@/constants/colors";
import { queryClient, asyncStoragePersister, QUERY_PERSIST_BUSTER } from "@/lib/query-client";
import { KidsModeProvider } from "@/context/KidsModeContext";
import { TranslationProvider } from "@/context/TranslationContext";
import { ProProvider } from "@/contexts/ProContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { useTheme } from "@/hooks/useTheme";
import i18n, { initI18n } from "@/lib/i18n";
import { ContentLanguageProvider } from "@/contexts/ContentLanguageContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { StudyDepthProvider } from "@/contexts/StudyDepthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import MiniPlayer from "@/components/MiniPlayer";
import { initAnalytics, reportError } from "@/lib/analytics";
import Constants from "expo-constants";

// Expo Go (SDK 53+) throws on a static import of expo-notifications (Android).
// Check first, then lazy-require only for real builds.
function _isExpoGo() {
  try {
    return Constants.executionEnvironment === "storeClient";
  } catch {
    return false;
  }
}

if (_isExpoGo()) {
  console.log("[push] Push notification setup skipped — Expo Go does not support remote push.");
} else {
  const Notifications = require("expo-notifications");
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

type RejectionHandlerGlobal = typeof globalThis & { __rejectionHandlerSet?: boolean };
const rejectionHandlerGlobal = globalThis as RejectionHandlerGlobal;

if (!rejectionHandlerGlobal.__rejectionHandlerSet) {
  rejectionHandlerGlobal.__rejectionHandlerSet = true;
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
      <Stack.Screen name="read/[bookId]/index" options={{ headerShown: true }} />
      <Stack.Screen name="read/[bookId]/[chapter]" options={{ headerShown: true }} />
      <Stack.Screen name="read-legacy/[bookId]/[chapter]" options={{ headerShown: false }} />
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
      <Stack.Screen name="devotionals" options={{ headerShown: false }} />
      <Stack.Screen name="devotional-day" options={{ headerShown: true, title: "Today's Reading" }} />
      <Stack.Screen name="devotions-preview" options={{ headerShown: false }} />
      <Stack.Screen name="devotional-day-preview" options={{ headerShown: false }} />
      <Stack.Screen name="odb-devotional-preview" options={{ headerShown: false }} />
      <Stack.Screen name="egw-devotional-preview" options={{ headerShown: false }} />
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
      <Stack.Screen name="bible-group/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="how-it-works" options={{ headerShown: false }} />
      <Stack.Screen name="parent-controls" options={{ headerShown: false }} />
      <Stack.Screen name="study-path/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="study-paths" options={{ headerShown: false }} />
      <Stack.Screen name="lesson/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="stream/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="sabbath-experience" options={{ headerShown: false }} />
      <Stack.Screen name="great-controversy" options={{ headerShown: false }} />
      <Stack.Screen name="sabbath-school" options={{ headerShown: false }} />
      <Stack.Screen name="sabbath-school-day-tutor" options={{ headerShown: false }} />
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
      {/* Discover v2 (Brief 05) — live; also rendered by the Discover tab ((tabs)/search) */}
      <Stack.Screen name="discover-v2" options={{ headerShown: false }} />
      {/* Deep Dive picker light conversion — live; all callers route here */}
      <Stack.Screen name="deep-study-picker-v2" options={{ headerShown: false }} />
      <Stack.Screen name="touchpoint-topic" options={{ headerShown: false }} />
      <Stack.Screen name="touchpoint-study" options={{ headerShown: false }} />
      <Stack.Screen name="touchpoint-topic-preview" options={{ headerShown: false }} />
      <Stack.Screen name="touchpoint-study-preview" options={{ headerShown: false }} />
      <Stack.Screen name="connect-media" options={{ headerShown: false }} />
      <Stack.Screen name="biblical-sabbaths" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="conference-portal" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const pathname = usePathname();
  const initialPathRef = React.useRef(pathname);
  const [fontsLoaded] = useFonts({
  ...Ionicons.font,
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
  const [needsOnboarding, setNeedsOnboarding] = useState(true);
  const [i18nReady, setI18nReady] = useState(false);
  const [startupFallbackElapsed, setStartupFallbackElapsed] = useState(false);

useEffect(() => {
  initI18n().then(() => setI18nReady(true)).catch(() => setI18nReady(true));
  initAnalytics();
}, []);

  useEffect(() => {
    const timer = setTimeout(() => setStartupFallbackElapsed(true), 4000);
    return () => clearTimeout(timer);
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

  const startupReady =
    (fontsLoaded && onboardingChecked && i18nReady) || startupFallbackElapsed;

  useEffect(() => {
    if (startupReady) {
      SplashScreen.hideAsync().catch(() => {});
      const directEntryPaths = [
        "/devotions",
        "/plans",
        "/devotionals",
        "/devotions-preview",
        "/devotional-day-preview",
        "/odb-devotional-preview",
        "/egw-devotional-preview",
        "/touchpoint-topic-preview",
        "/touchpoint-study-preview",
        "/sabbath-school",
        "/sabbath-school-quarter",
        "/sabbath-school-day",
        "/sabbath-school-day-tutor",
        "/sabbath-school-discussion",
        "/sabbath-school-video",
        "/ss/sabbath-school",
      ];
      if (
        initialPathRef.current.startsWith("/read-legacy/") ||
        directEntryPaths.some((entryPath) => initialPathRef.current.startsWith(entryPath))
      ) {
        return;
      }
      // Web-only: SPA cold-load of `/` should land on Home, not the hidden
      // index trampoline. Other web paths (including `/read`) are preserved —
      // replacing them with `/(tabs)` is what blanks `/read` on refresh.
      if (Platform.OS === "web") {
        const path = initialPathRef.current || "/";
        if (path !== "/" && path !== "") {
          return;
        }
        const webTarget = needsOnboarding ? "/onboarding" : "/home-v2";
        const webTimer = setTimeout(() => router.replace(webTarget as any), 50);
        return () => clearTimeout(webTimer);
      }
      const targetRoute = needsOnboarding ? "/onboarding" : "/(tabs)";
      const timer = setTimeout(() => router.replace(targetRoute), 50);
      return () => clearTimeout(timer);
    }
  }, [needsOnboarding, startupReady]);

  if (!startupReady) {
    if (Platform.OS === "web") {
      return <View style={{ flex: 1, backgroundColor: PathB.surface }} />;
    }
    return null;
  }

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          maxAge: 1000 * 60 * 60 * 24 * 30,
          buster: QUERY_PERSIST_BUSTER,
        }}
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
                              <RootLayoutNav />
                              <MiniPlayer />
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
