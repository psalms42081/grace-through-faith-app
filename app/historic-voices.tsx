import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
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
    ? [...new Set(commentaryData!.map((c) => c.commentator.name))]
    : [];

  const filteredCommentary = activeCommentator
    ? commentaryData?.filter((c) => c.commentator.name === activeCommentator)
    : commentaryData;

  const topPad = Platform.OS === "web" ? 67 + insets.top : 0;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen
        options={{
          title: `${bookName || ""} ${chapter || ""} — Voices`,
          headerBackTitle: "Back",
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 40, paddingHorizontal: 20 }}
      >
        <Text style={[styles.heading, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Historic Voices
        </Text>
        <Text style={[styles.subheading, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Commentary on {bookName} {chapter}
        </Text>

        {commentatorNames.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <Pressable
              onPress={() => setActiveCommentator(null)}
              style={[styles.filterPill, { backgroundColor: !activeCommentator ? theme.accent + "20" : theme.backgroundCard, borderColor: !activeCommentator ? theme.accent : theme.border }]}
            >
              <Text style={[styles.filterText, { color: !activeCommentator ? theme.accent : theme.text, fontFamily: "Inter_500Medium" }]}>All</Text>
            </Pressable>
            {commentatorNames.map((name) => (
              <Pressable
                key={name}
                onPress={() => setActiveCommentator(name === activeCommentator ? null : name)}
                style={[styles.filterPill, { backgroundColor: activeCommentator === name ? theme.accent + "20" : theme.backgroundCard, borderColor: activeCommentator === name ? theme.accent : theme.border }]}
              >
                <Text style={[styles.filterText, { color: activeCommentator === name ? theme.accent : theme.text, fontFamily: "Inter_500Medium" }]}>{name}</Text>
              </Pressable>
            ))}
          </ScrollView>
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

        {filteredCommentary?.map((item) => (
          <View key={item.entry.id} style={[styles.commentCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={styles.commentHeader}>
              <Text style={[styles.commentatorName, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                {item.commentator.name}
              </Text>
              {item.commentator.tradition && (
                <Text style={[styles.tradition, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {item.commentator.tradition}
                </Text>
              )}
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
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { fontSize: 24, marginBottom: 4 },
  subheading: { fontSize: 14, marginBottom: 20 },
  filterRow: { marginBottom: 20, flexGrow: 0 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: { fontSize: 13 },
  loadingBox: { alignItems: "center", paddingVertical: 60, gap: 16 },
  loadingText: { fontSize: 14 },
  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center" },
  retryBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  retryText: { fontSize: 14 },
  commentCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  commentatorName: { fontSize: 14 },
  tradition: { fontSize: 11 },
  verseRange: { fontSize: 12, marginBottom: 8 },
  commentContent: { fontSize: 15, lineHeight: 24 },
});
