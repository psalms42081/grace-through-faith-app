import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { SWEEP_LIGHT } from "@/constants/light-sweep";
import { useAuth } from "@/contexts/AuthContext";

// Read-state recolor (Batch 1 review packet) — gold is reserved for
// streak/analytics and teal for Sabbath School, so read indicators remap.
// Joe picks one on sight; flip READ_STATE below to apply.
const READ_STATE_OPTIONS = {
  coral: {
    chipBg: "rgba(232,96,76,0.10)",
    chipText: "#C24431",
    cellBg: "rgba(232,96,76,0.08)",
    cellBorder: "rgba(232,96,76,0.45)",
    cellText: "#C24431",
    dot: "#E8604C",
  },
  green: {
    chipBg: "rgba(46,125,50,0.08)",
    chipText: "#1B5E20", // darker green — keeps the 11px chip label at 4.5:1 on the tint
    cellBg: "rgba(46,125,50,0.10)",
    cellBorder: "rgba(46,125,50,0.45)",
    cellText: "#2E7D32",
    dot: "#2E7D32",
  },
} as const;
const READ_STATE = READ_STATE_OPTIONS.coral;

interface BibleBook {
  id: number;
  name: string;
  chapterCount: number;
  testament: string;
}

export default function ChapterPickerScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  useTheme();
  const theme = SWEEP_LIGHT; // Path B — pinned light (Batch 1 Bible-tab sweep)
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();

  const { data: books, isLoading, error } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  const { data: readChapters } = useQuery<number[]>({
    queryKey: [`/api/reading-history/book/${bookId}?userId=${userId}`],
    enabled: !!bookId && !!userId,
    staleTime: 30_000,
  });

  const readSet = new Set(readChapters ?? []);

  const book = books?.find((b) => b.id === Number(bookId));
  const chapterCount = book?.chapterCount ?? 0;
  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);
  const chaptersReadCount = readChapters?.length
    ? [...new Set(readChapters)].length
    : 0;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen
        options={{
          title: book?.name ?? "Chapters",
          headerStyle: { backgroundColor: SWEEP_LIGHT.background },
          headerTintColor: SWEEP_LIGHT.text,
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : error || !book ? (
          <View style={styles.centerContent}>
            <Ionicons name="alert-circle-outline" size={40} color={theme.error} />
            <Text style={[styles.errorTitle, { color: theme.text, fontFamily: "Lora_500Medium" }]}>
              {error ? "Unable to load book data" : "Book not found"}
            </Text>
            <Text style={[styles.errorSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {error ? (error as Error).message : `No book with ID ${bookId}`}
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.infoCard, { backgroundColor: theme.backgroundCard, borderWidth: 1, borderColor: theme.border }]}>
              <View style={styles.infoRow}>
                <View style={[styles.testamentBadge, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.testamentText, { fontFamily: "Inter_600SemiBold" }]}>
                    {book.testament === "OT" ? "Old Testament" : "New Testament"}
                  </Text>
                </View>
                {chaptersReadCount > 0 && (
                  <View style={[styles.testamentBadge, { backgroundColor: READ_STATE.chipBg, marginLeft: 8 }]}>
                    <Text style={[styles.testamentText, { color: READ_STATE.chipText, fontFamily: "Inter_600SemiBold" }]}>
                      {chaptersReadCount}/{chapterCount} read
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.bookTitle, { fontFamily: "Lora_700Bold" }]}>
                {book.name}
              </Text>
              <Text style={[styles.chapterInfo, { fontFamily: "Inter_400Regular" }]}>
                {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}
              </Text>
            </View>

            <FlatList
              data={chapters}
              keyExtractor={(item) => String(item)}
              numColumns={5}
              contentContainerStyle={[styles.gridContent, { paddingBottom: bottomPad + 20 }]}
              columnWrapperStyle={styles.gridRow}
              renderItem={({ item }) => {
                const isRead = readSet.has(item);
                return (
                  <Pressable
                    onPress={() => router.push(`/read/${bookId}/${item}`)}
                    style={({ pressed }) => [
                      styles.chapterCell,
                      {
                        backgroundColor: isRead ? READ_STATE.cellBg : theme.backgroundCard,
                        borderColor: isRead ? READ_STATE.cellBorder : theme.border,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text style={[
                      styles.chapterNum,
                      { color: isRead ? READ_STATE.cellText : theme.text, fontFamily: isRead ? "Lora_700Bold" : "Lora_600SemiBold" }
                    ]}>
                      {item}
                    </Text>
                    {isRead && (
                      <View style={[styles.readDot, { backgroundColor: READ_STATE.dot }]} />
                    )}
                  </Pressable>
                );
              }}
              ListHeaderComponent={
                <Text style={[styles.selectLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                  Select a chapter
                </Text>
              }
            />
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 20 },
  errorTitle: { fontSize: 17 },
  errorSub: { fontSize: 13, textAlign: "center" },
  infoCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
  },
  infoRow: { flexDirection: "row", marginBottom: 10 },
  testamentBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  testamentText: { color: "#C24431", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" as const },
  bookTitle: { color: "#1F1A12", fontSize: 24, marginBottom: 4 },
  chapterInfo: { color: "#6B6660", fontSize: 13 },
  selectLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    marginBottom: 14,
  },
  gridContent: { padding: 20 },
  gridRow: { gap: 10, marginBottom: 10 },
  chapterCell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: "18%",
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  chapterNum: { fontSize: 16 },
  readDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
