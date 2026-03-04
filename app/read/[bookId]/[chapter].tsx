import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, Stack, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { getApiUrl, apiRequest, queryClient } from "@/lib/query-client";
import { useProStatus } from "@/contexts/ProContext";
import Colors from "@/constants/colors";
import { useTranslation } from "@/context/TranslationContext";
import ContextPanel from "@/components/reader/ContextPanel";
import RelatedContent from "@/components/reader/RelatedContent";
import TTSPlayerBar from "@/components/reader/TTSPlayerBar";
import useBibleAudio from "@/hooks/useBibleAudio";

const TRANSLATIONS = ["KJV", "ASV", "WEB"] as const;
type Translation = (typeof TRANSLATIONS)[number];

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
  const { bookId, chapter, translation: txParam } = useLocalSearchParams<{ bookId: string; chapter: string; translation?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { translation: globalTranslation, setTranslation: setGlobalTranslation } = useTranslation();
  const { isPro, showProGate } = useProStatus();
  const resolvedTx = TRANSLATIONS.includes(txParam as Translation) ? (txParam as Translation) : (TRANSLATIONS.includes(globalTranslation as Translation) ? (globalTranslation as Translation) : "KJV");
  const [translation, setTranslationLocal] = useState<Translation>(resolvedTx);

  useEffect(() => {
    if (!txParam && TRANSLATIONS.includes(globalTranslation as Translation) && globalTranslation !== translation) {
      setTranslationLocal(globalTranslation as Translation);
    }
  }, [globalTranslation]);

  const setTranslation = useCallback((t: Translation) => {
    setTranslationLocal(t);
    setGlobalTranslation(t);
  }, [setGlobalTranslation]);

  const [focusedVerse, setFocusedVerse] = useState<number | null>(null);
  const focusedVerseRef = useRef<number | null>(null);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      if (focusedVerseRef.current !== null) {
        queryClient.invalidateQueries({ queryKey: ["/api/highlights/guest"] });
        queryClient.invalidateQueries({ queryKey: ["/api/bookmarks/guest"] });
        const timer = setTimeout(() => {
          setFocusedVerse(null);
          focusedVerseRef.current = null;
        }, 400);
        return () => clearTimeout(timer);
      }
    }, [])
  );

  const { data, isLoading, error } = useQuery<PassageResponse>({
    queryKey: [`/api/passage?book=${bookId}&chapter=${chapter}&translation=${translation}`],
  });

  const { data: highlightsData } = useQuery<{ id: string; verseId: string; color: string }[]>({
    queryKey: ["/api/highlights/guest"],
  });

  const { data: bookmarksData } = useQuery<{ id: string; verseId: string; label: string }[]>({
    queryKey: ["/api/bookmarks/guest"],
  });

  const highlightedVerseIds = useMemo(() => {
    const set = new Set<string>();
    if (highlightsData) {
      for (const h of highlightsData) set.add(h.verseId);
    }
    return set;
  }, [highlightsData]);

  const bookmarkedVerseIds = useMemo(() => {
    const set = new Set<string>();
    if (bookmarksData) {
      for (const b of bookmarksData) set.add(b.verseId);
    }
    return set;
  }, [bookmarksData]);

  const bookName = data?.book?.name ?? "";
  const totalChapters = data?.book?.chapterCount ?? 0;
  const chapterNum = Number(chapter);

  const canGoPrev = chapterNum > 1;
  const canGoNext = chapterNum < totalChapters;

  const verses = data?.verses ?? [];

  const audio = useBibleAudio(verses, bookId, chapter, translation, scrollViewRef);

  useEffect(() => {
    if (data?.book?.name && bookId && chapter) {
      apiRequest("POST", "/api/reading-history", {
        userId: "guest",
        bookId: Number(bookId),
        bookName: data.book.name,
        chapter: Number(chapter),
        translation,
      })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/reading-history/recent?userId=guest"] });
          queryClient.invalidateQueries({ queryKey: ["/api/reading-streaks?userId=guest"] });
        })
        .catch(() => {});
    }
  }, [data?.book?.name, bookId, chapter, translation]);

  const prefetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data?.verses?.length || !bookId || !chapter) return;
    const prefetchKey = `${bookId}-${chapter}`;
    if (prefetchedRef.current === prefetchKey) return;
    prefetchedRef.current = prefetchKey;

    const bId = Number(bookId);
    const ch = Number(chapter);
    const vrs = data.verses;

    queryClient.prefetchQuery({
      queryKey: [`/api/chapter-context/${bId}/${ch}`],
    });

    queryClient.prefetchQuery({
      queryKey: [`/api/context?book=${bId}&chapter=${ch}`],
    });

    queryClient.prefetchQuery({
      queryKey: [`/api/commentary?book=${bId}&chapter=${ch}`],
    });

    const prefetchCount = Math.min(5, vrs.length);
    for (let i = 0; i < prefetchCount; i++) {
      const v = vrs[i];
      queryClient.prefetchQuery({
        queryKey: [`/api/verse-map/${v.id}`],
      });
      queryClient.prefetchQuery({
        queryKey: [`/api/strong/verse/${v.id}`],
      });
    }
  }, [data?.verses, bookId, chapter]);

  const goToPrev = useCallback(() => {
    if (canGoPrev) {
      audio.handleStop();
      router.replace(`/read/${bookId}/${chapterNum - 1}?translation=${translation}`);
    }
  }, [bookId, chapterNum, canGoPrev, translation, audio.handleStop]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      audio.handleStop();
      router.replace(`/read/${bookId}/${chapterNum + 1}?translation=${translation}`);
    }
  }, [bookId, chapterNum, canGoNext, translation, audio.handleStop]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleVerseTap = useCallback((item: Verse) => {
    Haptics.selectionAsync();
    setFocusedVerse(item.verse);
    focusedVerseRef.current = item.verse;
    router.push({
      pathname: "/verse-actions",
      params: {
        bookId,
        chapter,
        verse: String(item.verse),
        text: item.text,
        bookName,
        verseId: item.id,
        translation,
      },
    });
  }, [bookId, chapter, bookName, translation]);

  const hasBookmarksInChapter = useMemo(() => {
    if (!verses.length || !bookmarkedVerseIds.size) return false;
    return verses.some((v) => bookmarkedVerseIds.has(v.id));
  }, [verses, bookmarkedVerseIds]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackBtn}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </Pressable>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <Pressable
                hitSlop={8}
                style={styles.headerBtn}
                onPress={() => setShowTranslationPicker(!showTranslationPicker)}
              >
                <View style={[styles.translationBadge, { backgroundColor: isDark ? theme.backgroundCard : theme.backgroundCard }]}>
                  <Ionicons name="globe-outline" size={13} color={theme.textSecondary} />
                  <Text style={[styles.translationBadgeText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {translation}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                hitSlop={8}
                style={styles.headerBtn}
                onPress={() =>
                  router.push(
                    `/passage-context?bookId=${bookId}&chapter=${chapter}&bookName=${encodeURIComponent(bookName)}`
                  )
                }
              >
                <Ionicons name="layers-outline" size={20} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                hitSlop={8}
                style={styles.headerBtn}
                onPress={() => {
                  if (verses.length > 0) {
                    const firstVerse = verses[0];
                    handleVerseTap(firstVerse);
                  }
                }}
              >
                <Ionicons
                  name={hasBookmarksInChapter ? "bookmark" : "bookmark-outline"}
                  size={20}
                  color={hasBookmarksInChapter ? theme.bookmarkBlue : theme.textSecondary}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
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
          <>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: 160 + bottomPad },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {showTranslationPicker && (
                <View style={[styles.translationDropdown, { backgroundColor: isDark ? theme.backgroundElevated : theme.backgroundCard }]}>
                  {TRANSLATIONS.map((t) => {
                    const isActiveT = translation === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => { setTranslation(t); setShowTranslationPicker(false); }}
                        style={[
                          styles.translationOption,
                          isActiveT && { backgroundColor: theme.accent + "15" },
                        ]}
                      >
                        <Text style={[
                          styles.translationOptionText,
                          {
                            color: isActiveT ? theme.accent : theme.text,
                            fontFamily: isActiveT ? "Inter_700Bold" : "Inter_500Medium",
                          },
                        ]}>
                          {t}
                        </Text>
                        <Text style={[styles.translationOptionDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                          {t === "KJV" ? "King James Version" : t === "ASV" ? "American Standard" : "World English Bible"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <View style={styles.chapterHeader}>
                <Text style={[styles.bookNameHeader, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  {bookName}
                </Text>
                <Text style={[styles.chapterNumber, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                  {chapter}
                </Text>
              </View>

              <ContextPanel
                bookId={Number(bookId)}
                chapter={chapterNum}
                theme={theme}
                isDark={isDark}
                isPro={isPro}
                showProGate={showProGate}
              />

              <View style={styles.proseContainer}>
                <Text style={[styles.proseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                  {verses.map((v, i) => {
                    const isFocused = focusedVerse === v.verse;
                    const isDimmed = focusedVerse !== null && !isFocused;
                    const isHighlighted = highlightedVerseIds.has(v.id);
                    const isBookmarked = bookmarkedVerseIds.has(v.id);
                    const bgColor = i === audio.speakingVerseIndex
                      ? theme.highlightYellow
                      : isHighlighted
                        ? (isDark ? "rgba(201, 147, 58, 0.2)" : "rgba(255, 215, 0, 0.25)")
                        : "transparent";
                    return (
                      <React.Fragment key={v.id}>
                        <Text
                          onPress={() => handleVerseTap(v)}
                          style={[
                            styles.proseText,
                            {
                              color: theme.text,
                              fontFamily: "Lora_400Regular",
                              backgroundColor: bgColor,
                              opacity: isDimmed ? 0.3 : 1,
                            },
                          ]}
                        >
                          {isBookmarked && (
                            <Text style={{ color: theme.bookmarkBlue, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                              {"\u2691 "}
                            </Text>
                          )}
                          <Text style={[styles.verseNum, { color: isDimmed ? theme.textMuted : theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                            {" "}{v.verse}{" "}
                          </Text>
                          {v.text}
                        </Text>
                        {"  "}
                      </React.Fragment>
                    );
                  })}
                </Text>
              </View>

              <RelatedContent
                bookId={Number(bookId)}
                bookName={bookName}
                chapter={chapterNum}
                totalChapters={totalChapters}
                translation={translation}
                theme={theme}
                isDark={isDark}
              />
            </ScrollView>

            <TTSPlayerBar
              theme={theme}
              isDark={isDark}
              audio={audio}
              verses={verses}
              bookName={bookName}
              chapter={chapter}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
              goToPrev={goToPrev}
              goToNext={goToNext}
              bottomPad={bottomPad}
            />
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRight: { flexDirection: "row", gap: 14, alignItems: "center" },
  headerBackBtn: { padding: 4 },
  headerBtn: { padding: 4 },
  translationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  translationBadgeText: { fontSize: 12 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 20 },
  errorText: { fontSize: 17 },
  errorSub: { fontSize: 13, textAlign: "center" },
  scrollContent: { paddingHorizontal: 28, paddingTop: 8 },
  translationDropdown: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  translationOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  translationOptionText: { fontSize: 15 },
  translationOptionDesc: { fontSize: 12 },
  chapterHeader: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 40,
    gap: 0,
  },
  bookNameHeader: {
    fontSize: 16,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    opacity: 0.6,
    marginBottom: 4,
  },
  chapterNumber: {
    fontSize: 64,
    lineHeight: 74,
  },
  proseContainer: {
    paddingBottom: 24,
  },
  proseText: {
    fontSize: 21,
    lineHeight: 34,
  },
  verseNum: {
    fontSize: 11,
    lineHeight: 34,
  },
});
