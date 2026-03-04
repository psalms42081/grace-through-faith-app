import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { BELIEFS, CATEGORIES, CATEGORY_COLORS } from "@/data/beliefs";

export default function SDAStudiesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedBelief, setExpandedBelief] = useState<number | null>(null);

  const filtered = activeCategory === "all"
    ? BELIEFS
    : BELIEFS.filter((b) => b.category === activeCategory);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="sda-back">
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Fundamental Beliefs
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            28 Core Doctrines
          </Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

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
          return (
            <Pressable
              key={belief.number}
              onPress={() => setExpandedBelief(isExpanded ? null : belief.number)}
              style={[styles.beliefCard, { backgroundColor: theme.backgroundCard }]}
              testID={`belief-${belief.number}`}
            >
              <View style={styles.beliefHeader}>
                <View style={[styles.beliefNumber, { backgroundColor: catColor + "20" }]}>
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
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.textMuted}
                />
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
                        onPress={() => router.push(`/read/${s.bookId}/${s.chapter}` as any)}
                        style={styles.scriptureRow}
                      >
                        <Ionicons name="book-outline" size={14} color={theme.accent} />
                        <Text style={[styles.scriptureRef, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                          {s.ref}
                        </Text>
                        <Ionicons name="chevron-forward" size={12} color={theme.textMuted} />
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    onPress={() => Linking.openURL(belief.egwLink)}
                    style={[styles.egwButton, { backgroundColor: theme.accent + "15" }]}
                    testID="egw-link"
                  >
                    <Ionicons name="library-outline" size={16} color={theme.accent} />
                    <Text style={[styles.egwButtonText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      Read in Ellen G. White Writings
                    </Text>
                    <Ionicons name="open-outline" size={14} color={theme.accent} />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: { width: 34, height: 34, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 20 },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
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
  sectionLabel: { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 },
  scriptureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
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
});
