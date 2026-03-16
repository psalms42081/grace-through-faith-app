import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";

interface BibleBook {
  id: number;
  name: string;
  abbreviation: string;
  testament: string;
  chapterCount: number;
  orderIndex: number;
}

export default function DeepStudyPickerScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bookId?: string; chapter?: string; showIntro?: string }>();

  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  React.useEffect(() => {
    if (params.bookId && params.chapter) {
      router.replace({ pathname: "/(tabs)/study", params: { bookId: params.bookId, chapter: params.chapter, _t: String(Date.now()) } } as any);
    }
  }, []);

  const { data: books, isLoading, error } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  const otBooks = books?.filter((b) => b.testament === "OT") ?? [];
  const ntBooks = books?.filter((b) => b.testament === "NT") ?? [];

  const handleBookSelect = (book: BibleBook) => {
    if (book.chapterCount === 1) {
      router.push({ pathname: "/(tabs)/study", params: { bookId: String(book.id), chapter: "1", _t: String(Date.now()) } } as any);
    } else {
      setSelectedBook(book);
    }
  };

  const handleChapterSelect = (chapter: number) => {
    if (!selectedBook) return;
    router.push({ pathname: "/(tabs)/study", params: { bookId: String(selectedBook.id), chapter: String(chapter), _t: String(Date.now()) } } as any);
  };

  if (selectedBook) {
    return (
      <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
        <View style={[styles.stickyHeader, { paddingTop: topPad + 12, backgroundColor: theme.background }]}>
          <Pressable onPress={() => setSelectedBook(null)} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              {selectedBook.name}
            </Text>
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 }}>
              Select a chapter for Deep Study
            </Text>
          </View>
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.chaptersGrid}>
            {Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1).map((ch) => (
              <Pressable
                key={ch}
                onPress={() => handleChapterSelect(ch)}
                style={({ pressed }) => [
                  styles.chapterPill,
                  {
                    backgroundColor: isDark ? theme.backgroundCard : theme.backgroundCard,
                    borderColor: isDark ? theme.border : theme.borderLight,
                    borderWidth: 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.chapterText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {ch}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <View style={[styles.stickyHeader, { paddingTop: topPad + 12, backgroundColor: theme.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Deep Study
          </Text>
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 }}>
            Choose a passage for 4-Layer study
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.accent + "18" }]}>
          <Ionicons name="layers" size={14} color={theme.accent} />
          <Text style={{ fontSize: 11, color: theme.accent, fontFamily: "Inter_600SemiBold" }}>4-Layer</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.error} />
          <Text style={{ color: theme.text, fontFamily: "Lora_500Medium", fontSize: 17, marginTop: 10 }}>
            Unable to load books
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.testamentSection}>
            <Text style={[styles.testamentLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              Old Testament
            </Text>
            <Text style={[styles.testamentCount, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {otBooks.length} books
            </Text>
          </View>
          <View style={styles.booksGrid}>
            {otBooks.map((book) => (
              <Pressable
                key={book.id}
                onPress={() => handleBookSelect(book)}
                style={({ pressed }) => [
                  styles.bookPill,
                  {
                    backgroundColor: isDark ? theme.backgroundCard : theme.backgroundCard,
                    borderColor: isDark ? theme.border : theme.borderLight,
                    borderWidth: 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {book.name}
                </Text>
                <Text style={[styles.bookChapters, { color: isDark ? theme.textSecondary : theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {book.chapterCount}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.testamentSection, { marginTop: 40 }]}>
            <Text style={[styles.testamentLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              New Testament
            </Text>
            <Text style={[styles.testamentCount, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {ntBooks.length} books
            </Text>
          </View>
          <View style={styles.booksGrid}>
            {ntBooks.map((book) => (
              <Pressable
                key={book.id}
                onPress={() => handleBookSelect(book)}
                style={({ pressed }) => [
                  styles.bookPill,
                  {
                    backgroundColor: isDark ? theme.backgroundCard : theme.backgroundCard,
                    borderColor: isDark ? theme.border : theme.borderLight,
                    borderWidth: 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {book.name}
                </Text>
                <Text style={[styles.bookChapters, { color: isDark ? theme.textSecondary : theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {book.chapterCount}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  stickyHeader: {
    paddingHorizontal: 24,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 8 },
  testamentSection: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingBottom: 8,
  },
  testamentLabel: {
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  testamentCount: {
    fontSize: 12,
  },
  booksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  bookPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bookPillText: {
    fontSize: 14,
  },
  bookChapters: {
    fontSize: 11,
  },
  chaptersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chapterPill: {
    width: 52,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  chapterText: {
    fontSize: 15,
  },
});
