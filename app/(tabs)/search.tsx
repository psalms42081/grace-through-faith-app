import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";

const TRANSLATIONS = ["KJV", "ASV", "WEB"] as const;
type Translation = (typeof TRANSLATIONS)[number];

const TOPIC_CHIPS = [
  { label: "Love", icon: "heart-outline" as const, color: "#E8475F", bgLight: "rgba(232,71,95,0.12)", bgDark: "rgba(232,71,95,0.18)" },
  { label: "Faith", icon: "shield-outline" as const, color: "#5B8DEF", bgLight: "rgba(91,141,239,0.12)", bgDark: "rgba(91,141,239,0.18)" },
  { label: "Grace", icon: "sparkles-outline" as const, color: "#C9933A", bgLight: "rgba(201,147,58,0.12)", bgDark: "rgba(201,147,58,0.18)" },
  { label: "Hope", icon: "sunny-outline" as const, color: "#E8A838", bgLight: "rgba(232,168,56,0.12)", bgDark: "rgba(232,168,56,0.18)" },
  { label: "Wisdom", icon: "bulb-outline" as const, color: "#9B6DD7", bgLight: "rgba(155,109,215,0.12)", bgDark: "rgba(155,109,215,0.18)" },
  { label: "Prayer", icon: "hand-left-outline" as const, color: "#4ECCA3", bgLight: "rgba(78,204,163,0.12)", bgDark: "rgba(78,204,163,0.18)" },
  { label: "Peace", icon: "water-outline" as const, color: "#6AABEF", bgLight: "rgba(106,171,239,0.12)", bgDark: "rgba(106,171,239,0.18)" },
  { label: "Courage", icon: "flag-outline" as const, color: "#7C4DFF", bgLight: "rgba(124,77,255,0.12)", bgDark: "rgba(124,77,255,0.18)" },
  { label: "Joy", icon: "sparkles-outline" as const, color: "#F9A825", bgLight: "rgba(249,168,37,0.12)", bgDark: "rgba(249,168,37,0.18)" },
  { label: "Comfort", icon: "heart-half-outline" as const, color: "#FF6B35", bgLight: "rgba(255,107,53,0.12)", bgDark: "rgba(255,107,53,0.18)" },
  { label: "Strength", icon: "fitness-outline" as const, color: "#E65100", bgLight: "rgba(230,81,0,0.12)", bgDark: "rgba(230,81,0,0.18)" },
  { label: "Forgiveness", icon: "refresh-outline" as const, color: "#2E7D32", bgLight: "rgba(46,125,50,0.12)", bgDark: "rgba(46,125,50,0.18)" },
];

const QUICK_REFS = [
  { label: "John 3:16", subtitle: "For God so loved..." },
  { label: "Psalm 23", subtitle: "The Lord is my shepherd..." },
  { label: "Romans 8:28", subtitle: "All things work together..." },
  { label: "Genesis 1", subtitle: "In the beginning..." },
  { label: "Philippians 4:13", subtitle: "I can do all things..." },
  { label: "Jeremiah 29:11", subtitle: "Plans to prosper you..." },
];

interface SearchResult {
  id: string;
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
  bookName: string;
  bookAbbreviation: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  returned: number;
}

interface ReferenceResponse {
  isReference: boolean;
  bookId?: number;
  bookName?: string;
  chapter?: number;
  verse?: number | null;
}

