import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { getSpeakerColor, getSpeakerInitials } from "@/constants/speakers";
import { TOPICS } from "@/data/topics";
import { useTranslation } from "@/context/TranslationContext";
import { getApiUrl } from "@/lib/query-client";
import { navigateToScriptureByParts } from "@/lib/scripture-nav";

const MEDIA_TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  sermon: "mic",
  tv: "tv",
  teaching: "school",
  music: "musical-notes",
};

const MEDIA_TYPE_LABEL: Record<string, string> = {
  sermon: "Sermon",
  tv: "Watch",
  teaching: "Teaching",
  music: "Music",
};

interface DailyReflection {
  reflection: string;
  question: string;
  challenge: string;
  verseReference: string;
  verseText: string;
  // Optional translation metadata returned by the backend for the reflection verse.
  translation?: string;
  translationName?: string;
  provider?: string;
}

interface PassageVerse {
  id?: string;
  verse: number;
  text: string;
}

interface PassageResponse {
  book: { id: number; name: string; chapterCount: number };
  chapter: number;
  verses: PassageVerse[];
  translation?: string;
  translationName?: string;
  provider?: string;
}

/**
 * Parse the verse selector portion of a reference (e.g. "3:16", "13:4-7",
 * "3:16,18") into a predicate that selects verse numbers, plus a starting
 * verse used for reader navigation. Returns null when no explicit verse
 * selector is present (whole chapter).
 */
function parseVerseSelector(reference: string): {
  matches: (verse: number) => boolean;
  firstVerse?: number;
} | null {
  const colonIdx = reference.lastIndexOf(":");
  if (colonIdx === -1) return null;
  const selectorPart = reference.slice(colonIdx + 1).trim();
  if (!selectorPart) return null;

  const wanted = new Set<number>();
  let firstVerse: number | undefined;

  for (const chunk of selectorPart.split(",")) {
    const piece = chunk.trim();
    if (!piece) continue;
    const rangeMatch = piece.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (Number.isFinite(start) && Number.isFinite(end)) {
        const lo = Math.min(start, end);
        const hi = Math.max(start, end);
        for (let v = lo; v <= hi; v++) wanted.add(v);
        if (firstVerse === undefined) firstVerse = lo;
      }
      continue;
    }
    const single = parseInt(piece, 10);
    if (Number.isFinite(single)) {
      wanted.add(single);
      if (firstVerse === undefined) firstVerse = single;
    }
  }

  if (wanted.size === 0) return null;
  return { matches: (verse: number) => wanted.has(verse), firstVerse };
}

