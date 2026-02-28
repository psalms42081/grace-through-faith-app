import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import * as Speech from "expo-speech";
import Colors from "@/constants/colors";

const TRANSLATIONS = ["KJV", "ASV", "WEB"] as const;
type Translation = (typeof TRANSLATIONS)[number];

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

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
  const initialTx = TRANSLATIONS.includes(txParam as Translation) ? (txParam as Translation) : "KJV";
  const [translation, setTranslation] = useState<Translation>(initialTx);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speakingVerseIndex, setSpeakingVerseIndex] = useState(-1);
  const [speechRate, setSpeechRate] = useState(1);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [ttsAvailable, setTtsAvailable] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const sessionRef = useRef(0);
  const currentIndexRef = useRef(-1);
  const versesRef = useRef<Verse[]>([]);
  const speechRateRef = useRef(1);

  useEffect(() => {
    if (Platform.OS === "web") {
      const supported =
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        typeof SpeechSynthesisUtterance !== "undefined";
      setTtsAvailable(supported);
    } else {
      setTtsAvailable(true);
    }
  }, []);

  const { data, isLoading, error } = useQuery<PassageResponse>({
    queryKey: [`/api/passage?book=${bookId}&chapter=${chapter}&translation=${translation}`],
  });

  const bookName = data?.book?.name ?? "";
  const totalChapters = data?.book?.chapterCount ?? 0;
  const chapterNum = Number(chapter);

  const canGoPrev = chapterNum > 1;
  const canGoNext = chapterNum < totalChapters;

  useEffect(() => {
    versesRef.current = data?.verses ?? [];
  }, [data?.verses]);

  const resetPlayback = useCallback(() => {
    sessionRef.current += 1;
    Speech.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingVerseIndex(-1);
    currentIndexRef.current = -1;
  }, []);

  useEffect(() => {
    resetPlayback();
  }, [bookId, chapter, translation, resetPlayback]);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      Speech.stop();
    };
  }, []);

  const speakVerse = useCallback((index: number, session: number) => {
    if (session !== sessionRef.current) return;

    const verses = versesRef.current;
    if (index < 0 || index >= verses.length) {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingVerseIndex(-1);
      currentIndexRef.current = -1;
      return;
    }

    currentIndexRef.current = index;
    setSpeakingVerseIndex(index);

    try {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
    } catch {}

    const verse = verses[index];
    const textToSpeak = `${verse.verse}. ${verse.text}`;

    try {
      Speech.speak(textToSpeak, {
        rate: speechRateRef.current,
        onDone: () => {
          if (session === sessionRef.current) {
            speakVerse(index + 1, session);
          }
        },
        onStopped: () => {},
        onError: () => {
          if (session === sessionRef.current) {
            setIsSpeaking(false);
            setIsPaused(false);
            setSpeakingVerseIndex(-1);
          }
        },
      });
    } catch {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingVerseIndex(-1);
      currentIndexRef.current = -1;
    }
  }, []);

  const handlePlay = useCallback(() => {
    const verses = versesRef.current;
    if (!verses.length) return;

    if (isPaused && currentIndexRef.current >= 0) {
      setIsPaused(false);
      setIsSpeaking(true);
      speakVerse(currentIndexRef.current, sessionRef.current);
      return;
    }

    const session = ++sessionRef.current;
    setIsSpeaking(true);
    setIsPaused(false);
    speakVerse(0, session);
  }, [isPaused, speakVerse]);

  const handlePause = useCallback(() => {
    Speech.stop();
    setIsPaused(true);
    setIsSpeaking(false);
  }, []);

  const handleStop = useCallback(() => {
    resetPlayback();
  }, [resetPlayback]);

  const handleSpeedChange = useCallback((rate: number) => {
    speechRateRef.current = rate;
    setSpeechRate(rate);
    setShowSpeedPicker(false);
    if (isSpeaking && currentIndexRef.current >= 0) {
      Speech.stop();
      speakVerse(currentIndexRef.current, sessionRef.current);
    }
  }, [isSpeaking, speakVerse]);

  const goToPrev = useCallback(() => {
    if (canGoPrev) {
      handleStop();
      router.replace(`/read/${bookId}/${chapterNum - 1}?translation=${translation}`);
    }
  }, [bookId, chapterNum, canGoPrev, translation, handleStop]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      handleStop();
      router.replace(`/read/${bookId}/${chapterNum + 1}?translation=${translation}`);
    }
  }, [bookId, chapterNum, canGoNext, translation, handleStop]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isActive = isSpeaking || isPaused;

  const headerComponent = useMemo(() => (
    <View style={styles.chapterHeader}>
      <Text style={[styles.chapterTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
        Chapter {chapter}
      </Text>
      <View style={[styles.dividerLine, { backgroundColor: theme.accent }]} />
      <View style={styles.translationRow}>
        {TRANSLATIONS.map((t) => {
          const isActiveT = translation === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTranslation(t)}
              style={[
                styles.translationPill,
                {
                  backgroundColor: isActiveT ? theme.accent : theme.backgroundCard,
                  borderColor: isActiveT ? theme.accent : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.translationPillText,
                  {
                    color: isActiveT ? "#fff" : theme.textSecondary,
                    fontFamily: isActiveT ? "Inter_700Bold" : "Inter_500Medium",
                  },
                ]}
              >
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  ), [chapter, theme, translation]);

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
        verseId: item.id,
        translation,
      },
    });
  }, [bookId, chapter, bookName, translation]);

  const renderVerse = useCallback(({ item, index }: { item: Verse; index: number }) => (
    <VerseRow
      item={item}
      theme={theme}
      isHighlighted={index === speakingVerseIndex}
      onPress={() => handleVerseTap(item)}
    />
  ), [theme, handleVerseTap, speakingVerseIndex]);

  const onScrollToIndexFailed = useCallback((info: { index: number; averageItemLength: number }) => {
    setTimeout(() => {
      try {
        flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.3 });
      } catch {}
    }, 200);
  }, []);

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
            ref={flatListRef}
            data={data?.verses ?? []}
            keyExtractor={(item) => item.id}
            renderItem={renderVerse}
            extraData={speakingVerseIndex}
            contentContainerStyle={[
              styles.verseList,
              isActive ? { paddingBottom: 80 } : undefined,
            ]}
            ListHeaderComponent={headerComponent}
            ListFooterComponent={footerComponent}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={onScrollToIndexFailed}
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

        {ttsAvailable && !isLoading && !error && (data?.verses?.length ?? 0) > 0 && (
          <View style={[
            styles.audioBar,
            {
              backgroundColor: theme.primary,
              paddingBottom: bottomPad + 8,
            },
          ]}>
            {showSpeedPicker && (
              <View style={[styles.speedPopup, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                {SPEED_OPTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => handleSpeedChange(s)}
                    style={[
                      styles.speedOption,
                      speechRate === s && { backgroundColor: theme.accent + "22" },
                    ]}
                  >
                    <Text style={[
                      styles.speedOptionText,
                      {
                        color: speechRate === s ? theme.accent : theme.text,
                        fontFamily: speechRate === s ? "Inter_700Bold" : "Inter_500Medium",
                      },
                    ]}>
                      {s}x
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.audioControls}>
              <Pressable
                onPress={() => setShowSpeedPicker(!showSpeedPicker)}
                style={[styles.speedBtn, { backgroundColor: "rgba(255,255,255,0.12)" }]}
                testID="speed-button"
              >
                <Text style={[styles.speedBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  {speechRate}x
                </Text>
              </Pressable>

              {isActive && (
                <View style={styles.verseIndicator}>
                  <Ionicons name="volume-high" size={14} color={Colors.light.accent} />
                  <Text style={[styles.verseIndicatorText, { fontFamily: "Inter_500Medium" }]}>
                    {isPaused ? "Paused" : `Verse ${(data?.verses ?? [])[speakingVerseIndex]?.verse ?? ""}`}
                  </Text>
                </View>
              )}

              <View style={styles.playControls}>
                {isActive && (
                  <Pressable onPress={handleStop} hitSlop={8} testID="stop-button">
                    <Ionicons name="stop-circle" size={32} color="rgba(255,255,255,0.7)" />
                  </Pressable>
                )}
                <Pressable
                  onPress={isSpeaking ? handlePause : handlePlay}
                  hitSlop={8}
                  testID="play-pause-button"
                >
                  <Ionicons
                    name={isSpeaking ? "pause-circle" : "play-circle"}
                    size={44}
                    color={Colors.light.accent}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

function VerseRow({
  item,
  theme,
  isHighlighted,
  onPress,
}: {
  item: Verse;
  theme: typeof Colors.light;
  isHighlighted: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.verseRow,
        {
          opacity: pressed ? 0.7 : 1,
          backgroundColor: isHighlighted
            ? theme.accent + "18"
            : pressed
              ? theme.backgroundSecondary
              : "transparent",
          borderRadius: 8,
          marginHorizontal: -6,
          paddingHorizontal: 6,
          borderLeftWidth: isHighlighted ? 3 : 0,
          borderLeftColor: isHighlighted ? theme.accent : "transparent",
        },
      ]}
    >
      <Text style={[
        styles.verseNum,
        {
          color: isHighlighted ? theme.accent : theme.accent,
          fontFamily: isHighlighted ? "Inter_700Bold" : "Inter_600SemiBold",
        },
      ]}>
        {item.verse}
      </Text>
      <Text style={[
        styles.verseText,
        {
          color: theme.text,
          fontFamily: "Lora_400Regular",
        },
      ]}>
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
  translationRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  translationPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  translationPillText: { fontSize: 12 },
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
  audioBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  speedBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  speedBtnText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
  },
  speedPopup: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  speedOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  speedOptionText: { fontSize: 13 },
  verseIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  verseIndicatorText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
  },
  playControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
