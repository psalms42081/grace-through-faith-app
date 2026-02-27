import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  useColorScheme,
  Platform,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";

const TRANSLATIONS = ["KJV", "ASV", "WEB"] as const;
type Translation = (typeof TRANSLATIONS)[number];

const SUGGESTIONS = [
  { label: "John 3:16", type: "ref" },
  { label: "Psalm 23", type: "ref" },
  { label: "Romans 8:28", type: "ref" },
  { label: "Genesis 1", type: "ref" },
  { label: "love", type: "keyword" },
  { label: "faith", type: "keyword" },
  { label: "grace", type: "keyword" },
  { label: "salvation", type: "keyword" },
  { label: "wisdom", type: "keyword" },
  { label: "prayer", type: "keyword" },
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
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
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.resultHeader}>
        <Text style={[styles.resultRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
          {item.bookName} {item.chapter}:{item.verse}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
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
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Search
        </Text>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: focused ? theme.accent : theme.border,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
            placeholder='Search verses or type "John 3:16"'
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
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
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
                  backgroundColor: isActive ? theme.accent : theme.backgroundCard,
                  borderColor: isActive ? theme.accent : theme.border,
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

      {showSuggestions ? (
        <FlatList
          data={SUGGESTIONS}
          keyExtractor={(item) => item.label}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 120 }]}
          ListHeaderComponent={
            <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              Suggestions
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSuggestion(item.label)}
              style={({ pressed }) => [
                styles.suggestionRow,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.suggestionIcon, { backgroundColor: theme.accent + "18" }]}>
                <Ionicons
                  name={item.type === "ref" ? "navigate-outline" : "search-outline"}
                  size={16}
                  color={theme.accent}
                />
              </View>
              <Text style={[styles.suggestionText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                {item.label}
              </Text>
              <Ionicons name="arrow-forward" size={14} color={theme.textMuted} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      ) : isRef ? (
        <View style={[styles.listContent, { paddingBottom: bottomPad + 120 }]}>
          <Pressable
            onPress={handleGoToReference}
            style={({ pressed }) => [
              styles.refCard,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={[styles.refIcon, { backgroundColor: "rgba(201,147,58,0.25)" }]}>
              <Ionicons name="book" size={22} color="#C9933A" />
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
            <Ionicons name="arrow-forward-circle" size={28} color="#C9933A" />
          </Pressable>

          {searchLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          ) : null}
        </View>
      ) : searchLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Searching...
          </Text>
        </View>
      ) : searchError ? (
        <View style={styles.centerLoading}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text, fontFamily: "Lora_500Medium" }]}>
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
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
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
              <Ionicons name="search-outline" size={36} color={theme.textMuted} />
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
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 24, marginBottom: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  listContent: { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    marginBottom: 12,
    marginTop: 4,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  suggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  suggestionText: { flex: 1, fontSize: 15 },
  refCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 18,
    gap: 14,
    marginBottom: 16,
  },
  refIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  refContent: { flex: 1 },
  refLabel: { color: "rgba(237,229,213,0.6)", fontSize: 12, marginBottom: 2 },
  refTitle: { color: "#EDE5D5", fontSize: 20 },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 0,
    marginTop: 4,
  },
  resultCount: { fontSize: 12 },
  resultCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  resultRef: { fontSize: 13 },
  resultText: { fontSize: 15, lineHeight: 22 },
  centerLoading: { flex: 1, justifyContent: "center" as const, alignItems: "center" as const, gap: 12 },
  loadingText: { fontSize: 14 },
  inlineLoading: { alignItems: "center" as const, paddingTop: 20 },
  errorText: { fontSize: 17 },
  errorSub: { fontSize: 13, textAlign: "center" as const },
  emptyState: { alignItems: "center" as const, gap: 10, paddingTop: 60 },
  emptyText: { fontSize: 14, textAlign: "center" as const },
  translationBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  txPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  txPillText: { fontSize: 11 },
});
