import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, Stack, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/context/TranslationContext";
import RelatedContent from "@/components/reader/RelatedContent";
import TTSPlayerBar from "@/components/reader/TTSPlayerBar";
import useBibleAudio from "@/hooks/useBibleAudio";

const VERSE_TAP_HINT_KEY = "@grace-through-faith/verse-tap-hint-dismissed";

const DEFAULT_TRANSLATIONS = ["KJV", "ASV", "WEB", "BBE", "YLT", "RV1909", "LSG", "ARC", "TAGV"];

const TRANSLATION_LABELS: Record<string, string> = {
  KJV: "King James Version",
  ASV: "American Standard",
  WEB: "World English Bible",
  BBE: "Bible in Basic English",
  YLT: "Young's Literal Translation",
  RV1909: "Reina Valera 1909",
  LSG: "Louis Segond 1910",
  ARC: "Almeida Revista e Corrigida",
  TAGV: "Ang Biblia (Tagalog)",
};

type Translation = string;

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
  const { bookId, chapter, translation: txParam, verse: verseParam } = useLocalSearchParams<{ bookId: string; chapter: string; translation?: string; verse?: string }>();
  const { theme, isDark } = useTheme();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const { translation: globalTranslation, setTranslation: setGlobalTranslation } = useTranslation();
  const { data: availableTranslations } = useQuery<{ id: string; abbreviation: string; name: string; language: string }[]>({
    queryKey: ["/api/translations"],
  });
  const translationList = availableTranslations
    ? availableTranslations.map((t) => t.abbreviation)
    : DEFAULT_TRANSLATIONS;

  const resolvedTx = translationList.includes(txParam as string) ? (txParam as string) : (translationList.includes(globalTranslation) ? globalTranslation : "KJV");
  const [translation, setTranslationLocal] = useState<Translation>(resolvedTx);

  useEffect(() => {
    if (!txParam && translationList.includes(globalTranslation) && globalTranslation !== translation) {
      setTranslationLocal(globalTranslation);
    }
  }, [globalTranslation, translationList]);

  const setTranslation = useCallback((t: Translation) => {
    setTranslationLocal(t);
    setGlobalTranslation(t);
  }, [setGlobalTranslation]);

  const [focusedVerse, setFocusedVerse] = useState<number | null>(null);
  const focusedVerseRef = useRef<number | null>(null);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [highlightedFromNav, setHighlightedFromNav] = useState<number | null>(null);
  const [navHighlightAlpha, setNavHighlightAlpha] = useState(0);
  const [showVerseTapHint, setShowVerseTapHint] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(VERSE_TAP_HINT_KEY).then((val) => {
      if (!val) setShowVerseTapHint(true);
    });
  }, []);

  const dismissVerseTapHint = useCallback(() => {
    setShowVerseTapHint(false);
    AsyncStorage.setItem(VERSE_TAP_HINT_KEY, "1");
  }, []);

  useEffect(() => {
    if (verseParam) {
      const vNum = parseInt(verseParam, 10);
      if (!isNaN(vNum)) {
        setHighlightedFromNav(vNum);
        setNavHighlightAlpha(0.35);
        const fadeStart = setTimeout(() => {
          const steps = 10;
          let step = 0;
          const interval = setInterval(() => {
            step++;
            setNavHighlightAlpha(0.35 * (1 - step / steps));
            if (step >= steps) {
              clearInterval(interval);
              setHighlightedFromNav(null);
            }
          }, 100);
        }, 500);
        return () => clearTimeout(fadeStart);
      }
    }
  }, [verseParam]);

  useFocusEffect(
    useCallback(() => {
      if (focusedVerseRef.current !== null) {
        queryClient.invalidateQueries({ queryKey: [`/api/highlights/${userId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/${userId}`] });
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
    queryKey: [`/api/highlights/${userId}`],
  });

  const { data: bookmarksData } = useQuery<{ id: string; verseId: string; label: string }[]>({
    queryKey: [`/api/bookmarks/${userId}`],
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

  const audio = useBibleAudio(verses, bookId, chapter, translation, scrollViewRef, bookName);

  useEffect(() => {
    if (data?.book?.name && bookId && chapter) {
      apiRequest("POST", "/api/reading-history", {
        userId,
        bookId: Number(bookId),
        bookName: data.book.name,
        chapter: Number(chapter),
        translation,
      })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/reading-history/recent?userId=${userId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/reading-streaks?userId=${userId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/spiritual-rings?userId=${userId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/reading-streaks/weekly?userId=${userId}`] });
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
    if (showVerseTapHint) dismissVerseTapHint();
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
  }, [bookId, chapter, bookName, translation, showVerseTapHint, dismissVerseTapHint]);

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
                  {translationList.map((t) => {
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
                          {TRANSLATION_LABELS[t] || t}
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

              {showVerseTapHint && verses.length > 0 && (
                <Pressable
                  onPress={dismissVerseTapHint}
                  style={{
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    gap: 8,
                    backgroundColor: theme.accent + "12",
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    marginHorizontal: 20,
                    marginBottom: 12,
                  }}
                  testID="verse-tap-hint"
                >
                  <Ionicons name="hand-left-outline" size={16} color={theme.accent} />
                  <Text style={{ flex: 1, fontSize: 13, color: theme.accent, fontFamily: "Inter_500Medium", lineHeight: 18 }}>
                    Tap any verse to copy, highlight, or bookmark
                  </Text>
                  <Ionicons name="close" size={14} color={theme.textMuted} />
                </Pressable>
              )}

              <View style={styles.proseContainer}>
                <Text style={[styles.proseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                  {verses.map((v, i) => {
                    const isFocused = focusedVerse === v.verse;
                    const isDimmed = focusedVerse !== null && !isFocused;
                    const isHighlighted = highlightedVerseIds.has(v.id);
                    const isBookmarked = bookmarkedVerseIds.has(v.id);
                    const isNavHighlighted = highlightedFromNav === v.verse;
                    const bgColor = isNavHighlighted
                      ? `rgba(201, 147, 58, ${navHighlightAlpha})`
                      : i === audio.speakingVerseIndex
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

              <View style={styles.chapterCompleteRow}>
                <View style={[styles.chapterCompleteLine, { backgroundColor: theme.border }]} />
                <View style={[styles.chapterCompleteBadge, { backgroundColor: isDark ? theme.backgroundElevated : "#F5F0E6" }]}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
                  <Text style={[styles.chapterCompleteText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                    Chapter Complete
                  </Text>
                </View>
                <View style={[styles.chapterCompleteLine, { backgroundColor: theme.border }]} />
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
  chapterCompleteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 8,
    gap: 12,
  },
  chapterCompleteLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  chapterCompleteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chapterCompleteText: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
