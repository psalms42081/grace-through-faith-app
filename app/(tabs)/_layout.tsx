import { Tabs, router, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { House, BookOpen, CalendarDays, Compass, User } from "lucide-react-native";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PathB } from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { nativeTabBarHeight } from "@/lib/reader-floating-chrome";
import { isSabbathSchoolTabPath } from "@/lib/sabbath-school-route-containment";

function ClassicTabLayout() {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isSabbathSchoolRoute = isSabbathSchoolTabPath(pathname);
  const homeTabColor = isSabbathSchoolRoute ? PathB.coral : undefined;

  useEffect(() => {
    if (pathname === "/") {
      router.replace("/home-v2" as any);
    }
  }, [pathname]);
  return (
    <Tabs
      backBehavior="firstRoute"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PathB.coralInk,
        tabBarInactiveTintColor: "#3F3A34",
        tabBarItemStyle: { minHeight: 44 },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS
            ? "transparent"
            : isWeb
            ? theme.surface
            : theme.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: theme.border,
          elevation: 0,
          ...(isWeb
            ? { height: 84 }
            : { height: nativeTabBarHeight(insets.bottom), paddingBottom: insets.bottom }),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: theme.surface,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          marginBottom: 2,
        },
        sceneStyle: isWeb ? styles.webScene : undefined,
      }}
    >
      {/* Path B Phase 1: Home tab points at home-v2 for adults.
          Rollback: swap the two href lines below (index.tsx is untouched). */}
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          href: null,
          tabBarIcon: ({ color, size }) => (
            <House size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="home-v2"
        options={{
          title: t("tabs.home"),
          href: undefined,
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
          href: undefined,
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
        name="sabbath-school-video"
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
          href: undefined,
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
          href: undefined,
          tabBarIcon: ({ color, size }) => (
            <Compass size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          href: undefined,
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
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
