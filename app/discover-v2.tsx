// Discover v2 — Path B Brief 05. Hidden route, reached only via the preview
// pill on the interim search screen until Joe approves the swap.
// Colour discipline (§A.3): ONE gradient (Featured Series). No coral except
// active tab. Category tokens carry the colour story — no freelance colours.
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HV2, F } from "@/components/home-v2/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/context/TranslationContext";
import { apiRequest } from "@/lib/query-client";

// ---- Screen tokens ----
const D = {
  surface: HV2.surface, // #FBF7EE
  card: "#FFFFFF",
  ink: HV2.ink, // #1F1A12
  inkMuted: HV2.inkMutedText, // #6B6660 (WCAG-safe on cream)
  border: "rgba(31,26,18,0.08)",
  teal: "#1F7A70",
  gold: HV2.gold ?? "#C9933A",
};

// Category tokens for the 9 Signposts categories — pastel tint + WCAG-safe ink.
// Reuses the established Path B pastel family (plans tints + home chips).
const SIGNPOST_CATEGORY_TOKENS: Record<string, { tint: string; ink: string }> = {
  "Emotions & Struggles": { tint: "#FCE1EC", ink: "#A02A62" },
  "Relationships": { tint: "#DDF0FB", ink: "#175F94" },
  "Faith & Belief": { tint: "#EAE6FA", ink: "#5A41B8" },
  "Character & Growth": { tint: "#E7F2DF", ink: "#3E6B2A" },
  "Life Circumstances": { tint: "#FDE8E4", ink: "#A63A28" },
  "God's Nature": { tint: "#FFF0D9", ink: "#8A5A10" },
  "Spiritual Practices": { tint: "#DFF6F2", ink: "#14655D" },
  "Social & Moral Issues": { tint: "#E4E9F5", ink: "#3A4E8C" },
  "Adventist Doctrines": { tint: "#F0E6F2", ink: "#7A3E86" },
};
const DEFAULT_CAT_TOKEN = { tint: "#EAE6FA", ink: "#5A41B8" };

// Per-topic icons — carried over from the existing touchpoints screen so tiles
// keep their established iconography.
const TOPIC_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  abandonment: "heart", addiction: "heart", anger: "heart", anxiety: "heart",
  forgiveness: "people", grief: "heart", loneliness: "heart", purpose: "book",
  fear: "heart", marriage: "people", patience: "trending-up", temptation: "trending-up",
  suffering: "globe", gratitude: "flame", prayer: "flame", identity: "book",
  contentment: "trending-up", integrity: "trending-up", doubt: "book", generosity: "flame",
  depression: "heart", trust: "book", humility: "trending-up", parenting: "people",
  hope: "book", sabbath: "flame", justice: "scale", work: "globe",
  sanctuary: "shield-checkmark", "second-coming": "shield-checkmark",
  "three-angels": "shield-checkmark", "health-message": "shield-checkmark",
  "state-of-dead": "shield-checkmark", stewardship: "flame",
  "great-controversy": "shield-checkmark", "serving-others": "trending-up",
  fasting: "flame", baptism: "shield-checkmark", discipleship: "book",
  "gods-love": "sunny", "gods-grace": "sunny", "the-trinity": "sunny",
};

// Top-8 quick-access chip rail above the grid (§A.2.3, optional rail — included).
const TOP_TOPIC_IDS = ["anxiety", "hope", "prayer", "forgiveness", "grief", "sabbath", "purpose", "gods-grace"];

// Featured Series (§A.2.2) — the screen's ONE gradient. The Great Controversy
// set is NOT SS-linked, so it uses its own category token (Adventist Doctrines
// plum), not teal.
const FEATURED_GRADIENT = ["#5E2F68", "#7A3E86"] as const;
const FEATURED_SERIES = {
  title: "The Great Controversy",
  oneLiner: "The cosmic conflict between Christ and Satan — from Lucifer's rebellion to sin's final end.",
  episodes: 4,
  firstYoutubeId: "LF6pjueQsHI",
};

