import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { KidsColors } from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useKidsMode } from "@/context/KidsModeContext";

function NativeTabLayout() {
  const { isKidsMode } = useKidsMode();

  if (isKidsMode) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: "house", selected: "house.fill" }} />
          <Label>Home</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="kids-stories">
          <Icon sf={{ default: "book", selected: "book.fill" }} />
          <Label>Stories</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="kids-learn">
          <Icon sf={{ default: "graduationcap", selected: "graduationcap.fill" }} />
          <Label>Learn</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="kids-stars">
          <Icon sf={{ default: "star", selected: "star.fill" }} />
          <Label>My Stars</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="read" options={{ href: null } as any} />
        <NativeTabs.Trigger name="plans" options={{ href: null } as any} />
        <NativeTabs.Trigger name="search" options={{ href: null } as any} />
        <NativeTabs.Trigger name="study" options={{ href: null } as any} />
        <NativeTabs.Trigger name="explore" options={{ href: null } as any} />
        <NativeTabs.Trigger name="connect" options={{ href: null } as any} />
        <NativeTabs.Trigger name="profile" options={{ href: null } as any} />
        <NativeTabs.Trigger name="family" options={{ href: null } as any} />
      </NativeTabs>
    );
  }

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="read">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Read</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="connect">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Connect</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Icon sf={{ default: "text.book.closed", selected: "text.book.closed.fill" }} />
        <Label>Study</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>You</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plans" options={{ href: null } as any} />
      <NativeTabs.Trigger name="search" options={{ href: null } as any} />
      <NativeTabs.Trigger name="study" options={{ href: null } as any} />
      <NativeTabs.Trigger name="family" options={{ href: null } as any} />
      <NativeTabs.Trigger name="kids-stories" options={{ href: null } as any} />
      <NativeTabs.Trigger name="kids-learn" options={{ href: null } as any} />
      <NativeTabs.Trigger name="kids-stars" options={{ href: null } as any} />
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { isKidsMode } = useKidsMode();
  const { theme, isDark } = useTheme(isKidsMode);
  const { t } = useTranslation();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const kidsTheme = isDark ? KidsColors.dark : KidsColors.light;

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
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: t("tabs.connect"),
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t("tabs.study"),
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.you"),
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
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
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
