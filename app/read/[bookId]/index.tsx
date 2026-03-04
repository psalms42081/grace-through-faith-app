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

interface BibleBook {
  id: number;
  name: string;
  chapterCount: number;
  testament: string;
}

export default function ChapterPickerScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: books, isLoading, error } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  const book = books?.find((b) => b.id === Number(bookId));
  const chapterCount = book?.chapterCount ?? 0;
  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen
        options={{
          title: book?.name ?? "Chapters",
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
            <View style={[styles.infoCard, { backgroundColor: theme.primary }]}>
              <View style={styles.infoRow}>
                <View style={[styles.testamentBadge, { backgroundColor: "rgba(201,147,58,0.25)" }]}>
                  <Text style={[styles.testamentText, { fontFamily: "Inter_600SemiBold" }]}>
                    {book.testament === "OT" ? "Old Testament" : "New Testament"}
                  </Text>
                </View>
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
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => router.push(`/read/${bookId}/${item}`)}
                  style={({ pressed }) => [
                    styles.chapterCell,
                    {
                      backgroundColor: theme.backgroundCard,
                      borderColor: theme.border,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                    {item}
                  </Text>
                </Pressable>
              )}
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
  testamentText: { color: "#C9933A", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" as const },
  bookTitle: { color: "#EDE5D5", fontSize: 24, marginBottom: 4 },
  chapterInfo: { color: "rgba(237,229,213,0.6)", fontSize: 13 },
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
});
