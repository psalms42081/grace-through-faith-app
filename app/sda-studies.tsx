import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  Animated,
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenHeader from "@/components/ScreenHeader";
import { useTheme } from "@/hooks/useTheme";
import { BELIEFS, CATEGORIES, CATEGORY_COLORS } from "@/data/beliefs";

const VIEWED_KEY = "beliefs_viewed";

import { navigateToScripture } from "@/lib/scripture-nav";

function AnimatedChevron({ isExpanded, color }: { isExpanded: boolean; color: string }) {
  const rotation = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: isExpanded ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name="chevron-down" size={16} color={color} />
    </Animated.View>
  );
}

export default function SDAStudiesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedBelief, setExpandedBelief] = useState<number | null>(null);
  const [viewedBeliefs, setViewedBeliefs] = useState<Set<number>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(VIEWED_KEY).then((val) => {
      if (val) {
        try {
          const arr = JSON.parse(val) as number[];
          setViewedBeliefs(new Set(arr));
        } catch {}
      }
    });
  }, []);

  const markViewed = useCallback((num: number) => {
    setViewedBeliefs((prev) => {
      if (prev.has(num)) return prev;
      const next = new Set(prev);
      next.add(num);
      AsyncStorage.setItem(VIEWED_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const handleToggle = useCallback((num: number) => {
    setExpandedBelief((prev) => {
      const next = prev === num ? null : num;
      if (next !== null) markViewed(next);
      return next;
    });
  }, [markViewed]);

  const handleScriptureTap = useCallback((s: { bookId: number; chapter: number; ref: string }) => {
    navigateToScripture(s);
  }, []);

  const filtered = activeCategory === "all"
    ? BELIEFS
    : BELIEFS.filter((b) => b.category === activeCategory);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="Fundamental Beliefs"
        subtitle="28 Core Doctrines"
        backIcon="chevron-back"
        testID="sda-back"
      />

      <Pressable
        onPress={() => router.push("/study-paths" as any)}
        style={({ pressed }) => [
          styles.deepDiveBanner,
          { backgroundColor: theme.backgroundCard, borderColor: theme.accent + "25", opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={[styles.deepDiveIcon, { backgroundColor: theme.accent + "14" }]}>
          <Ionicons name="school" size={18} color={theme.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.deepDiveTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            28 Beliefs Deep Dive
          </Text>
          <Text style={[styles.deepDiveSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            A guided doctrinal learning path
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.accent} />
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => setActiveCategory(cat.id)}
            style={[
              styles.categoryChip,
              {
                backgroundColor: activeCategory === cat.id
                  ? theme.accent
                  : theme.backgroundCard,
              },
            ]}
          >
            <Text
              style={[
                styles.categoryChipText,
                {
                  color: activeCategory === cat.id ? "#fff" : theme.textSecondary,
                  fontFamily: activeCategory === cat.id ? "Inter_600SemiBold" : "Inter_500Medium",
                },
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 30 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((belief) => {
          const isExpanded = expandedBelief === belief.number;
          const catColor = CATEGORY_COLORS[belief.category] || theme.accent;
          const isViewed = viewedBeliefs.has(belief.number);
          return (
            <Pressable
              key={belief.number}
              onPress={() => handleToggle(belief.number)}
              style={[styles.beliefCard, { backgroundColor: theme.backgroundCard }]}
              testID={`belief-${belief.number}`}
            >
              <View style={styles.beliefHeader}>
                <View style={[styles.beliefNumber, { backgroundColor: catColor + "20" }]}>
                  {isViewed && (
                    <View style={styles.viewedCheck}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                  <Text style={[styles.beliefNumberText, { color: catColor, fontFamily: "Inter_700Bold" }]}>
                    {belief.number}
                  </Text>
                </View>
                <View style={styles.beliefTitleArea}>
                  <Text style={[styles.beliefTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                    {belief.title}
                  </Text>
                  <View style={[styles.beliefCatBadge, { backgroundColor: catColor + "15" }]}>
                    <Text style={[styles.beliefCatText, { color: catColor, fontFamily: "Inter_600SemiBold" }]}>
                      {CATEGORIES.find((c) => c.id === belief.category)?.label}
                    </Text>
                  </View>
                </View>
                <AnimatedChevron isExpanded={isExpanded} color={theme.textSecondary} />
              </View>

              <Text
                style={[styles.beliefSummary, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
                numberOfLines={isExpanded ? undefined : 2}
              >
                {belief.summary}
              </Text>

              {isExpanded && (
                <>
                  <View style={styles.scripturesSection}>
                    <Text style={[styles.sectionLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      Key Scriptures
                    </Text>
                    {belief.scriptures.map((s, i) => (
                      <Pressable
                        key={i}
                        onPress={() => handleScriptureTap(s)}
                        style={[styles.scriptureRow, { backgroundColor: theme.accent + "08" }]}
                      >
                        <Ionicons name="book-outline" size={14} color={theme.accent} />
                        <Text style={[styles.scriptureRef, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                          {s.ref}
                        </Text>
                        <Ionicons name="chevron-forward" size={12} color={theme.accent + "90"} />
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    onPress={() => Linking.openURL(belief.egwLink)}
                    style={[styles.egwButton, { backgroundColor: theme.accent + "0D" }]}
                    testID="egw-link"
                  >
                    <Ionicons name="library-outline" size={16} color={theme.accent + "D9"} />
                    <Text style={[styles.egwButtonText, { color: theme.accent + "D9", fontFamily: "Inter_500Medium" }]}>
                      Read in Ellen G. White Writings
                    </Text>
                    <Ionicons name="open-outline" size={14} color={theme.accent + "99"} />
                  </Pressable>
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  categoryRow: { flexGrow: 0, marginBottom: 12 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  categoryChipText: { fontSize: 13 },
  content: { flex: 1 },
  beliefCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  beliefHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  beliefNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  beliefNumberText: { fontSize: 14 },
  viewedCheck: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
  },
  beliefTitleArea: { flex: 1, gap: 4 },
  beliefTitle: { fontSize: 16 },
  beliefCatBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  beliefCatText: { fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  beliefSummary: { fontSize: 14, lineHeight: 21 },
  scripturesSection: { marginTop: 14, gap: 6 },
  sectionLabel: { fontSize: 15, letterSpacing: 0.3, marginBottom: 4 },
  scriptureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  scriptureRef: { flex: 1, fontSize: 14 },
  egwButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  egwButtonText: { flex: 1, fontSize: 13 },
  deepDiveBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  deepDiveIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  deepDiveTitle: { fontSize: 14 },
  deepDiveSub: { fontSize: 12, marginTop: 1 },
});
