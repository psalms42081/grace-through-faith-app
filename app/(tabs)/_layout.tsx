import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import Colors from "@/constants/colors";
import { KidsColors } from "@/constants/colors";
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
        <NativeTabs.Trigger name="read" options={{ href: null }} />
        <NativeTabs.Trigger name="plans" options={{ href: null }} />
        <NativeTabs.Trigger name="search" options={{ href: null }} />
        <NativeTabs.Trigger name="study" options={{ href: null }} />
        <NativeTabs.Trigger name="explore" options={{ href: null }} />
        <NativeTabs.Trigger name="profile" options={{ href: null }} />
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
      <NativeTabs.Trigger name="plans">
        <Icon sf={{ default: "list.bullet.rectangle", selected: "list.bullet.rectangle.fill" }} />
        <Label>Plans</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Icon sf={{ default: "safari", selected: "safari.fill" }} />
        <Label>Discover</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>You</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" options={{ href: null }} />
      <NativeTabs.Trigger name="study" options={{ href: null }} />
      <NativeTabs.Trigger name="kids-stories" options={{ href: null }} />
      <NativeTabs.Trigger name="kids-learn" options={{ href: null }} />
      <NativeTabs.Trigger name="kids-stars" options={{ href: null }} />
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isKidsMode } = useKidsMode();
  const theme = isKidsMode
    ? (isDark ? KidsColors.dark : KidsColors.light)
    : (isDark ? Colors.dark : Colors.light);
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

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
            ? theme.surface
            : theme.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: theme.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
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
                { backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="read"
        options={{
          title: "Read",
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Plans",
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Discover",
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "You",
          href: isKidsMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
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
