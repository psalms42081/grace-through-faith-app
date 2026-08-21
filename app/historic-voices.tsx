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

const ADVENTIST_PIONEER_NAMES = new Set([
  ADVENTIST_VOICE,
  "Uriah Smith",
  "J.N. Andrews",
  "John Loughborough",
  "Joseph Bates",
  "James White",
]);

const VOICE_ORDER: string[] = [
  ADVENTIST_VOICE,
  "Uriah Smith",
  "J.N. Andrews",
  "John Loughborough",
  "Joseph Bates",
  "James White",
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

const DEFAULT_BOOK_ID = 1;
const DEFAULT_CHAPTER = 1;
const DEFAULT_BOOK_NAME = "Genesis";

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

  const chapterNum = chapter ? parseInt(chapter) : DEFAULT_CHAPTER;
  const bookIdNum = bookId ? parseInt(bookId) : DEFAULT_BOOK_ID;
  const displayBookName = bookName || DEFAULT_BOOK_NAME;

  const commentaryQueryKey = `/api/commentary?book=${bookIdNum}&chapter=${chapterNum}`;

  const { data: commentaryData, isLoading } = useQuery<CommentaryEntry[]>({
    queryKey: [commentaryQueryKey],
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

  // `mutate` is referentially stable across renders (React Query guarantee), so
  // depending on it (rather than the whole mutation object) keeps this a
  // trigger-once effect without re-running on every render.
  const { mutate: generateCommentary, isPending: isGenerating, isError: generateError } = generateMutation;

  useEffect(() => {
    if (bookIdNum && chapterNum && !isLoading && !hasCommentary && !isGenerating && !generateError) {
      generateCommentary();
    }
  }, [bookIdNum, chapterNum, isLoading, hasCommentary, isGenerating, generateError, generateCommentary]);

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

  const adventistEntries = filteredCommentary?.filter((c) => ADVENTIST_PIONEER_NAMES.has(c.commentator.name)) || [];
  const classicEntries = filteredCommentary?.filter((c) => !ADVENTIST_PIONEER_NAMES.has(c.commentator.name)) || [];

  return (
    <>
      <Stack.Screen
        options={{
          title: `${displayBookName} ${chapterNum} — Insight`,
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
          Insights and perspectives on {displayBookName} {chapterNum}
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
                const isPioneer = ADVENTIST_PIONEER_NAMES.has(name);
                return (
                  <Pressable
                    key={name}
                    onPress={() => handleChipPress(isActive ? null : name)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isActive ? theme.accent : theme.backgroundCard,
                        borderColor: isActive ? theme.accent : isPioneer ? theme.accent + "50" : theme.border,
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
                          color: isActive ? "#fff" : isPioneer ? theme.accent : theme.textSecondary,
                          fontFamily: isActive || isPioneer ? "Inter_600SemiBold" : "Inter_500Medium",
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

        {adventistEntries.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={14} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
                Adventist Pioneers
              </Text>
            </View>
            {adventistEntries.map((item) => {
              const isEgw = item.commentator.name === ADVENTIST_VOICE;
              return (
                <View
                  key={item.entry.id}
                  style={[
                    styles.commentCard,
                    {
                      backgroundColor: theme.backgroundCard,
                      borderColor: theme.accent + "40",
                      borderLeftWidth: 3,
                      borderLeftColor: theme.accent,
                    },
                  ]}
                >
                  <View style={styles.commentHeader}>
                    <View style={styles.commentHeaderLeft}>
                      <View style={[styles.adventistBadge, { backgroundColor: theme.accent + "18" }]}>
                        <Ionicons name="star" size={10} color={theme.accent} />
                      </View>
                      <Text style={[styles.commentatorName, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                        {item.commentator.name}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.commentContent, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                    {item.entry.content}
                  </Text>
                  <View style={styles.egwFooter}>
                    <Text style={[styles.egwDisclaimer, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      Thematic summary based on {item.commentator.name}'s known theological emphases.
                    </Text>
                    {isEgw && (
                      <Pressable
                        onPress={() => Linking.openURL("https://egwwritings.org")}
                        style={({ pressed }) => [styles.egwLink, { opacity: pressed ? 0.6 : 1 }]}
                      >
                        <Ionicons name="open-outline" size={13} color={theme.accent} />
                        <Text style={[styles.egwLinkText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                          Read more on egwwritings.org
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {classicEntries.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="book" size={14} color={theme.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                Classic Commentators
              </Text>
            </View>
            {classicEntries.map((item) => (
              <View
                key={item.entry.id}
                style={[
                  styles.commentCard,
                  {
                    backgroundColor: theme.backgroundCard,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.commentHeader}>
                  <View style={styles.commentHeaderLeft}>
                    <Text style={[styles.commentatorName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
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
              </View>
            ))}
          </>
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
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 15, letterSpacing: 0.3 },
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
});