async function fetchPassage(
  book: number,
  chapter: number,
  translation: string
): Promise<PassageResponse> {
  const baseUrl = getApiUrl();
  const url = new URL("/api/passage", baseUrl);
  url.searchParams.set("book", String(book));
  url.searchParams.set("chapter", String(chapter));
  url.searchParams.set("translation", translation);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Passage request failed (${res.status})`);
  }
  return (await res.json()) as PassageResponse;
}

function TranslationMeta({
  data,
  color,
}: {
  data: PassageResponse | DailyReflection | undefined;
  color: string;
}) {
  if (!data) return null;
  const label = data.translationName || data.translation;
  if (!label) return null;
  return (
    <Text style={[styles.translationMeta, { color, fontFamily: "Inter_400Regular" }]}>
      {label}
      {data.provider ? ` · ${data.provider}` : ""}
    </Text>
  );
}

function TopicVerseCard({
  verse,
  index,
  translation,
  isDark,
  theme,
  accentColor,
}: {
  verse: { reference: string; bookId: number; chapter: number };
  index: number;
  translation: string;
  isDark: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
  accentColor: string;
}) {
  // translation is a separate React Query key dimension so switching
  // translations refetches; duplicate (book/chapter/translation) keys dedupe.
  const { data, isLoading, isError, refetch } = useQuery<PassageResponse>({
    queryKey: ["/api/passage", verse.bookId, verse.chapter, translation],
    queryFn: () => fetchPassage(verse.bookId, verse.chapter, translation),
  });

  const selector = useMemo(() => parseVerseSelector(verse.reference), [verse.reference]);

  const selectedVerses = useMemo(() => {
    if (!data?.verses) return [];
    if (!selector) return data.verses;
    return data.verses.filter((v) => selector.matches(v.verse));
  }, [data, selector]);

  const combinedText = selectedVerses.map((v) => v.text).join(" ").trim();

  return (
    <Pressable
      onPress={() =>
        navigateToScriptureByParts(
          verse.bookId,
          verse.chapter,
          selector?.firstVerse,
          translation
        )
      }
      style={({ pressed }) => [
        styles.verseCard,
        { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.8 : 1 },
      ]}
      testID={`verse-card-${index}`}
    >
      <View style={styles.verseCardHeader}>
        <View style={[styles.verseRefBadge, { backgroundColor: accentColor + "18" }]}>
          <Text style={[styles.verseRef, { color: accentColor, fontFamily: "Inter_700Bold" }]}>
            {verse.reference}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </View>

      {isLoading ? (
        <View style={styles.verseStatusRow}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={[styles.verseStatusText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Loading verse...
          </Text>
        </View>
      ) : isError ? (
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); refetch(); }}
          style={styles.verseStatusRow}
          testID={`verse-card-${index}-retry`}
        >
          <Ionicons name="alert-circle-outline" size={16} color={theme.textMuted} />
          <Text style={[styles.verseStatusText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Couldn't load this verse. Tap to retry.
          </Text>
        </Pressable>
      ) : combinedText ? (
        <>
          <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]} numberOfLines={5}>
            {combinedText}
          </Text>
          <TranslationMeta data={data} color={theme.textMuted} />
        </>
      ) : (
        <Text style={[styles.verseStatusText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Verse text unavailable in this translation.
        </Text>
      )}
    </Pressable>
  );
}

export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();
  const { translation } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const topic = TOPICS[id ?? ""] ?? TOPICS.love;

  const { data: dailyReflection, isLoading: reflectionLoading } = useQuery<DailyReflection>({
    // translation is baked into the URL/query key so the reflection (and its
    // verse metadata) refetches when the active translation changes.
    queryKey: [`/api/topic-reflection/${id}?translation=${encodeURIComponent(translation)}`],
    enabled: !!id,
  });

  const todaySeed = useMemo(() => {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }, []);

  const shuffledVerses = useMemo(() => {
    const items = [...topic.verses];
    let seed = todaySeed + 31;
    for (let i = items.length - 1; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      const j = seed % (i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }, [id, todaySeed]);

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <Stack.Screen options={{ title: "", headerStyle: { backgroundColor: theme.background }, headerShadowVisible: false, headerTintColor: theme.text }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
        testID="topic-screen"
      >
        <LinearGradient
          colors={topic.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Ionicons name={topic.icon} size={40} color="rgba(255,255,255,0.9)" testID="topic-hero-icon" />
          <Text style={[styles.heroTitle, { fontFamily: "Lora_700Bold" }]}>{topic.title}</Text>
          <Text style={[styles.heroDesc, { fontFamily: "Inter_400Regular" }]}>{topic.description}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Text style={[styles.heroBadgeText, { fontFamily: "Inter_600SemiBold" }]}>{topic.verses.length} Verses</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={[styles.heroBadgeText, { fontFamily: "Inter_600SemiBold" }]}>Daily Refresh</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.reflectionSection}>
          <View style={styles.reflectionHeader}>
            <Ionicons name="sparkles" size={18} color={theme.accent} />
            <Text style={[styles.sectionLabel, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Today's Reflection
            </Text>
          </View>
          <Text style={[styles.dateLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {dateStr}
          </Text>

          {reflectionLoading ? (
            <View style={[styles.reflectionCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.reflectionLoading, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Generating today's reflection...
              </Text>
            </View>
          ) : dailyReflection ? (
            <>
              <View style={[styles.reflectionCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
                <Text style={[styles.reflectionText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                  {dailyReflection.reflection}
                </Text>
              </View>

              {dailyReflection.verseReference ? (
                <View style={[styles.reflectionCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
                  <View style={[styles.verseRefBadge, { backgroundColor: topic.gradient[0] + "18" }]}>
                    <Text style={[styles.verseRef, { color: topic.gradient[0], fontFamily: "Inter_700Bold" }]}>
                      {dailyReflection.verseReference}
                    </Text>
                  </View>
                  <Text style={[styles.dailyVerseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                    {dailyReflection.verseText}
                  </Text>
                  <TranslationMeta data={dailyReflection} color={theme.textMuted} />
                </View>
              ) : null}

              <View style={[styles.reflectionCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
                <View style={styles.challengeRow}>
                  <Ionicons name="help-circle" size={16} color={theme.accent} />
                  <Text style={[styles.challengeLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                    Discussion Question
                  </Text>
                </View>
                <Text style={[styles.reflectionText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                  {dailyReflection.question}
                </Text>
              </View>

              <View style={[styles.reflectionCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
                <View style={styles.challengeRow}>
                  <Ionicons name="flash" size={16} color="#E65100" />
                  <Text style={[styles.challengeLabel, { color: "#E65100", fontFamily: "Inter_600SemiBold" }]}>
                    Today's Challenge
                  </Text>
                </View>
                <Text style={[styles.reflectionText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                  {dailyReflection.challenge}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.versesSection}>
          <Text style={[styles.sectionLabel, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Scripture
          </Text>
          {shuffledVerses.map((v, i) => (
            <TopicVerseCard
              key={`${v.reference}-${i}`}
              verse={v}
              index={i}
              translation={translation}
              isDark={isDark}
              theme={theme}
              accentColor={topic.gradient[0]}
            />
          ))}
        </View>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    marginHorizontal: 22,
    marginTop: 8,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  heroTitle: { color: "#fff", fontSize: 32 },
  heroDesc: { color: "rgba(255,255,255,0.85)", fontSize: 15, lineHeight: 22, textAlign: "center" },
  heroBadgeRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  heroBadgeText: { color: "#fff", fontSize: 12 },
  reflectionSection: {
    paddingHorizontal: 22,
    paddingTop: 24,
    gap: 10,
  },
  reflectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateLabel: { fontSize: 12, marginTop: -4, marginBottom: 4 },
  reflectionCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  reflectionText: { fontSize: 15, lineHeight: 24 },
  reflectionLoading: { fontSize: 13, textAlign: "center" },
  dailyVerseText: { fontSize: 16, lineHeight: 26, fontStyle: "italic" },
  challengeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  challengeLabel: { fontSize: 13 },
  versesSection: {
    paddingHorizontal: 22,
    paddingTop: 24,
    gap: 12,
  },
  sectionLabel: { fontSize: 22, marginBottom: 4 },
  sectionSubLabel: { fontSize: 13, marginBottom: 8, marginTop: -4 },
  verseCard: {
    borderRadius: 18,
    padding: 18,
  },
  verseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  verseRefBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  verseRef: { fontSize: 13 },
  verseText: { fontSize: 16, lineHeight: 26 },
  translationMeta: { fontSize: 11, marginTop: 8, letterSpacing: 0.3 },
  verseStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  verseStatusText: { fontSize: 13, flex: 1 },
  mediaSection: {
    paddingHorizontal: 22,
    paddingTop: 28,
    gap: 10,
  },
  mediaCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  speakerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  speakerInitials: {
    color: "#fff",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  mediaInfo: { flex: 1, gap: 2 },
  mediaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mediaTitle: { fontSize: 15, flex: 1 },
  mediaTypeBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mediaTypeText: { fontSize: 10 },
  mediaSource: { fontSize: 12 },
  mediaDesc: { fontSize: 11, lineHeight: 16 },
});
