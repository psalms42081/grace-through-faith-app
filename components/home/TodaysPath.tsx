import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { parseScriptureReference } from "@/lib/scripture-reference";

const HOME_IMAGES = {
  read: require("@/assets/home-cards/read.png"),
  study: require("@/assets/home-cards/study.png"),
};

interface PathItem {
  image: any;
  label: string;
  subtitle: string;
  completed: boolean;
  onPress: () => void;
}

interface TodaysPathProps {
  theme: any;
  isDark: boolean;
  hasRecentRead: boolean;
  dailyVerseRef?: string;
}

export default function TodaysPath({
  theme,
  isDark,
  hasRecentRead,
  dailyVerseRef,
}: TodaysPathProps) {
  const parsed = dailyVerseRef
    ? parseScriptureReference(dailyVerseRef)
    : null;

  const items: PathItem[] = [
    {
      image: HOME_IMAGES.read,
      label: "Today's Reading",
      subtitle: "Open Scripture in quiet devotion",
      completed: hasRecentRead,
      onPress: () => {
        if (parsed) {
          router.push(`/read/${parsed.bookId}/${parsed.chapter}`);
        } else {
          router.push("/(tabs)/read");
        }
      },
    },
    {
      image: HOME_IMAGES.study,
      label: "Study",
      subtitle: "Reflect on today's passage",
      completed: false,
      onPress: () => router.push("/(tabs)/explore"),
    },
  ];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Ionicons name="sunny-outline" size={18} color={theme.accent} />
        <Text style={[s.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Your Daily Rhythm
        </Text>
      </View>
      {items.map((item, i) => (
        <Pressable
          key={item.label}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          style={({ pressed }) => [
            s.card,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Image source={item.image} style={s.cardImage} resizeMode="cover" />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.38)", "rgba(0,0,0,0.68)"]}
            locations={[0, 0.5, 1]}
            style={s.cardOverlay}
          >
            <View style={s.cardContent}>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardLabel, { fontFamily: "Inter_600SemiBold" }]}>
                  {item.label}
                </Text>
                <Text style={[s.cardSubtitle, { fontFamily: "Inter_400Regular" }]}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" />
            </View>
          </LinearGradient>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    height: 100,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 8,
  },
  cardLabel: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 2,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(78,204,163,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
});
