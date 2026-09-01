import { Tabs, router, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { House, BookOpen, CalendarDays, Compass, User } from "lucide-react-native";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { KidsColors, PathB } from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useKidsMode } from "@/context/KidsModeContext";
import { isSabbathSchoolTabPath } from "@/lib/sabbath-school-route-containment";

function ClassicTabLayout() {
  const { isKidsMode } = useKidsMode();
  const { theme, isDark } = useTheme(isKidsMode);
  const { t } = useTranslation();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const kidsTheme = isDark ? KidsColors.dark : KidsColors.light;
  const pathname = usePathname();
  const isSabbathSchoolRoute = isSabbathSchoolTabPath(pathname);
  const homeTabColor =
    !isKidsMode && isSabbathSchoolRoute ? PathB.coral : undefined;

  // Path B Phase 1: keep the visible Home in sync with kids mode.
  // Adults use home-v2; kids keep the legacy index Home. href:null only hides
  // a tab, so redirect explicitly when the mode flips while Home is selected.
  useEffect(() => {
    if (isKidsMode && pathname === "/home-v2") {
      router.replace("/" as any);
    } else if (!isKidsMode && pathname === "/") {
      router.replace("/home-v2" as any);
    }
  }, [isKidsMode, pathname]);
  return (
    <Tabs
      backBehavior="firstRoute"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isKidsMode ? theme.accent : PathB.coral,
        tabBarInactiveTintColor: isKidsMode ? theme.tabIconDefault : PathB.inkMuted,
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
        sceneStyle: isWeb ? styles.webScene : undefined,
      }}
    >
      {/* Path B Phase 1: Home tab points at home-v2 for adults.
          Rollback: swap the two href lines below (index.tsx is untouched). */}
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          // Kids mode keeps the legacy Home (kids UI lives in index.tsx)
          href: isKidsMode ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <House size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="home-v2"
        options={{
          title: t("tabs.home"),
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <House size={size} color={homeTabColor ?? color} />
          ),
          tabBarLabel: ({ color }) => (
            <Text
              style={{
                color: homeTabColor ?? color,
                fontFamily: "Inter_500Medium",
                fontSize: 10,
                marginBottom: 2,
              }}
            >
              {t("tabs.home")}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="read"
        options={{
          title: t("tabs.bible"),
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ss"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="sabbath-school-day"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="sabbath-school-quarter"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: t("tabs.connect"),
          // Removed from nav in Path B Phase 0 — screen stays in the codebase and routable
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t("tabs.study"),
          // Removed from nav in Path B Phase 0 — study surfaces stay routable via existing links
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="devotions"
        options={{
          title: t("tabs.devotions"),
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <CalendarDays size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("tabs.discover"),
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Compass size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
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
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  webScene: {
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
  },
});
