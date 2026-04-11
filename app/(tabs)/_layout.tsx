import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KidsColors } from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useKidsMode } from "@/context/KidsModeContext";
import { useEllenWhite } from "@/contexts/PioneerContext";

function ClassicTabLayout() {
  const { isKidsMode } = useKidsMode();
  const { theme, isDark } = useTheme(isKidsMode);
  const { isVisible, currentSteps, currentStepIndex } = useEllenWhite();
  const { t } = useTranslation();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const kidsTheme = isDark ? KidsColors.dark : KidsColors.light;
  const spotlightTarget =
    isVisible && currentSteps.length > 0
      ? currentSteps[currentStepIndex]?.spotlightTarget
      : null;
  const GOLD = "#C9933A";

  const isSpotlightTab = (tabName: "read" | "connect" | "study" | "profile") => {
    if (!spotlightTarget) return false;
    switch (tabName) {
      case "read":
        return spotlightTarget === "tab-read" || spotlightTarget === "read-tab";
      case "connect":
        return spotlightTarget === "tab-connect" || spotlightTarget === "connect-tab";
      case "study":
        return spotlightTarget === "tab-study" || spotlightTarget === "study-tab";
      case "profile":
        return spotlightTarget === "tab-profile" || spotlightTarget === "you-tab";
      default:
        return false;
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS
            ? "transparent"
            : isWeb
            ? (isKidsMode ? kidsTheme.tabBarBg : theme.surface)
            : (isKidsMode ? kidsTheme.tabBarBg : theme.background),
          borderTopWidth: isWeb ? 1 : (isKidsMode ? 1 : 0),
          borderTopColor: isKidsMode ? kidsTheme.tabBarBorder : theme.border,
          elevation: 0,
          ...(isWeb ? { height: isKidsMode ? 90 : 84 } : {}),
          ...(isKidsMode ? {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: "hidden" as const,
          } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={[
                StyleSheet.absoluteFill,
                isKidsMode ? { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" } : {},
              ]}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isKidsMode ? kidsTheme.tabBarBg : theme.surface,
                  borderTopWidth: 1,
                  borderTopColor: isKidsMode ? kidsTheme.tabBarBorder : theme.border,
                  ...(isKidsMode ? { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" } : {}),
                },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: isKidsMode ? "Inter_600SemiBold" : "Inter_500Medium",
          fontSize: isKidsMode ? 11 : 10,
          marginBottom: 2,
        },
        tabBarIconStyle: isKidsMode ? { marginTop: 4 } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="read"
        options={{
          title: t("tabs.read"),
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={isSpotlightTab("read") ? GOLD : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: t("tabs.connect"),
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={isSpotlightTab("connect") ? GOLD : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t("tabs.study"),
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={isSpotlightTab("study") ? GOLD : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.you"),
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={isSpotlightTab("profile") ? GOLD : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Plans",
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: "Family",
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: "Study",
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kids-stories"
        options={{
          title: "Stories",
          href: isKidsMode ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kids-learn"
        options={{
          title: "Learn",
          href: isKidsMode ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kids-stars"
        options={{
          title: "My Stars",
          href: isKidsMode ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isReady, onboardingComplete, showOnboarding, syncOnboardingFromServer } = useEllenWhite();
  const [serverChecked, setServerChecked] = useState(false);

  useEffect(() => {
    // Only run once per session: skip if not ready, already complete, or already checked
    if (!isReady || onboardingComplete || serverChecked) return;
    let cancelled = false;

    syncOnboardingFromServer().then((seen) => {
      if (cancelled) return;
      setServerChecked(true);
      if (!seen) {
        setTimeout(() => showOnboarding(), 600);
      }
    });

    return () => { cancelled = true; };
  }, [isReady, onboardingComplete, serverChecked]);

  return <ClassicTabLayout />;
}