// Watch rail (§A.2.4) — existing video assignments only. CANONICAL SOURCE:
// server/data/bibleProjectVideos.ts — ids/youtubeIds/durations copied from
// there; if that catalog changes, update this curated rail to match.
// All videos route to YouTube per the existing rule.
const WATCH_RAIL: { id: string; title: string; source: string; minutes: number; youtubeId: string; tint: string; ink: string }[] = [
  { id: "gc-origin-of-evil", title: "The Origin of Evil", source: "SDA Church", minutes: 9, youtubeId: "fQ93yx7EPyM", tint: "#F0E6F2", ink: "#7A3E86" },
  { id: "bp-hope", title: "Hope", source: "BibleProject", minutes: 6, youtubeId: "Lb4dOM4-FVM", tint: "#DDF0FB", ink: "#175F94" },
  { id: "bp-shalom-peace", title: "Shalom — Peace", source: "BibleProject", minutes: 6, youtubeId: "oMhesKPKQPo", tint: "#DFF6F2", ink: "#14655D" },
  { id: "bp-forgiveness", title: "Forgiveness", source: "BibleProject", minutes: 6, youtubeId: "s-b_RbKvGAk", tint: "#E7F2DF", ink: "#3E6B2A" },
  { id: "gc-impending-conflict", title: "The Impending Conflict", source: "SDA Church", minutes: 10, youtubeId: "m7T4zHy0VUw", tint: "#F0E6F2", ink: "#7A3E86" },
  { id: "bp-justice", title: "Justice", source: "BibleProject", minutes: 6, youtubeId: "A14THPoc4-4", tint: "#E4E9F5", ink: "#3A4E8C" }, // 5:48 → 6
];

// Translations are fetched live from /api/translations — we never hardcode a
// fixed list (that would risk showing an entry the backend cannot serve, or
// inventing one like NKJV that requires entitlement verification).
interface TranslationOption {
  id: string;
  abbreviation: string;
  name?: string;
  available?: boolean;
}

const QUICK_REFS = [
  { label: "John 3:16", subtitle: "Popular passage" },
  { label: "Psalm 23", subtitle: "Popular chapter" },
  { label: "Romans 8:28", subtitle: "Popular passage" },
  { label: "Genesis 1", subtitle: "Popular chapter" },
  { label: "Philippians 4:13", subtitle: "Popular passage" },
  { label: "Jeremiah 29:11", subtitle: "Popular passage" },
];

interface SearchResult {
  id: string; bookId: number; chapter: number; verse: number;
  text: string; bookName: string; bookAbbreviation: string;
}
interface SearchResponse { results: SearchResult[]; total: number; returned: number }
interface ReferenceResponse { isReference: boolean; bookId?: number; bookName?: string; chapter?: number; verse?: number | null }
interface TouchpointsResponse {
  categories: string[];
  topics: { id: string; title: string; category: string; questionCount?: number }[];
}
interface DevotionalPlan { id: string; title: string; description: string; totalDays: number; theme: string | null; category: string | null }
interface OdbDevotional { id: number; title: string; date: string; author: string }

const SAVED_SERIES_KEY = "gtf-discover-saved-series";

