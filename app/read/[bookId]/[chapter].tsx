import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";

interface Verse {
  id: string;
  verse: number;
  text: string;
}

interface PassageResponse {
  book: { id: number; name: string; chapterCount: number };
  chapter: number;
  verses: Verse[];
}

export default function VerseReaderScreen() {
  const { bookId, chapter } = useLocalSearchParams<{ bookId: string; chapter: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { data, isLoading, error } = useQuery<PassageResponse>({
    queryKey: [`/api/passage?book=${bookId}&chapter=${chapter}&translation=KJV`],
  });

  const bookName = data?.book?.name ?? "";
  const totalChapters = data?.book?.chapterCount ?? 0;
  const chapterNum = Number(chapter);

  const canGoPrev = chapterNum > 1;
  const canGoNext = chapterNum < totalChapters;

  const goToPrev = useCallback(() => {
    if (canGoPrev) router.replace(`/read/${bookId}/${chapterNum - 1}`);
  }, [bookId, chapterNum, canGoPrev]);

  const goToNext = useCallback(() => {
    if (canGoNext) router.replace(`/read/${bookId}/${chapterNum + 1}`);
  }, [bookId, chapterNum, canGoNext]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const headerComponent = useMemo(() => (
    <View style={styles.chapterHeader}>
      <Text style={[styles.chapterTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
        Chapter {chapter}
      </Text>
      <View style={[styles.dividerLine, { backgroundColor: theme.accent }]} />
    </View>
  ), [chapter, theme]);

  const footerComponent = useMemo(() => (
    <View style={[styles.navFooter, { paddingBottom: bottomPad + 20 }]}>
      <View style={[styles.navDivider, { backgroundColor: theme.divider }]} />
      <View style={styles.navRow}>
        <Pressable
          onPress={goToPrev}
          disabled={!canGoPrev}
          style={({ pressed }) => [
            styles.navBtn,
            {
              backgroundColor: canGoPrev ? theme.backgroundCard : "transparent",
              borderColor: theme.border,
              opacity: pressed ? 0.7 : canGoPrev ? 1 : 0.3,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={16} color={canGoPrev ? theme.text : theme.textMuted} />
          <Text style={[styles.navBtnText, { color: canGoPrev ? theme.text : theme.textMuted, fontFamily: "Inter_500Medium" }]}>
            Prev
          </Text>
        </Pressable>

        <Text style={[styles.navLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {chapterNum} of {totalChapters}
        </Text>

        <Pressable
          onPress={goToNext}
          disabled={!canGoNext}
          style={({ pressed }) => [
            styles.navBtn,
            {
              backgroundColor: canGoNext ? theme.backgroundCard : "transparent",
              borderColor: theme.border,
              opacity: pressed ? 0.7 : canGoNext ? 1 : 0.3,
            },
          ]}
        >
          <Text style={[styles.navBtnText, { color: canGoNext ? theme.text : theme.textMuted, fontFamily: "Inter_500Medium" }]}>
            Next
          </Text>
          <Ionicons name="chevron-forward" size={16} color={canGoNext ? theme.text : theme.textMuted} />
        </Pressable>
      </View>
    </View>
  ), [canGoPrev, canGoNext, chapterNum, totalChapters, theme, bottomPad, goToPrev, goToNext]);

  const handleVerseTap = useCallback((item: Verse) => {
    router.push({
      pathname: "/verse-actions",
      params: {
        bookId,
        chapter,
        verse: String(item.verse),
        text: item.text,
        bookName,
      },
    });
  }, [bookId, chapter, bookName]);

  const renderVerse = useCallback(({ item }: { item: Verse }) => (
    <VerseRow item={item} theme={theme} onPress={() => handleVerseTap(item)} />
  ), [theme, handleVerseTap]);

  return (
    <>
      <Stack.Screen
        options={{
          title: `${bookName} ${chapter}`,
          headerRight: () => (
            <View style={styles.headerRight}>
              <Pressable
                hitSlop={8}
                style={styles.headerBtn}
                onPress={() =>
                  router.push(
                    `/passage-context?bookId=${bookId}&chapter=${chapter}&bookName=${encodeURIComponent(bookName)}`
                  )
                }
              >
                <Ionicons name="layers-outline" size={18} color={theme.textSecondary} />
              </Pressable>
              <Pressable hitSlop={8} style={styles.headerBtn}>
                <Ionicons name="bookmark-outline" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Loading passage...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={40} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.text, fontFamily: "Lora_500Medium" }]}>
              Unable to load passage
            </Text>
            <Text style={[styles.errorSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {(error as Error).message}
            </Text>
          </View>
        ) : (
          <FlatList
            data={data?.verses ?? []}
            keyExtractor={(item) => item.id}
            renderItem={renderVerse}
            contentContainerStyle={styles.verseList}
            ListHeaderComponent={headerComponent}
            ListFooterComponent={footerComponent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={36} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  No verses found for this chapter.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

function VerseRow({ item, theme, onPress }: { item: Verse; theme: typeof Colors.light; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.verseRow,
        {
          opacity: pressed ? 0.7 : 1,
          backgroundColor: pressed ? theme.backgroundSecondary : "transparent",
          borderRadius: 8,
          marginHorizontal: -6,
          paddingHorizontal: 6,
        },
      ]}
    >
      <Text style={[styles.verseNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
        {item.verse}
      </Text>
      <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
        {item.text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRight: { flexDirection: "row", gap: 12, marginRight: 4 },
  headerBtn: { padding: 4 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 20 },
  errorText: { fontSize: 17 },
  errorSub: { fontSize: 13, textAlign: "center" },
  verseList: { paddingHorizontal: 24, paddingTop: 8 },
  chapterHeader: { alignItems: "center", paddingVertical: 20, gap: 12 },
  chapterTitle: { fontSize: 22 },
  dividerLine: { width: 40, height: 2, borderRadius: 1 },
  verseRow: {
    flexDirection: "row",
    paddingVertical: 6,
    gap: 8,
    alignItems: "flex-start",
  },
  verseNum: { fontSize: 11, lineHeight: 26, minWidth: 22, textAlign: "right" },
  verseText: { flex: 1, fontSize: 17, lineHeight: 28 },
  navFooter: { paddingHorizontal: 0, paddingTop: 24 },
  navDivider: { height: 1, marginBottom: 16 },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  navBtnText: { fontSize: 14 },
  navLabel: { fontSize: 13 },
  emptyContainer: { alignItems: "center", gap: 10, paddingTop: 60 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
