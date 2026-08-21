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
  SectionList,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/context/TranslationContext";
import { apiRequest } from "@/lib/query-client";
import Animated, { FadeInDown } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENT_SEARCHES_KEY = "@grace_semantic_recent";

interface VerseResult {
  reference: string;
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  text: string;
  relevance: string;
  translation: string;
  translationName: string;
  source: string;
  provider: string;
  providerEditionId?: string;
}

interface NoteResult {
  id: string;
  content: string;
  verseId: string;
  bookId: number;
  chapter: number;
  verse: number;
  verseText: string;
  verseTranslation: string | null;
  verseTranslationName: string | null;
  bookName: string;
}

interface HighlightResult {
  id: string;
  color: string;
  verseId: string;
  bookId: number;
  chapter: number;
  verse: number;
  verseText: string;
  verseTranslation: string | null;
  verseTranslationName: string | null;
  bookName: string;
}

interface BookmarkResult {
  id: string;
  label: string | null;
  verseId: string;
  bookId: number;
  chapter: number;
  verse: number;
  verseText: string;
  verseTranslation: string | null;
  verseTranslationName: string | null;
  bookName: string;
}

interface SemanticResponse {
  translation: string;
  verses: VerseResult[];
  notes: NoteResult[];
  highlights: HighlightResult[];
  bookmarks: BookmarkResult[];
  cached: boolean;
}

const SUGGESTED_QUERIES = [
  "verses about forgiveness",
  "what does the Bible say about anxiety",
  "promises of God for difficult times",
  "how to trust God when afraid",
  "verses about loving your neighbor",
  "Scripture on finding peace",
  "what does grace mean in the Bible",
  "encouragement for grief and loss",
];

function AnimatedItem({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400).springify()}>
      {children}
    </Animated.View>
  );
}

