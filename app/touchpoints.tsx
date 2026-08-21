import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { safeGoBack } from "@/lib/safe-back";

const GOLD = "#C9933A";

const TOPIC_TILE_MAP: Record<string, { color: string; icon: string }> = {
  "abandonment":       { color: "#0D7377", icon: "heart" },
  "addiction":         { color: "#A83240", icon: "heart" },
  "anger":             { color: "#BF5B21", icon: "heart" },
  "anxiety":           { color: "#4A6FA5", icon: "heart" },
  "forgiveness":       { color: "#2D6A4F", icon: "people" },
  "grief":             { color: "#6B2737", icon: "heart" },
  "loneliness":        { color: "#5B3A8C", icon: "heart" },
  "purpose":           { color: "#B8860B", icon: "book" },
  "fear":              { color: "#3B6B8C", icon: "heart" },
  "marriage":          { color: "#6B7B3A", icon: "people" },
  "patience":          { color: "#1A8A7D", icon: "trending-up" },
  "temptation":        { color: "#943545", icon: "trending-up" },
  "suffering":         { color: "#3E5C8A", icon: "globe" },
  "gratitude":         { color: "#C4922A", icon: "flame" },
  "prayer":            { color: "#6A3D9A", icon: "flame" },
  "identity":          { color: "#357A5B", icon: "book" },
  "contentment":       { color: "#C06830", icon: "trending-up" },
  "integrity":         { color: "#466B8A", icon: "trending-up" },
  "doubt":             { color: "#7A2E40", icon: "book" },
  "generosity":        { color: "#5C6E2E", icon: "flame" },
  "depression":        { color: "#0E6B6E", icon: "heart" },
  "trust":             { color: "#A0353F", icon: "book" },
  "humility":          { color: "#5E3580", icon: "trending-up" },
  "parenting":         { color: "#2B7A4B", icon: "people" },
  "hope":              { color: "#D4A028", icon: "book" },
  "sabbath":           { color: "#4B6B9A", icon: "flame" },
  "justice":           { color: "#B85C25", icon: "scale" },
  "work":              { color: "#3A6080", icon: "globe" },
  "sanctuary":         { color: "#6E2838", icon: "shield-checkmark" },
  "second-coming":     { color: "#6B3FA0", icon: "shield-checkmark" },
  "three-angels":      { color: "#8C2F3E", icon: "shield-checkmark" },
  "health-message":    { color: "#2E7D5A", icon: "shield-checkmark" },
  "state-of-dead":     { color: "#3D5A80", icon: "shield-checkmark" },
  "great-controversy": { color: "#0C7A72", icon: "shield-checkmark" },
  "stewardship":       { color: "#B89025", icon: "flame" },
  "serving-others":    { color: "#607530", icon: "trending-up" },
  "fasting":           { color: "#A8552A", icon: "flame" },
  "baptism":           { color: "#5A3290", icon: "shield-checkmark" },
  "discipleship":      { color: "#306B52", icon: "book" },
  "gods-love":         { color: "#8B4A6B", icon: "sunny" },
  "gods-grace":        { color: "#C89A20", icon: "sunny" },
  "the-trinity":       { color: "#0F7D80", icon: "sunny" },
};

const FALLBACK_TILE = { color: "#4A6FA5", icon: "help-circle" };

interface TopicSummary {
  id: string;
  title: string;
  category: string;
  questionCount: number;
}

export default function TouchPointsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{
    categories: string[];
    topics: TopicSummary[];
  }>({
    queryKey: ["/api/touchpoints"],
  });

  const categories = data?.categories ?? [];
  const allTopics = data?.topics ?? [];

  const filteredTopics = useMemo(() => {
    let topics = allTopics;
    if (activeCategory) {
      topics = topics.filter(t => t.category === activeCategory);
    }
    if (search.trim()) {
      const lower = search.toLowerCase();
      topics = topics.filter(
        t =>
          t.title.toLowerCase().includes(lower) ||
          t.category.toLowerCase().includes(lower)
      );
    }
    return topics;
  }, [allTopics, activeCategory, search]);

  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: theme.background }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => safeGoBack(router, "/(tabs)/explore")} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Signposts
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={[styles.searchRow, { backgroundColor: inputBg, borderColor }]}>
          <Ionicons name="search" size={18} color={isDark ? "#777" : "#999"} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search topics and questions"
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={isDark ? "#555" : "#aaa"} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            <Pressable
              onPress={() => setActiveCategory(null)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: !activeCategory ? GOLD : cardBg,
                  borderColor: !activeCategory ? GOLD : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  {
                    color: !activeCategory ? "#fff" : theme.textSecondary,
                    fontFamily: !activeCategory ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                All
              </Text>
            </Pressable>
            {categories.map(cat => (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(activeCategory === cat ? null : cat)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: activeCategory === cat ? GOLD : cardBg,
                    borderColor: activeCategory === cat ? GOLD : borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: activeCategory === cat ? "#fff" : theme.textSecondary,
                      fontFamily: activeCategory === cat ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.tileGrid}>
            {filteredTopics.map(topic => {
              const tile = TOPIC_TILE_MAP[topic.id] || FALLBACK_TILE;
              return (
                <Pressable
                  key={topic.id}
                  onPress={() => router.push(`/touchpoint-topic?topicId=${topic.id}` as any)}
                  style={({ pressed }) => [
                    styles.tile,
                    {
                      backgroundColor: tile.color,
                      opacity: pressed ? 0.85 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <Text style={styles.tileTitle} numberOfLines={2} lineBreakMode="tail">
                    {topic.title}
                  </Text>
                  <Ionicons
                    name={tile.icon as any}
                    size={48}
                    color="rgba(255,255,255,0.5)"
                    style={styles.tileIcon}
                  />
                </Pressable>
              );
            })}
          </View>

          {filteredTopics.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={isDark ? "#444" : "#ccc"} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No topics found for "{search || activeCategory}"
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: { width: 36, alignItems: "flex-start" },
  headerTitle: { fontSize: 22, letterSpacing: -0.3 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
  },
  tileGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    paddingHorizontal: 20,
    gap: 8,
  },
  tile: {
    width: "48.5%" as any,
    height: 160,
    borderRadius: 16,
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  tileTitle: {
    position: "absolute" as const,
    bottom: 12,
    left: 10,
    right: 60,
    color: "#fff",
    fontSize: 14,
    fontFamily: "Lora_700Bold",
    lineHeight: 19,
  },
  tileIcon: {
    position: "absolute" as const,
    bottom: 8,
    right: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