export default function SearchScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [translation, setTranslation] = useState<Translation>("KJV");
  const inputRef = useRef<TextInput>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: refData } = useQuery<ReferenceResponse>({
    queryKey: [`/api/search/reference?q=${encodeURIComponent(activeQuery)}`],
    enabled: activeQuery.length > 0,
  });

  const { data: searchData, isLoading: searchLoading, error: searchError } = useQuery<SearchResponse>({
    queryKey: [`/api/search?q=${encodeURIComponent(activeQuery)}&translation=${translation}&limit=50`],
    enabled: activeQuery.length > 0 && !refData?.isReference,
  });

  const performSearch = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setActiveQuery(trimmed);
    Keyboard.dismiss();
  }, []);

  const handleTopicPress = useCallback((label: string) => {
    const topicId = label.toLowerCase();
    router.push(`/topic/${topicId}`);
  }, []);

  const handleSuggestion = useCallback((label: string) => {
    setQuery(label);
    performSearch(label);
  }, [performSearch]);

  const handleGoToReference = useCallback(() => {
    if (!refData?.isReference || !refData.bookId) return;
    router.push(`/read/${refData.bookId}/${refData.chapter}?translation=${translation}`);
  }, [refData, translation]);

  const handleResultPress = useCallback((result: SearchResult) => {
    router.push(`/read/${result.bookId}/${result.chapter}?translation=${translation}`);
  }, [translation]);

  const handleClear = useCallback(() => {
    setQuery("");
    setActiveQuery("");
    inputRef.current?.focus();
  }, []);

  const highlightText = useCallback((text: string, term: string) => {
    if (!term) return <Text>{text}</Text>;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const splitRegex = new RegExp(`(${escaped})`, "gi");
    const testRegex = new RegExp(`^${escaped}$`, "i");
    const parts = text.split(splitRegex);
    return (
      <Text>
        {parts.map((part, i) =>
          testRegex.test(part) ? (
            <Text key={i} style={{ backgroundColor: theme.highlightYellow, fontFamily: "Lora_600SemiBold" }}>
              {part}
            </Text>
          ) : (
            <Text key={i}>{part}</Text>
          )
        )}
      </Text>
    );
  }, [theme]);

  const hasResults = activeQuery.length > 0;
  const showSuggestions = !hasResults;
  const isRef = refData?.isReference === true;

  const renderResult = useCallback(({ item }: { item: SearchResult }) => (
    <Pressable
      onPress={() => handleResultPress(item)}
      style={({ pressed }) => [
        styles.resultCard,
        {
          backgroundColor: theme.backgroundCard,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.resultHeader}>
        <View style={[styles.resultRefBadge, { backgroundColor: theme.accent + "18" }]}>
          <Text style={[styles.resultRef, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
            {item.bookName} {item.chapter}:{item.verse}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </View>
      <Text
        style={[styles.resultText, { color: theme.text, fontFamily: "Lora_400Regular" }]}
        numberOfLines={3}
      >
        {highlightText(item.text, activeQuery)}
      </Text>
    </Pressable>
  ), [theme, activeQuery, highlightText, handleResultPress]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Search
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Find verses, passages & topics
        </Text>

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark ? "#0E0F14" : "#FFF8EC",
              borderColor: focused ? theme.accent + "50" : "transparent",
              borderWidth: focused ? 1.5 : 0,
              shadowColor: "#000",
              shadowOpacity: isDark ? 0 : 0.04,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 1,
            },
          ]}
        >
          <View style={[styles.searchIconWrap, { backgroundColor: theme.accent + "15" }]}>
            <Ionicons name="search" size={18} color={theme.accent} />
          </View>
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
            placeholder='Verses, references, or topics...'
            placeholderTextColor={theme.textMuted}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => performSearch(query)}
            testID="search-input"
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={styles.translationBar}>
          {TRANSLATIONS.map((t) => {
            const isActive = translation === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTranslation(t)}
                style={[
                  styles.txPill,
                  {
                    backgroundColor: isActive ? theme.accent : (isDark ? "#111218" : "#F0E8D8"),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.txPillText,
                    {
                      color: isActive ? "#fff" : theme.textSecondary,
                      fontFamily: isActive ? "Inter_700Bold" : "Inter_500Medium",
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

      {showSuggestions ? (
        <FlatList
          data={[]}
          keyExtractor={() => ""}
          renderItem={() => null}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                Topics
              </Text>
              <View style={styles.topicGrid}>
                {TOPIC_CHIPS.map((chip) => (
                  <Pressable
                    key={chip.label}
                    onPress={() => handleTopicPress(chip.label)}
                    style={({ pressed }) => [
                      styles.topicChip,
                      {
                        backgroundColor: isDark ? chip.bgDark : chip.bgLight,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Ionicons name={chip.icon} size={18} color={chip.color} />
                    <Text style={[styles.topicChipText, { color: isDark ? "#E0DAD0" : "#3A3530", fontFamily: "Inter_600SemiBold" }]}>
                      {chip.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: 28 }]}>
                Popular Passages
              </Text>
              {QUICK_REFS.map((ref, idx) => (
                <Pressable
                  key={ref.label}
                  onPress={() => handleSuggestion(ref.label)}
                  style={({ pressed }) => [
                    styles.quickRefRow,
                    {
                      backgroundColor: theme.backgroundCard,
                      opacity: pressed ? 0.7 : 1,
                      marginBottom: idx < QUICK_REFS.length - 1 ? 8 : 0,
                    },
                  ]}
                >
                  <View style={[styles.quickRefIcon, { backgroundColor: theme.accent + "15" }]}>
                    <Ionicons name="book-outline" size={18} color={theme.accent} />
                  </View>
                  <View style={styles.quickRefContent}>
                    <Text style={[styles.quickRefLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                      {ref.label}
                    </Text>
                    <Text style={[styles.quickRefSub, { color: theme.textMuted, fontFamily: "Lora_400Regular_Italic" }]} numberOfLines={1}>
                      {ref.subtitle}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={theme.textMuted} />
                </Pressable>
              ))}
            </View>
          }
        />
      ) : isRef ? (
        <FlatList
          data={[]}
          keyExtractor={() => ""}
          renderItem={() => null}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <Pressable
                onPress={handleGoToReference}
                style={({ pressed }) => [
                  styles.refCard,
                  {
                    backgroundColor: isDark ? "#18191F" : "#1A1F3C",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.refIcon, { backgroundColor: "rgba(201,147,58,0.2)" }]}>
                  <Ionicons name="book" size={24} color="#C9933A" />
                </View>
                <View style={styles.refContent}>
                  <Text style={[styles.refLabel, { fontFamily: "Inter_500Medium" }]}>
                    Go to reference
                  </Text>
                  <Text style={[styles.refTitle, { fontFamily: "Lora_700Bold" }]}>
                    {refData?.bookName} {refData?.chapter}
                    {refData?.verse ? `:${refData.verse}` : ""}
                  </Text>
                </View>
                <View style={[styles.refArrow, { backgroundColor: "rgba(201,147,58,0.15)" }]}>
                  <Ionicons name="arrow-forward" size={20} color="#C9933A" />
                </View>
              </Pressable>

              {searchLoading ? (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator size="small" color={theme.accent} />
                </View>
              ) : null}
            </View>
          }
        />
      ) : searchLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Searching...
          </Text>
        </View>
      ) : searchError ? (
        <View style={styles.centerLoading}>
          <Ionicons name="alert-circle-outline" size={44} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
            Search failed
          </Text>
          <Text style={[styles.errorSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {(searchError as Error).message}
          </Text>
        </View>
      ) : (
        <FlatList
          data={searchData?.results ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>
                Results
              </Text>
              <Text style={[styles.resultCount, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {searchData && searchData.total > searchData.returned
                  ? `Showing ${searchData.returned} of ${searchData.total}`
                  : `${searchData?.total ?? 0} found`}
              </Text>
            </View>
          }
          renderItem={renderResult}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                No verses found for "{activeQuery}"
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 8 },
  title: { fontSize: 34, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 18 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 10,
    marginBottom: 14,
  },
  searchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0, paddingVertical: 6 },
  translationBar: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 6,
  },
  txPill: {
    borderWidth: 0,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  txPillText: { fontSize: 12, letterSpacing: 0.5 },
  listContent: { paddingHorizontal: 24, paddingTop: 14 },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    marginBottom: 14,
  },
  topicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  topicChipText: { fontSize: 14 },
  quickRefRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  quickRefIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  quickRefContent: { flex: 1 },
  quickRefLabel: { fontSize: 16, marginBottom: 2 },
  quickRefSub: { fontSize: 13 },
  refCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 20,
    gap: 16,
    marginBottom: 16,
  },
  refIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  refContent: { flex: 1 },
  refLabel: { color: "rgba(237,229,213,0.55)", fontSize: 13, marginBottom: 3 },
  refTitle: { color: "#EDE5D5", fontSize: 22 },
  refArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  resultCount: { fontSize: 13 },
  resultCard: {
    borderRadius: 16,
    padding: 16,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultRefBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resultRef: { fontSize: 13 },
  resultText: { fontSize: 16, lineHeight: 24 },
  centerLoading: { flex: 1, justifyContent: "center" as const, alignItems: "center" as const, gap: 14 },
  loadingText: { fontSize: 15 },
  inlineLoading: { alignItems: "center" as const, paddingTop: 24 },
  errorText: { fontSize: 18 },
  errorSub: { fontSize: 14, textAlign: "center" as const },
  emptyState: { alignItems: "center" as const, gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 15, textAlign: "center" as const },
});