export default function SemanticSearchScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId, isAuthenticated } = useAuth();
  const { translation } = useTranslation();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SemanticResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"verses" | "notes" | "bookmarks">("verses");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  const bottomPad = Platform.OS === "web" ? 34 : 0;

  React.useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY).then((data) => {
      if (data) {
        try {
          setRecentSearches(JSON.parse(data));
        } catch {}
      }
    });
  }, []);

  const saveRecentSearch = useCallback(async (q: string) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 8);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  }, [recentSearches]);

  const searchMutation = useMutation({
    // Translation is part of the request identity: a KJV result must never be
    // shown for an NKJV reader, and vice-versa.
    mutationFn: async (vars: { query: string; translation: string }) => {
      const res = await apiRequest("POST", "/api/search/semantic", {
        query: vars.query,
        translation: vars.translation,
      });
      return (await (res as any).json()) as SemanticResponse;
    },
    onSuccess: (data) => {
      setResults(data);
      setActiveTab("verses");
    },
  });

  const performSearch = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length < 3) return;
      Keyboard.dismiss();
      saveRecentSearch(trimmed);
      searchMutation.mutate({ query: trimmed, translation });
    },
    [searchMutation, saveRecentSearch, translation]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults(null);
    inputRef.current?.focus();
  }, []);

  // Reader navigation carries the translation so the opened chapter matches the
  // translation the reader searched in.
  const navigateToVerse = useCallback(
    (bookId: number, chapter: number, verseTranslation?: string) => {
      const tx = verseTranslation || translation;
      router.push(`/read/${bookId}/${chapter}?translation=${encodeURIComponent(tx)}` as any);
    },
    [translation]
  );

  const hasResults = results !== null;
  const notesCount = results?.notes?.length ?? 0;
  const highlightsCount = results?.highlights?.length ?? 0;
  const bookmarksCount = results?.bookmarks?.length ?? 0;
  const personalCount = notesCount + highlightsCount + bookmarksCount;

  const tabs = [
    { key: "verses" as const, label: "Verses", count: results?.verses?.length ?? 0 },
    { key: "notes" as const, label: "Personal", count: personalCount },
    { key: "bookmarks" as const, label: "Bookmarks", count: bookmarksCount },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: "",
          headerShown: true,
          headerTransparent: true,
          headerBackTitle: "Search",
          headerTintColor: theme.accent,
          headerStyle: { backgroundColor: "transparent" },
        }}
      />

      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 44 }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Ask the Bible
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Search with natural language
        </Text>

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark ? "#0E0F14" : "#FFF8EC",
              borderColor: focused ? theme.accent + "50" : "transparent",
              borderWidth: focused ? 1.5 : 0,
            },
          ]}
        >
          <View style={[styles.searchIconWrap, { backgroundColor: theme.accent + "15" }]}>
            <MaterialCommunityIcons name="brain" size={18} color={theme.accent} />
          </View>
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
            placeholder='e.g. "verses about forgiveness"'
            placeholderTextColor={theme.textMuted}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => performSearch(query)}
            testID="semantic-search-input"
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </Pressable>
          )}
        </View>

        {hasResults && (
          <View style={styles.tabBar}>
            {tabs
              .filter((t) => t.key === "verses" || t.count > 0)
              .map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: isActive ? theme.accent : isDark ? "#111218" : "#F0E8D8",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color: isActive ? "#fff" : theme.textSecondary,
                          fontFamily: isActive ? "Inter_700Bold" : "Inter_500Medium",
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {tab.count > 0 && (
                      <View
                        style={[
                          styles.tabBadge,
                          { backgroundColor: isActive ? "rgba(255,255,255,0.25)" : theme.accent + "20" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabBadgeText,
                            { color: isActive ? "#fff" : theme.accent, fontFamily: "Inter_600SemiBold" },
                          ]}
                        >
                          {tab.count}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
          </View>
        )}
      </View>

      {searchMutation.isPending ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Searching Scripture...
          </Text>
        </View>
      ) : searchMutation.isError ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={44} color={theme.error} />
          <Text style={[styles.errorTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
            Search failed
          </Text>
          <Text style={[styles.errorSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Please try again
          </Text>
          <Pressable
            onPress={() => performSearch(query)}
            style={[styles.retryBtn, { backgroundColor: theme.accent }]}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={[styles.retryText, { fontFamily: "Inter_600SemiBold" }]}>Retry</Text>
          </Pressable>
        </View>
      ) : hasResults ? (
        activeTab === "verses" ? (
          <FlatList
            data={results.verses}
            keyExtractor={(item, idx) => `verse-${idx}`}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 120 }]}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            ListHeaderComponent={
              results.verses.length > 0 ? (
                <Text style={[styles.txHeader, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                  Showing {results.translation} translation
                </Text>
              ) : null
            }
            renderItem={({ item, index }) => (
              <AnimatedItem index={index}>
                <Pressable
                  onPress={() => navigateToVerse(item.bookId, item.chapter, item.translation)}
                  style={({ pressed }) => [
                    styles.verseCard,
                    {
                      backgroundColor: theme.backgroundCard,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={styles.verseHeader}>
                    <View style={[styles.refBadge, { backgroundColor: theme.accent + "18" }]}>
                      <Text style={[styles.refText, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
                        {item.reference}
                      </Text>
                    </View>
                    {!!item.translation && (
                      <View style={[styles.txBadge, { backgroundColor: theme.textMuted + "18" }]}>
                        <Text style={[styles.txBadgeText, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
                          {item.translation}
                        </Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                  </View>
                  <Text
                    style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}
                    numberOfLines={4}
                  >
                    {item.text}
                  </Text>
                  <Text
                    style={[styles.relevanceText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
                    numberOfLines={2}
                  >
                    {item.relevance}
                  </Text>
                </Pressable>
              </AnimatedItem>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={40} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  No verses found
                </Text>
              </View>
            }
          />
        ) : activeTab === "notes" ? (
          <FlatList
            data={[
              ...(results.notes || []).map((n) => ({ ...n, type: "note" as const })),
              ...(results.highlights || []).map((h) => ({ ...h, type: "highlight" as const })),
            ]}
            keyExtractor={(item, idx) => `personal-${item.type}-${idx}`}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 120 }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <AnimatedItem index={index}>
                <Pressable
                  onPress={() => navigateToVerse(item.bookId, item.chapter, item.verseTranslation ?? undefined)}
                  style={({ pressed }) => [
                    styles.personalCard,
                    {
                      backgroundColor: theme.backgroundCard,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={styles.personalHeader}>
                    <View
                      style={[
                        styles.personalIcon,
                        {
                          backgroundColor:
                            item.type === "note" ? "#5B8DEF20" : item.type === "highlight" ? "#F5A62320" : "#4ECCA320",
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.type === "note" ? "document-text" : "color-fill"}
                        size={16}
                        color={item.type === "note" ? "#5B8DEF" : "#F5A623"}
                      />
                    </View>
                    <View style={styles.personalInfo}>
                      <Text style={[styles.personalRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                        {item.bookName} {item.chapter}:{item.verse}
                      </Text>
                      <Text style={[styles.personalType, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {item.type === "note" ? "Note" : "Highlight"}
                        {item.verseTranslation ? ` · ${item.verseTranslation}` : ""}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                  </View>
                  <Text
                    style={[styles.personalContent, { color: theme.text, fontFamily: "Lora_400Regular" }]}
                    numberOfLines={3}
                  >
                    {item.type === "note" ? (item as NoteResult).content : (item as HighlightResult).verseText}
                  </Text>
                </Pressable>
              </AnimatedItem>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={40} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {isAuthenticated ? "No matching notes or highlights" : "Sign in to search your personal content"}
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={results.bookmarks || []}
            keyExtractor={(item, idx) => `bookmark-${idx}`}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 120 }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <AnimatedItem index={index}>
                <Pressable
                  onPress={() => navigateToVerse(item.bookId, item.chapter, item.verseTranslation ?? undefined)}
                  style={({ pressed }) => [
                    styles.personalCard,
                    {
                      backgroundColor: theme.backgroundCard,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={styles.personalHeader}>
                    <View style={[styles.personalIcon, { backgroundColor: "#4ECCA320" }]}>
                      <Ionicons name="bookmark" size={16} color="#4ECCA3" />
                    </View>
                    <View style={styles.personalInfo}>
                      <Text style={[styles.personalRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                        {item.bookName} {item.chapter}:{item.verse}
                      </Text>
                      <Text
                        style={[styles.personalType, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}
                      >
                        {item.label ? item.label : "Bookmark"}
                        {item.verseTranslation ? ` · ${item.verseTranslation}` : ""}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                  </View>
                  <Text
                    style={[styles.personalContent, { color: theme.text, fontFamily: "Lora_400Regular" }]}
                    numberOfLines={3}
                  >
                    {item.verseText}
                  </Text>
                </Pressable>
              </AnimatedItem>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="bookmark-outline" size={40} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {isAuthenticated ? "No matching bookmarks" : "Sign in to search your bookmarks"}
                </Text>
              </View>
            }
          />
        )
      ) : (
        <FlatList
          data={[]}
          keyExtractor={() => ""}
          renderItem={() => null}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {recentSearches.length > 0 && (
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    Recent Searches
                  </Text>
                  {recentSearches.map((search, idx) => (
                    <Pressable
                      key={`recent-${idx}`}
                      onPress={() => {
                        setQuery(search);
                        performSearch(search);
                      }}
                      style={({ pressed }) => [
                        styles.recentRow,
                        {
                          backgroundColor: theme.backgroundCard,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="time-outline" size={18} color={theme.textMuted} />
                      <Text
                        style={[styles.recentText, { color: theme.text, fontFamily: "Inter_400Regular" }]}
                        numberOfLines={1}
                      >
                        {search}
                      </Text>
                      <Ionicons name="arrow-forward" size={14} color={theme.textMuted} />
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Try Asking
                </Text>
                {SUGGESTED_QUERIES.map((sq, idx) => (
                  <Pressable
                    key={`suggest-${idx}`}
                    onPress={() => {
                      setQuery(sq);
                      performSearch(sq);
                    }}
                    style={({ pressed }) => [
                      styles.suggestionRow,
                      {
                        backgroundColor: isDark ? theme.accent + "08" : theme.accent + "0A",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons name="lightbulb-outline" size={18} color={theme.accent} />
                    <Text
                      style={[styles.suggestionText, { color: theme.text, fontFamily: "Inter_400Regular" }]}
                      numberOfLines={1}
                    >
                      {sq}
                    </Text>
                  </Pressable>
                ))}
              </View>
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
  title: { fontSize: 30, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 10,
    marginBottom: 12,
  },
  searchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0, paddingVertical: 6 },
  tabBar: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 6,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  tabText: { fontSize: 12, letterSpacing: 0.3 },
  tabBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center" as const,
  },
  tabBadgeText: { fontSize: 10 },
  centerState: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 14,
    paddingHorizontal: 40,
  },
  loadingText: { fontSize: 15 },
  errorTitle: { fontSize: 18 },
  errorSub: { fontSize: 14, textAlign: "center" as const },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  retryText: { color: "#fff", fontSize: 14 },
  listContent: { paddingHorizontal: 24, paddingTop: 10 },
  verseCard: {
    borderRadius: 16,
    padding: 16,
  },
  verseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  refBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  refText: { fontSize: 13 },
  txBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: "auto",
    marginRight: 8,
  },
  txBadgeText: { fontSize: 11, letterSpacing: 0.5 },
  txHeader: { fontSize: 12, marginBottom: 10, letterSpacing: 0.3 },
  verseText: { fontSize: 16, lineHeight: 24, marginBottom: 8 },
  relevanceText: { fontSize: 13, lineHeight: 18, fontStyle: "italic" as const },
  personalCard: {
    borderRadius: 16,
    padding: 16,
  },
  personalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  personalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  personalInfo: { flex: 1 },
  personalRef: { fontSize: 14 },
  personalType: { fontSize: 12 },
  personalContent: { fontSize: 15, lineHeight: 22 },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    marginBottom: 12,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    marginBottom: 6,
  },
  recentText: { flex: 1, fontSize: 15 },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    marginBottom: 6,
  },
  suggestionText: { flex: 1, fontSize: 15 },
  emptyState: {
    alignItems: "center" as const,
    gap: 12,
    paddingTop: 60,
  },
  emptyText: { fontSize: 15, textAlign: "center" as const },
});
