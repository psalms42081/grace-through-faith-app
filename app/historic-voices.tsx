import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";

interface CommentaryEntry {
  entry: {
    id: string;
    title: string | null;
    content: string;
    verseStart: number | null;
    verseEnd: number | null;
  };
  commentator: {
    id: string;
    name: string;
    tradition: string | null;
  };
}

const ADVENTIST_VOICE = "Ellen G. White";

const VOICE_ORDER: string[] = [
  ADVENTIST_VOICE,
  "Matthew Henry",
  "Jamieson, Fausset & Brown",
  "Adam Clarke",
  "John Gill",
];

function sortCommentatorNames(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const ai = VOICE_ORDER.indexOf(a);
    const bi = VOICE_ORDER.indexOf(b);
    const aIdx = ai === -1 ? 999 : ai;
    const bIdx = bi === -1 ? 999 : bi;
    return aIdx - bIdx;
  });
}

export default function HistoricVoicesScreen() {
  const { bookId, chapter, bookName } = useLocalSearchParams<{
    bookId: string;
    chapter: string;
    bookName: string;
  }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeCommentator, setActiveCommentator] = useState<string | null>(null);

  const chapterNum = chapter ? parseInt(chapter) : null;
  const bookIdNum = bookId ? parseInt(bookId) : null;

  const commentaryQueryKey = `/api/commentary?book=${bookIdNum}&chapter=${chapterNum}`;

  const { data: commentaryData, isLoading } = useQuery<CommentaryEntry[]>({
    queryKey: [commentaryQueryKey],
    enabled: !!bookIdNum && !!chapterNum,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/commentary/generate", {
        bookId: bookIdNum,
        chapter: chapterNum,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([commentaryQueryKey], data);
    },
  });

  const hasCommentary = commentaryData && commentaryData.length > 0;

  useEffect(() => {
    if (bookIdNum && chapterNum && !isLoading && !hasCommentary && !generateMutation.isPending && !generateMutation.isError) {
      generateMutation.mutate();
    }
  }, [bookIdNum, chapterNum, isLoading, hasCommentary, generateMutation.isPending, generateMutation.isError]);

  const commentatorNames = hasCommentary
    ? sortCommentatorNames([...new Set(commentaryData!.map((c) => c.commentator.name))])
    : [];

  const filteredCommentary = activeCommentator
    ? commentaryData?.filter((c) => c.commentator.name === activeCommentator)
    : commentaryData;

  const filteredCount = filteredCommentary?.length ?? 0;

  const handleChipPress = useCallback((name: string | null) => {
    setActiveCommentator(name);
  }, []);

  const topPad = Platform.OS === "web" ? 67 + insets.top : 0;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const hasEgw = commentatorNames.includes(ADVENTIST_VOICE);

  return (
    <>
      <Stack.Screen
        options={{
          title: `${bookName || ""} ${chapter || ""} — Insight`,
          headerBackTitle: "Back",
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 40, paddingHorizontal: 20 }}
      >
        <Text style={[styles.heading, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Insight & Voices
        </Text>
        <Text style={[styles.subheading, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Insights and perspectives on {bookName} {chapter}
        </Text>

        {commentatorNames.length > 0 && (
          <View style={styles.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContent}
            >
              <Pressable
                onPress={() => handleChipPress(null)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: !activeCommentator ? theme.accent : theme.backgroundCard,
                    borderColor: !activeCommentator ? theme.accent : theme.border,
                  },
                ]}
                testID="filter-all"
                accessibilityRole="button"
                accessibilityLabel="Show all commentators"
                accessibilityState={{ selected: !activeCommentator }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: !activeCommentator ? "#fff" : theme.textSecondary,
                      fontFamily: !activeCommentator ? "Inter_600SemiBold" : "Inter_500Medium",
                    },
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {commentatorNames.map((name) => {
                const isActive = activeCommentator === name;
                const isAdventist = name === ADVENTIST_VOICE;
                return (
                  <Pressable
                    key={name}
                    onPress={() => handleChipPress(isActive ? null : name)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isActive ? theme.accent : theme.backgroundCard,
                        borderColor: isActive ? theme.accent : isAdventist ? theme.accent + "50" : theme.border,
                      },
                    ]}
                    testID={`filter-${name.replace(/\s/g, "-").toLowerCase()}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${name}`}
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color: isActive ? "#fff" : isAdventist ? theme.accent : theme.textSecondary,
                          fontFamily: isActive || isAdventist ? "Inter_600SemiBold" : "Inter_500Medium",
                        },
                      ]}
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {hasCommentary && filteredCount > 0 && (
          <Text style={[styles.resultCount, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {filteredCount} {filteredCount === 1 ? "entry" : "entries"}
            {activeCommentator ? ` from ${activeCommentator}` : ""}
          </Text>
        )}

        {(isLoading || generateMutation.isPending) && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Loading commentary...
            </Text>
          </View>
        )}

        {generateMutation.isError && (
          <View style={styles.emptyBox}>
            <Ionicons name="alert-circle-outline" size={48} color="#E8456B" />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Failed to load commentary. Please try again later.
            </Text>
            <Pressable
              onPress={() => generateMutation.mutate()}
              style={[styles.retryBtn, { borderColor: theme.accent }]}
            >
              <Text style={[styles.retryText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !generateMutation.isPending && !generateMutation.isError && !hasCommentary && (
          <View style={styles.emptyBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              No commentary available for this chapter yet.
            </Text>
          </View>
        )}

        {hasCommentary && filteredCount === 0 && activeCommentator && (
          <View style={styles.emptyBox}>
            <Ionicons name="filter-outline" size={36} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              No entries from {activeCommentator} for this chapter.
            </Text>
          </View>
        )}

        {filteredCommentary?.map((item) => {
          const isAdventist = item.commentator.name === ADVENTIST_VOICE;
          return (
            <View
              key={item.entry.id}
              style={[
                styles.commentCard,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: isAdventist ? theme.accent + "40" : theme.border,
                  borderLeftWidth: isAdventist ? 3 : 1,
                  borderLeftColor: isAdventist ? theme.accent : theme.border,
                },
              ]}
            >
              <View style={styles.commentHeader}>
                <View style={styles.commentHeaderLeft}>
                  {isAdventist && (
                    <View style={[styles.adventistBadge, { backgroundColor: theme.accent + "18" }]}>
                      <Ionicons name="star" size={10} color={theme.accent} />
                    </View>
                  )}
                  <Text style={[styles.commentatorName, { color: isAdventist ? theme.accent : theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {item.commentator.name}
                  </Text>
                  {item.commentator.tradition && (
                    <>
                      <Text style={[styles.traditionSep, { color: theme.textMuted }]}>{" \u2014 "}</Text>
                      <Text style={[styles.tradition, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {item.commentator.tradition}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              {item.entry.verseStart && (
                <Text style={[styles.verseRange, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  {item.entry.verseStart === item.entry.verseEnd || !item.entry.verseEnd
                    ? `Verse ${item.entry.verseStart}`
                    : `Verses ${item.entry.verseStart}–${item.entry.verseEnd}`}
                </Text>
              )}
              <Text style={[styles.commentContent, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                {item.entry.content}
              </Text>
              {isAdventist && (
                <View style={styles.egwFooter}>
                  <Text style={[styles.egwDisclaimer, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Summary inspired by themes in Ellen G. White's writings.
                  </Text>
                  <Pressable
                    onPress={() => Linking.openURL("https://egwwritings.org")}
                    style={({ pressed }) => [styles.egwLink, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Ionicons name="open-outline" size={13} color={theme.accent} />
                    <Text style={[styles.egwLinkText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                      Read more on egwwritings.org
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        {!hasEgw && hasCommentary && !isLoading && (
          <Pressable
            onPress={() => Linking.openURL("https://egwwritings.org")}
            style={({ pressed }) => [
              styles.egwPromo,
              { backgroundColor: theme.accent + "10", borderColor: theme.accent + "30", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.egwPromoInner}>
              <Ionicons name="book-outline" size={20} color={theme.accent} />
              <View style={styles.egwPromoText}>
                <Text style={[styles.egwPromoTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  Ellen G. White Writings
                </Text>
                <Text style={[styles.egwPromoSub, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  Explore Adventist commentary on egwwritings.org
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={theme.accent} />
            </View>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { fontSize: 24, marginBottom: 4 },
  subheading: { fontSize: 14, marginBottom: 20 },
  filterContainer: { marginBottom: 12 },
  filterContent: { paddingRight: 20 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    minHeight: 40,
    justifyContent: "center" as const,
  },
  filterChipText: { fontSize: 13 },
  resultCount: { fontSize: 12, marginBottom: 16 },
  loadingBox: { alignItems: "center" as const, paddingVertical: 60, gap: 16 },
  loadingText: { fontSize: 14 },
  emptyBox: { alignItems: "center" as const, paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center" as const },
  retryBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  retryText: { fontSize: 14 },
  commentCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  commentHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  commentHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    flexWrap: "wrap" as const,
    flex: 1,
  },
  adventistBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  commentatorName: { fontSize: 14 },
  traditionSep: { fontSize: 12 },
  tradition: { fontSize: 12 },
  verseRange: { fontSize: 12, marginBottom: 8 },
  commentContent: { fontSize: 15, lineHeight: 24 },
  egwFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  egwDisclaimer: { fontSize: 11, fontStyle: "italic" as const },
  egwLink: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  egwLinkText: { fontSize: 12 },
  egwPromo: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  egwPromoInner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  egwPromoText: { flex: 1 },
  egwPromoTitle: { fontSize: 14, marginBottom: 2 },
  egwPromoSub: { fontSize: 12 },
});