export default function DiscoverV2Screen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ topic?: string }>();
  const userId = user?.id ?? "";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const scrollRef = useRef<ScrollView>(null);
  const gridY = useRef(0);

  // ---- Search state (parity with interim screen) ----
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const { translation: contextTranslation, setTranslation: setContextTranslation } = useTranslation();
  const inputRef = useRef<TextInput>(null);

  // ---- Available translations (live) ----
  const { data: translationsData } = useQuery<TranslationOption[]>({
    queryKey: ["/api/translations"],
    staleTime: 1000 * 60 * 10,
  });
  // Only translations the backend reports as available may be selected.
  const availableTranslations = useMemo(
    () =>
      (translationsData ?? [])
        .filter((t) => t.available !== false && !!t.abbreviation)
        .map((t) => t.abbreviation.toUpperCase()),
    [translationsData]
  );
  // Is the globally-selected translation actually serveable right now?
  const selectedIsAvailable =
    availableTranslations.length === 0 // list not loaded yet: don't block
      ? true
      : availableTranslations.includes(contextTranslation.toUpperCase());
  // The translation we actually query with. Keep the global value if available;
  // otherwise DO NOT silently switch — we gate search below with an explicit
  // unavailable state instead.
  const translation = contextTranslation.toUpperCase();
  const setTranslation = (t: string) => setContextTranslation(t);

  const { data: refData } = useQuery<ReferenceResponse>({
    queryKey: ["/api/search/reference", { q: activeQuery }],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/search/reference?q=${encodeURIComponent(activeQuery)}`
      );
      return res.json();
    },
    enabled: activeQuery.length > 0,
  });
  const { data: searchData, isLoading: searchLoading, error: searchError } = useQuery<SearchResponse>({
    // translation is a distinct key element so results refetch when it changes
    queryKey: ["/api/search", { q: activeQuery, translation, limit: 50 }],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/search?q=${encodeURIComponent(activeQuery)}&translation=${encodeURIComponent(translation)}&limit=50`
      );
      return res.json();
    },
    // Never fire result requests for an unavailable translation.
    enabled: activeQuery.length > 0 && !refData?.isReference && selectedIsAvailable,
  });

  // ---- Content data ----
  const { data: touchpoints, isLoading: topicsLoading } = useQuery<TouchpointsResponse>({
    queryKey: ["/api/touchpoints"],
  });
  const { data: devotionalPlans } = useQuery<DevotionalPlan[]>({ queryKey: ["/api/devotionals/plans"] });
  const { data: odbRecent } = useQuery<OdbDevotional[]>({ queryKey: ["/api/odb/recent?count=7"] });
  const { data: weeklyStreak } = useQuery<{ currentStreak: number }>({
    queryKey: [`/api/reading-streaks/weekly?userId=${userId}`],
    enabled: !!userId,
  });
  const streak = weeklyStreak?.currentStreak ?? 0;

  const [seriesSaved, setSeriesSaved] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(SAVED_SERIES_KEY).then((v) => setSeriesSaved(v === "1")).catch(() => {});
  }, []);
  const toggleSaveSeries = useCallback(() => {
    setSeriesSaved((prev) => {
      const next = !prev;
      AsyncStorage.setItem(SAVED_SERIES_KEY, next ? "1" : "0").catch(() => {});
      return next;
    });
  }, []);

  const topics = touchpoints?.topics ?? [];
  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);
  const topTopics = useMemo(
    () => TOP_TOPIC_IDS.map((id) => topicById.get(id)).filter(Boolean) as typeof topics,
    [topicById],
  );

  // Deep link: /(tabs)/search?topic=X (also works as /discover-v2?topic=X) —
  // opens the topic directly (§A.2.3). Home chips use this.
  const handledTopicParam = useRef<string | null>(null);
  useEffect(() => {
    const t = typeof params.topic === "string" ? params.topic : undefined;
    if (!t || topics.length === 0 || handledTopicParam.current === t) return;
    handledTopicParam.current = t;
    const match =
      topicById.get(t.toLowerCase()) ??
      topics.find((x) => x.title.toLowerCase() === t.toLowerCase());
    if (match) {
      router.push(`/touchpoint-topic?topicId=${match.id}` as any);
    } else {
      // Unknown topic → scroll to the grid so the user can browse.
      scrollRef.current?.scrollTo({ y: gridY.current, animated: true });
    }
  }, [params.topic, topics, topicById]);

  // ---- Handlers ----
  const performSearch = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setActiveQuery(trimmed);
  }, []);
  const clearSearch = useCallback(() => {
    setQuery("");
    setActiveQuery("");
    setSearchFocused(false);
    inputRef.current?.blur();
  }, []);
  const openTopic = useCallback((topicId: string) => {
    router.push(`/touchpoint-topic?topicId=${topicId}` as any);
  }, []);
  const openVideo = useCallback((youtubeId: string) => {
    // Existing rule: videos open on YouTube (touchpoint-topic behaviour).
    Linking.openURL(`https://www.youtube.com/watch?v=${youtubeId}`).catch(() => {});
  }, []);

  // Search mode engages on focus (parity with interim screen: translation
  // pills + popular passages are visible BEFORE a search is submitted).
  const searching = activeQuery.length > 0 || searchFocused;

  const highlight = useCallback((text: string, term: string) => {
    if (!term) return <Text>{text}</Text>;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const splitRegex = new RegExp(`(${escaped})`, "gi");
    const testRegex = new RegExp(`^${escaped}$`, "i");
    return (
      <Text>
        {text.split(splitRegex).map((part, i) =>
          testRegex.test(part) ? (
            <Text key={i} style={{ fontFamily: F.interBold, color: D.ink }}>{part}</Text>
          ) : (
            <Text key={i}>{part}</Text>
          ),
        )}
      </Text>
    );
  }, []);

  return (
    <View style={s.container}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ---- Header (§A.2.1) ---- */}
        <View style={s.headerRow}>
          <Text style={s.title}>Discover</Text>
          <View style={{ flex: 1 }} />
          <View style={s.streakPill} accessibilityLabel={`${streak} day reading streak`}>
            {/* Gold appears exactly once: the streak flame */}
            <Ionicons name="flame" size={14} color={D.gold} />
            <Text style={s.streakCount}>{streak}</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/profile" as any)}
            style={s.avatar}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Text style={s.avatarInitial}>{(user?.displayName?.[0] ?? "G").toUpperCase()}</Text>
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={18} color={D.inkMuted} />
            <TextInput
              ref={inputRef}
              style={s.searchInput}
              placeholder="Search topics, verses, videos…"
              placeholderTextColor={D.inkMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => performSearch(query)}
              onFocus={() => setSearchFocused(true)}
              returnKeyType="search"
              autoCorrect={false}
              testID="discover2-search-input"
            />
            {query.length > 0 && (
              <Pressable onPress={clearSearch} hitSlop={8} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={D.inkMuted} />
              </Pressable>
            )}
          </View>

          {/* Ask the Bible — prominent entry directly under the search bar */}
          <Pressable
            onPress={() => router.push("/semantic-search" as any)}
            style={({ pressed }) => [s.askRow, { opacity: pressed ? 0.85 : 1 }]}
            testID="discover2-ask-bible"
            accessibilityRole="button"
          >
            <View style={s.askIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#175F94" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.askTitle}>Ask the Bible</Text>
              <Text style={s.askSub}>Search with natural language</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={D.inkMuted} />
          </Pressable>
        </View>

        {/* ---- Search mode: results replace the browse content ---- */}
        {searching ? (
          <View style={s.searchResults}>
            {/* Translation scope pills — only backend-available entries. */}
            <View style={s.translationRow}>
              {availableTranslations.map((t) => {
                const active = translation === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setTranslation(t)}
                    style={[s.translationPill, active && s.translationPillActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[s.translationText, active && s.translationTextActive]}>{t}</Text>
                  </Pressable>
                );
              })}
              <View style={{ flex: 1 }} />
              <Pressable onPress={clearSearch} hitSlop={8}>
                <Text style={s.cancelSearch}>Cancel</Text>
              </Pressable>
            </View>

            {!selectedIsAvailable ? (
              <Text style={s.searchEmpty}>
                {translation} is not available right now. Choose another translation above to search.
              </Text>
            ) : refData?.isReference && refData.bookId ? (
              <Pressable
                onPress={() => router.push(`/read/${refData.bookId}/${refData.chapter}?translation=${translation}` as any)}
                style={({ pressed }) => [s.refCard, { opacity: pressed ? 0.85 : 1 }]}
                testID="discover2-reference-card"
              >
                <Ionicons name="book-outline" size={20} color="#175F94" />
                <View style={{ flex: 1 }}>
                  <Text style={s.refTitle}>
                    {refData.bookName} {refData.chapter}
                    {refData.verse ? `:${refData.verse}` : ""}
                  </Text>
                  <Text style={s.refSub}>Open in reader</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={D.inkMuted} />
              </Pressable>
            ) : searchLoading ? (
              <ActivityIndicator color={D.teal} style={{ marginTop: 32 }} />
            ) : searchError ? (
              <Text style={s.searchEmpty}>Something went wrong searching. Try again.</Text>
            ) : searchData && searchData.results.length === 0 ? (
              <Text style={s.searchEmpty}>No results for “{activeQuery}” in {translation}.</Text>
            ) : searchData ? (
              <>
                <Text style={s.resultCount}>
                  {searchData.total} result{searchData.total === 1 ? "" : "s"}
                  {searchData.total > searchData.returned ? ` · showing ${searchData.returned}` : ""}
                </Text>
                {searchData.results.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => router.push(`/read/${r.bookId}/${r.chapter}?translation=${translation}` as any)}
                    style={({ pressed }) => [s.resultRow, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    <Text style={s.resultRef}>
                      {r.bookName} {r.chapter}:{r.verse}
                    </Text>
                    <Text style={s.resultText} numberOfLines={3}>
                      {highlight(r.text, activeQuery)}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : null}

            {/* Popular passages before a search is submitted (parity) */}
            {!refData?.isReference && !searchData && !searchLoading && (
              <View style={{ gap: 8, marginTop: 8 }}>
                {QUICK_REFS.map((q) => (
                  <Pressable
                    key={q.label}
                    onPress={() => { setQuery(q.label); performSearch(q.label); }}
                    style={({ pressed }) => [s.quickRef, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    <Text style={s.quickRefLabel}>{q.label}</Text>
                    <Text style={s.quickRefSub}>{q.subtitle}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : (
          <>
            {/* ---- Featured Series — the ONE gradient (§A.2.2) ---- */}
            <View style={s.featuredWrap}>
              <LinearGradient colors={[...FEATURED_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.featured}>
                <Text style={s.featuredEyebrow}>FEATURED SERIES</Text>
                <View style={s.episodeChip}>
                  <Text style={s.episodeChipText}>{FEATURED_SERIES.episodes} EPISODES</Text>
                </View>
                <Text style={s.featuredTitle}>{FEATURED_SERIES.title}</Text>
                <Text style={s.featuredSub}>{FEATURED_SERIES.oneLiner}</Text>
                <View style={s.featuredBtnRow}>
                  <Pressable
                    onPress={() => openVideo(FEATURED_SERIES.firstYoutubeId)}
                    style={({ pressed }) => [s.featuredBtn, { opacity: pressed ? 0.85 : 1 }]}
                    testID="discover2-featured-watch"
                  >
                    <Ionicons name="play" size={14} color="#7A3E86" />
                    <Text style={s.featuredBtnText}>Watch</Text>
                  </Pressable>
                  <Pressable
                    onPress={toggleSaveSeries}
                    style={({ pressed }) => [s.featuredBtnGhost, { opacity: pressed ? 0.85 : 1 }]}
                    testID="discover2-featured-save"
                  >
                    <Ionicons name={seriesSaved ? "bookmark" : "bookmark-outline"} size={14} color="#FFFFFF" />
                    <Text style={s.featuredBtnGhostText}>{seriesSaved ? "Saved" : "Save"}</Text>
                  </Pressable>
                </View>
              </LinearGradient>
            </View>

            {/* ---- Browse Topics — the Signposts grid (§A.2.3, centrepiece) ---- */}
            <View
              style={s.section}
              onLayout={(e) => { gridY.current = e.nativeEvent.layout.y; }}
            >
              <Text style={s.sectionTitle}>Browse Topics</Text>
              <Text style={s.sectionSub}>44 topics for whatever you{"\u2019"}re carrying</Text>

              {topTopics.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRail}>
                  {topTopics.map((t) => {
                    const tok = SIGNPOST_CATEGORY_TOKENS[t.category] ?? DEFAULT_CAT_TOKEN;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => openTopic(t.id)}
                        style={[s.topicChip, { backgroundColor: tok.tint }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${t.title}`}
                      >
                        <Text style={[s.topicChipText, { color: tok.ink }]}>{t.title}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {topicsLoading ? (
                <ActivityIndicator color={D.teal} style={{ marginTop: 24 }} />
              ) : (
                <View style={s.grid}>
                  {topics.map((t) => {
                    const tok = SIGNPOST_CATEGORY_TOKENS[t.category] ?? DEFAULT_CAT_TOKEN;
                    const icon = TOPIC_ICONS[t.id] ?? "book";
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => openTopic(t.id)}
                        style={({ pressed }) => [s.topicTile, { backgroundColor: tok.tint, opacity: pressed ? 0.85 : 1 }]}
                        testID={`discover2-topic-${t.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Open topic ${t.title}`}
                      >
                        <View style={[s.topicIconWrap, { backgroundColor: "rgba(255,255,255,0.6)" }]}>
                          <Ionicons name={icon} size={18} color={tok.ink} />
                        </View>
                        <Text style={s.topicTitle} numberOfLines={2}>{t.title}</Text>
                        <Text style={[s.topicCat, { color: tok.ink }]} numberOfLines={1}>{t.category}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ---- Watch rail (§A.2.4) ---- */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Watch</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
                {WATCH_RAIL.map((v) => (
                  <Pressable
                    key={v.id}
                    onPress={() => openVideo(v.youtubeId)}
                    style={({ pressed }) => [s.videoCard, { opacity: pressed ? 0.85 : 1 }]}
                    testID={`discover2-video-${v.id}`}
                  >
                    <View style={[s.videoThumb, { backgroundColor: v.tint }]}>
                      <View style={s.playBadge}>
                        <Ionicons name="play" size={16} color={v.ink} />
                      </View>
                      <View style={[s.videoChip, { backgroundColor: "rgba(255,255,255,0.75)" }]}>
                        <Text style={[s.videoChipText, { color: v.ink }]}>VIDEO · {v.minutes} MIN</Text>
                      </View>
                    </View>
                    <Text style={s.videoTitle} numberOfLines={2}>{v.title}</Text>
                    <Text style={s.videoSource} numberOfLines={1}>{v.source}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* ---- Daily Devotionals rail (§A.2.5) ---- */}
            {((devotionalPlans?.length ?? 0) > 0 || (odbRecent?.length ?? 0) > 0) && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Daily Devotionals</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
                  {(devotionalPlans ?? []).map((dp) => {
                    const isEgw = `${dp.title} ${dp.theme ?? ""} ${dp.category ?? ""}`.toLowerCase().includes("egw")
                      || `${dp.title} ${dp.theme ?? ""}`.toLowerCase().includes("ellen");
                    const tint = isEgw ? "#FFF0D9" : "#EAE6FA";
                    const ink = isEgw ? "#8A5A10" : "#5A41B8";
                    return (
                      <Pressable
                        key={dp.id}
                        onPress={() => router.push(`/devotional-day?planId=${dp.id}&depth=quick` as any)}
                        style={({ pressed }) => [s.devoCard, { backgroundColor: tint, opacity: pressed ? 0.85 : 1 }]}
                      >
                        <Text style={[s.devoEyebrow, { color: ink }]}>{isEgw ? "EGW DEVOTIONAL" : "DEVOTIONAL"}</Text>
                        <Text style={s.devoTitle} numberOfLines={2}>{dp.title}</Text>
                        <Text style={s.devoMeta} numberOfLines={1}>{dp.totalDays} days</Text>
                      </Pressable>
                    );
                  })}
                  {(odbRecent ?? []).slice(0, 3).map((d) => (
                    <Pressable
                      key={`odb-${d.id}`}
                      onPress={() => router.push({ pathname: "/odb-devotional" as any, params: { id: String(d.id) } })}
                      style={({ pressed }) => [s.devoCard, { backgroundColor: "#DDF0FB", opacity: pressed ? 0.85 : 1 }]}
                    >
                      <Text style={[s.devoEyebrow, { color: "#175F94" }]}>OUR DAILY BREAD</Text>
                      <Text style={s.devoTitle} numberOfLines={2}>{d.title}</Text>
                      <Text style={s.devoMeta} numberOfLines={1}>{d.author}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ---- Ways to Study (§A.2.6) ---- */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Ways to Study</Text>
              <View style={{ gap: 10, marginTop: 12 }}>
                <StudyRow
                  icon="compass-outline"
                  tint="#DFF6F2"
                  ink="#14655D"
                  title="Guided Study"
                  sub="Walked through observation, meaning, and response"
                  onPress={() => router.push("/study-guide" as any)}
                  testID="discover2-study-guided"
                />
                <StudyRow
                  icon="layers-outline"
                  tint="#E4E9F5"
                  ink="#3A4E8C"
                  title="Deep Dive"
                  sub="Explore a chapter across history, language, and meaning"
                  onPress={() => router.push("/deep-study-picker-v2" as any)}
                  testID="discover2-study-deep"
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StudyRow({ icon, tint, ink, title, sub, onPress, testID }: {
  icon: keyof typeof Ionicons.glyphMap; tint: string; ink: string;
  title: string; sub: string; onPress: () => void; testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.studyRow, { opacity: pressed ? 0.85 : 1 }]}
      testID={testID}
      accessibilityRole="button"
    >
      <View style={[s.studyIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.studyTitle}>{title}</Text>
        <Text style={s.studySub} numberOfLines={1}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={D.inkMuted} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.surface },

  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 10 },
  title: { fontFamily: F.loraSemi, fontSize: 26, color: D.ink },
  streakPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: D.card, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
    ...HV2.rowShadow,
  },
  streakCount: { fontFamily: F.interSemi, fontSize: 13, color: D.ink },
  avatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: "#E8604C",
    alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontFamily: F.interSemi, fontSize: 15, color: "#FFFFFF" },

  searchWrap: { paddingHorizontal: 20, marginTop: 14, gap: 10 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: D.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: D.border,
  },
  searchInput: { flex: 1, fontFamily: F.inter, fontSize: 15, color: D.ink, padding: 0 },
  askRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: D.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    ...HV2.rowShadow,
  },
  askIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#DDF0FB",
    alignItems: "center", justifyContent: "center",
  },
  askTitle: { fontFamily: F.interSemi, fontSize: 14.5, color: D.ink },
  askSub: { fontFamily: F.inter, fontSize: 12.5, color: D.inkMuted, marginTop: 1 },

  // Search mode
  searchResults: { paddingHorizontal: 20, marginTop: 16, gap: 10 },
  translationRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  translationPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: D.card, borderWidth: 1, borderColor: D.border,
  },
  translationPillActive: { backgroundColor: D.teal, borderColor: D.teal },
  translationText: { fontFamily: F.interSemi, fontSize: 12.5, color: D.inkMuted },
  translationTextActive: { color: "#FFFFFF" },
  cancelSearch: { fontFamily: F.interSemi, fontSize: 13, color: D.teal },
  refCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: D.card, borderRadius: 16, padding: 14, ...HV2.rowShadow,
  },
  refTitle: { fontFamily: F.loraSemi, fontSize: 16, color: D.ink },
  refSub: { fontFamily: F.inter, fontSize: 12.5, color: D.inkMuted, marginTop: 1 },
  resultCount: { fontFamily: F.interMed, fontSize: 12.5, color: D.inkMuted },
  resultRow: { backgroundColor: D.card, borderRadius: 16, padding: 14, gap: 4, ...HV2.rowShadow },
  resultRef: { fontFamily: F.interSemi, fontSize: 13, color: D.teal },
  resultText: { fontFamily: F.inter, fontSize: 14, color: D.ink, lineHeight: 20 },
  searchEmpty: { fontFamily: F.inter, fontSize: 14, color: D.inkMuted, textAlign: "center", marginTop: 32 },
  quickRef: { backgroundColor: D.card, borderRadius: 16, padding: 14, ...HV2.rowShadow },
  quickRefLabel: { fontFamily: F.interSemi, fontSize: 14, color: D.ink },
  quickRefSub: { fontFamily: F.inter, fontSize: 12.5, color: D.inkMuted, marginTop: 2 },

  // Featured
  featuredWrap: { paddingHorizontal: 20, marginTop: 22, borderRadius: 28, ...HV2.cardShadow },
  featured: { borderRadius: 28, padding: 22, overflow: "hidden" },
  featuredEyebrow: { fontFamily: F.interBold, fontSize: 11, letterSpacing: 1.2, color: "rgba(255,255,255,0.85)" },
  episodeChip: {
    alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.22)", borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 10,
  },
  episodeChipText: { fontFamily: F.interSemi, fontSize: 11, color: "#FFFFFF", letterSpacing: 0.6 },
  featuredTitle: { fontFamily: F.loraBold, fontSize: 24, color: "#FFFFFF", marginTop: 8 },
  featuredSub: { fontFamily: F.inter, fontSize: 13.5, lineHeight: 19, color: "rgba(255,255,255,0.92)", marginTop: 6 },
  featuredBtnRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  featuredBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFFFF",
    borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10,
  },
  featuredBtnText: { fontFamily: F.interSemi, fontSize: 13.5, color: "#7A3E86" },
  featuredBtnGhost: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10,
  },
  featuredBtnGhostText: { fontFamily: F.interSemi, fontSize: 13.5, color: "#FFFFFF" },

  // Sections
  section: { marginTop: 28, paddingHorizontal: 20 },
  sectionTitle: { fontFamily: F.loraSemi, fontSize: 19, color: D.ink },
  sectionSub: { fontFamily: F.inter, fontSize: 13, color: D.inkMuted, marginTop: 3 },

  chipRail: { flexDirection: "row", gap: 8, marginTop: 14, paddingRight: 8 },
  topicChip: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  topicChipText: { fontFamily: F.interSemi, fontSize: 13 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14 },
  topicTile: {
    width: "47.8%", borderRadius: 20, padding: 14, gap: 8, ...HV2.rowShadow,
  },
  topicIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  topicTitle: { fontFamily: F.interSemi, fontSize: 14.5, color: D.ink, lineHeight: 19 },
  topicCat: { fontFamily: F.interMed, fontSize: 11.5 },

  rail: { flexDirection: "row", gap: 12, marginTop: 14, paddingRight: 8 },
  videoCard: { width: 180 },
  videoThumb: {
    height: 100, borderRadius: 16, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
  },
  playBadge: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center", justifyContent: "center",
  },
  videoChip: {
    position: "absolute", left: 8, bottom: 8, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  videoChipText: { fontFamily: F.interSemi, fontSize: 10, letterSpacing: 0.4 },
  videoTitle: { fontFamily: F.interSemi, fontSize: 13.5, color: D.ink, marginTop: 8, lineHeight: 18 },
  videoSource: { fontFamily: F.inter, fontSize: 12, color: D.inkMuted, marginTop: 2 },

  devoCard: { width: 190, borderRadius: 20, padding: 16, gap: 6 },
  devoEyebrow: { fontFamily: F.interBold, fontSize: 10, letterSpacing: 1 },
  devoTitle: { fontFamily: F.interSemi, fontSize: 14.5, color: D.ink, lineHeight: 19 },
  devoMeta: { fontFamily: F.inter, fontSize: 12, color: D.inkMuted },

  studyRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: D.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13,
    ...HV2.rowShadow,
  },
  studyIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  studyTitle: { fontFamily: F.interSemi, fontSize: 14.5, color: D.ink },
  studySub: { fontFamily: F.inter, fontSize: 12.5, color: D.inkMuted, marginTop: 1 },
});
