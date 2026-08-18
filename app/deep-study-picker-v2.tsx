// Deep Dive picker — Path B light conversion (micro-brief, picker only).
// Style-only rework of app/deep-study-picker.tsx: identical logic, params,
// navigation, and API. Hidden route until Joe approves the swap.
// Deep Dive identity colour: indigo #3A4E8C on tint #E4E9F5 (matches the
// Discover "Ways to Study" token). Coral is NOT used here — no CTA on this
// screen outranks the pills, keeping the coral ration untouched.
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
import { HV2, F } from "@/components/home-v2/theme";
import { safeGoBack } from "@/lib/safe-back";

const DEEP = { ink: "#3A4E8C", tint: "#E4E9F5" };

interface BibleBook {
  id: number;
  name: string;
  abbreviation: string;
  testament: string;
  chapterCount: number;
  orderIndex: number;
}

export default function DeepStudyPickerV2Screen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bookId?: string; chapter?: string; showIntro?: string }>();

  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  React.useEffect(() => {
    if (params.bookId && params.chapter) {
      router.replace({ pathname: "/(tabs)/study", params: { bookId: params.bookId, chapter: params.chapter, _t: String(Date.now()) } } as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: books, isLoading, error } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  const otBooks = books?.filter((b) => b.testament === "OT") ?? [];
  const ntBooks = books?.filter((b) => b.testament === "NT") ?? [];

  const handleBookSelect = (book: BibleBook) => {
    if (book.chapterCount === 1) {
      router.push({ pathname: "/(tabs)/study", params: { bookId: String(book.id), chapter: "1", showIntro: "true", _t: String(Date.now()) } } as any);
    } else {
      setSelectedBook(book);
    }
  };

  const handleChapterSelect = (chapter: number) => {
    if (!selectedBook) return;
    router.push({ pathname: "/(tabs)/study", params: { bookId: String(selectedBook.id), chapter: String(chapter), showIntro: "true", _t: String(Date.now()) } } as any);
  };

  const renderBookPill = (book: BibleBook) => (
    <Pressable
      key={book.id}
      onPress={() => handleBookSelect(book)}
      style={({ pressed }) => [styles.bookPill, HV2.rowShadow, { opacity: pressed ? 0.85 : 1 }]}
      testID={`deep2-book-${book.id}`}
    >
      <Text style={styles.bookPillText}>{book.name}</Text>
      <View style={styles.chapterCountChip}>
        <Text style={styles.bookChapters}>{book.chapterCount}</Text>
      </View>
    </Pressable>
  );

  if (selectedBook) {
    return (
      <View style={styles.wrapper}>
        <View style={[styles.stickyHeader, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => setSelectedBook(null)} hitSlop={12} style={styles.backBtn} testID="deep2-back-to-books" accessibilityRole="button" accessibilityLabel="Back to books">
            <Ionicons name="chevron-back" size={24} color={HV2.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{selectedBook.name}</Text>
            <Text style={styles.headerSub}>Select a chapter for Deep Dive</Text>
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
                style={({ pressed }) => [styles.chapterPill, HV2.rowShadow, { opacity: pressed ? 0.85 : 1 }]}
                testID={`deep2-chapter-${ch}`}
              >
                <Text style={styles.chapterText}>{ch}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.stickyHeader, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => safeGoBack(router, "/(tabs)/explore")} hitSlop={12} style={styles.backBtn} testID="deep2-back" accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={HV2.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Deep Dive</Text>
          <Text style={styles.headerSub}>Choose a passage to explore</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="layers" size={14} color={DEEP.ink} />
          <Text style={styles.badgeText}>Deep Dive</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DEEP.ink} />
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={HV2.coralInk} />
          <Text style={styles.errorText}>Unable to load books</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.testamentSection}>
            <Text style={styles.testamentLabel}>Old Testament</Text>
            <Text style={styles.testamentCount}>{otBooks.length} books</Text>
          </View>
          <View style={styles.booksGrid}>{otBooks.map(renderBookPill)}</View>

          <View style={[styles.testamentSection, { marginTop: 40 }]}>
            <Text style={styles.testamentLabel}>New Testament</Text>
            <Text style={styles.testamentCount}>{ntBooks.length} books</Text>
          </View>
          <View style={styles.booksGrid}>{ntBooks.map(renderBookPill)}</View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: HV2.surface },
  stickyHeader: {
    paddingHorizontal: 24,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: HV2.surface,
  },
  backBtn: { marginRight: 4 },
  headerTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
    color: HV2.ink,
    fontFamily: F.loraBold,
  },
  headerSub: {
    fontSize: 12,
    color: HV2.inkMutedText,
    fontFamily: F.inter,
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: DEEP.tint,
  },
  badgeText: { fontSize: 11, color: DEEP.ink, fontFamily: F.interSemi },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: HV2.ink, fontFamily: "Lora_500Medium", fontSize: 17, marginTop: 10 },
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
    color: DEEP.ink,
    fontFamily: F.interSemi,
  },
  testamentCount: { fontSize: 12, color: HV2.inkMutedText, fontFamily: F.inter },
  booksGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bookPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  bookPillText: { fontSize: 14, color: HV2.ink, fontFamily: F.interMed },
  chapterCountChip: {
    backgroundColor: DEEP.tint,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  bookChapters: { fontSize: 11, color: DEEP.ink, fontFamily: F.interSemi },
  chaptersGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chapterPill: {
    width: 52,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  chapterText: { fontSize: 15, color: HV2.ink, fontFamily: F.interMed },
});
