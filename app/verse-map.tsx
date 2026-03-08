import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { navigateToScripture } from "@/lib/scripture-nav";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useShareInsight, ShareInsightButton } from "@/components/ShareCard";

interface StrongWord {
  map: { id: string; verseId: string; strongId: string; wordPosition: number; translatedWord: string };
  entry: {
    id: string; language: string; lemma: string; transliteration: string | null;
    pronunciation: string | null; definition: string; kjvUsage: string | null;
    derivation: string | null; extendedDefinition: string | null;
  } | null;
}

interface CrossRef {
  reference: string;
  text: string;
  connection: string;
  bookId: number;
  chapter: number;
  verse: number;
}

interface VerseMapData {
  words: StrongWord[];
  crossReferences: CrossRef[];
  contextSnippet: string | null;
  hasCachedData: boolean;
}

const SECTION_ICONS = {
  words: "language-outline" as const,
  crossRefs: "git-branch-outline" as const,
  context: "time-outline" as const,
  study: "school-outline" as const,
};

export default function VerseMapScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    verseId: string;
    verseText: string;
    verseReference: string;
    bookName: string;
    bookId: string;
    chapter: string;
    verse: string;
  }>();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    words: true,
    crossRefs: true,
    context: true,
  });
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const { triggerShare, ShareCardRenderer, isSharing } = useShareInsight();

  const qc = useQueryClient();

  const { data: mapData, isLoading } = useQuery<VerseMapData>({
    queryKey: [`/api/verse-map/${params.verseId}`],
    enabled: !!params.verseId,
  });

  const [generateError, setGenerateError] = useState(false);
  const [wordGenTriggered, setWordGenTriggered] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/verse-map/generate", {
        verseId: params.verseId,
        verseText: params.verseText,
        verseReference: params.verseReference,
        bookName: params.bookName,
        chapter: parseInt(params.chapter || "1"),
        verse: parseInt(params.verse || "1"),
      });
      return res.json();
    },
    onSuccess: () => {
      setGenerateError(false);
      qc.invalidateQueries({ queryKey: [`/api/verse-map/${params.verseId}`] });
    },
    onError: () => {
      setGenerateError(true);
    },
  });

  const wordGenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/strong/generate", {
        verseId: params.verseId,
        verseText: params.verseText,
        bookName: params.bookName,
        chapter: parseInt(params.chapter || "1"),
        verse: parseInt(params.verse || "1"),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/verse-map/${params.verseId}`] });
    },
  });

  useEffect(() => {
    if (mapData && !mapData.hasCachedData && !generateMutation.isPending) {
      generateMutation.mutate();
    }
  }, [mapData?.hasCachedData]);

  useEffect(() => {
    if (
      mapData &&
      mapData.words.length === 0 &&
      !wordGenMutation.isPending &&
      !wordGenTriggered &&
      params.verseId &&
      params.verseText
    ) {
      setWordGenTriggered(true);
      wordGenMutation.mutate();
    }
  }, [mapData?.words?.length, wordGenTriggered]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  const words = mapData?.words?.filter((w) => w.entry) ?? [];
  const crossRefs = mapData?.crossReferences ?? [];
  const contextSnippet = mapData?.contextSnippet ?? null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={[theme.accent + "30", theme.background]}
        style={[styles.headerGradient, { paddingTop: topPadding + 10 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="verse-map-back">
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              Verse Map
            </Text>
          </View>
          <ShareInsightButton
            onPress={() => {
              const firstWord = words[0];
              triggerShare({
                verseReference: params.verseReference || "",
                verseText: params.verseText || "",
                insightLabel: "Word Study",
                insightText: firstWord?.entry?.definition
                  ? firstWord.entry.definition.length > 180
                    ? firstWord.entry.definition.slice(0, 177) + "..."
                    : firstWord.entry.definition
                  : undefined,
                originalWord: firstWord?.entry?.lemma,
                transliteration: firstWord?.entry?.transliteration || undefined,
              });
            }}
            isSharing={isSharing}
            compact
            theme={theme}
          />
        </View>

        <View style={[styles.verseCard, { backgroundColor: theme.backgroundCard }]}>
          <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
            "{params.verseText}"
          </Text>
          <Text style={[styles.verseRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            {params.verseReference}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: bottomPadding + 30 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Mapping verse...
            </Text>
          </View>
        )}

        {!isLoading && (
          <>
            <SectionHeader
              title="Original Language"
              subtitle={`${words.length} words mapped`}
              icon={SECTION_ICONS.words}
              expanded={expandedSections.words}
              onToggle={() => toggleSection("words")}
              theme={theme}
            />
            {expandedSections.words && (
              <View style={styles.sectionContent}>
                {words.length === 0 ? (
                  <View style={[styles.emptySection, { backgroundColor: theme.backgroundCard }]}>
                    <Ionicons name="language-outline" size={24} color={theme.textMuted} />
                    <Text style={[styles.emptySectionText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {wordGenMutation.isPending ? "Generating word analysis..." : "No word mappings available yet"}
                    </Text>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wordsScroll}>
                    {words.map((w, i) => {
                      const entry = w.entry!;
                      const isExpanded = expandedWord === (w.map.id || String(i));
                      const langColor = entry.language === "he" ? "#4A6741" : "#3B5998";
                      return (
                        <Pressable
                          key={w.map.id || i}
                          onPress={() => setExpandedWord(isExpanded ? null : (w.map.id || String(i)))}
                          style={[styles.wordCard, { backgroundColor: theme.backgroundCard }]}
                          testID={`word-card-${i}`}
                        >
                          <Text style={[styles.wordLemma, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                            {entry.lemma}
                          </Text>
                          {entry.transliteration && (
                            <Text style={[styles.wordTranslit, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                              {entry.transliteration}
                            </Text>
                          )}
                          <View style={[styles.wordLangBadge, { backgroundColor: langColor + "18" }]}>
                            <Text style={[styles.wordLangText, { color: langColor, fontFamily: "Inter_600SemiBold" }]}>
                              {entry.language === "he" ? "HEB" : "GRK"} {entry.id}
                            </Text>
                          </View>
                          {w.map.translatedWord && (
                            <View style={styles.wordTransRow}>
                              <Ionicons name="arrow-forward" size={10} color={theme.accent} />
                              <Text style={[styles.wordTranslated, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                                "{w.map.translatedWord}"
                              </Text>
                            </View>
                          )}
                          <Text style={[styles.wordDef, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={isExpanded ? undefined : 2}>
                            {entry.definition}
                          </Text>
                          {isExpanded && entry.kjvUsage && (
                            <View style={styles.wordUsage}>
                              <Text style={[styles.wordUsageLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                                KJV Usage
                              </Text>
                              <View style={styles.usagePills}>
                                {entry.kjvUsage.split(",").slice(0, 8).map((u, j) => (
                                  <View key={j} style={[styles.usagePill, { backgroundColor: theme.accent + "12" }]}>
                                    <Text style={[styles.usagePillText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                                      {u.trim()}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            <SectionHeader
              title="Cross-References"
              subtitle={`${crossRefs.length} related passages`}
              icon={SECTION_ICONS.crossRefs}
              expanded={expandedSections.crossRefs}
              onToggle={() => toggleSection("crossRefs")}
              theme={theme}
            />
            {expandedSections.crossRefs && (
              <View style={styles.sectionContent}>
                {generateMutation.isPending && crossRefs.length === 0 ? (
                  <View style={[styles.emptySection, { backgroundColor: theme.backgroundCard }]}>
                    <ActivityIndicator size="small" color={theme.accent} />
                    <Text style={[styles.emptySectionText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      Finding related passages...
                    </Text>
                  </View>
                ) : crossRefs.length === 0 && generateError ? (
                  <View style={[styles.emptySection, { backgroundColor: theme.backgroundCard }]}>
                    <Ionicons name="cloud-offline-outline" size={24} color={theme.textMuted} />
                    <Text style={[styles.emptySectionText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      Failed to load cross-references
                    </Text>
                    <Pressable
                      onPress={() => { setGenerateError(false); generateMutation.mutate(); }}
                      style={[styles.retryBtn, { backgroundColor: theme.accent }]}
                    >
                      <Ionicons name="refresh" size={14} color="#fff" />
                      <Text style={[styles.retryBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Retry</Text>
                    </Pressable>
                  </View>
                ) : crossRefs.length === 0 ? (
                  <View style={[styles.emptySection, { backgroundColor: theme.backgroundCard }]}>
                    <Ionicons name="git-branch-outline" size={24} color={theme.textMuted} />
                    <Text style={[styles.emptySectionText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      No cross-references available
                    </Text>
                  </View>
                ) : (
                  crossRefs.map((ref, i) => (
                    <Pressable
                      key={i}
                      onPress={() => navigateToScripture({ ref: ref.reference, bookId: ref.bookId, chapter: ref.chapter })}
                      style={[styles.crossRefCard, { backgroundColor: theme.backgroundCard }]}
                      testID={`crossref-${i}`}
                    >
                      <View style={styles.crossRefHeader}>
                        <Text style={[styles.crossRefReference, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                          {ref.reference}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                      </View>
                      <Text style={[styles.crossRefText, { color: theme.text, fontFamily: "Lora_400Regular" }]} numberOfLines={2}>
                        "{ref.text}"
                      </Text>
                      <View style={styles.crossRefConnection}>
                        <Ionicons name="link-outline" size={12} color={theme.textMuted} />
                        <Text style={[styles.crossRefConnText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                          {ref.connection}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            <SectionHeader
              title="Historical Context"
              subtitle="Cultural background"
              icon={SECTION_ICONS.context}
              expanded={expandedSections.context}
              onToggle={() => toggleSection("context")}
              theme={theme}
            />
            {expandedSections.context && (
              <View style={styles.sectionContent}>
                {generateMutation.isPending && !contextSnippet ? (
                  <View style={[styles.emptySection, { backgroundColor: theme.backgroundCard }]}>
                    <ActivityIndicator size="small" color={theme.accent} />
                    <Text style={[styles.emptySectionText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      Researching historical context...
                    </Text>
                  </View>
                ) : contextSnippet ? (
                  <View style={[styles.contextCard, { backgroundColor: theme.backgroundCard }]}>
                    <Ionicons name="time-outline" size={18} color={theme.accent} style={{ marginBottom: 8 }} />
                    <Text style={[styles.contextText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                      {contextSnippet}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.emptySection, { backgroundColor: theme.backgroundCard }]}>
                    <Ionicons name="time-outline" size={24} color={theme.textMuted} />
                    <Text style={[styles.emptySectionText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      No context available
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/study-guide" as any,
                  params: {
                    verseReference: params.verseReference,
                    verseText: params.verseText,
                    bookName: params.bookName,
                    chapter: params.chapter,
                    verse: params.verse,
                  },
                })
              }
              style={[styles.studyButton, { backgroundColor: theme.accent }]}
              testID="launch-study-guide"
            >
              <Ionicons name="school-outline" size={18} color="#fff" />
              <Text style={[styles.studyButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                Study This Verse
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      {ShareCardRenderer}
    </View>
  );
}

function SectionHeader({
  title, subtitle, icon, expanded, onToggle, theme,
}: {
  title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap;
  expanded: boolean; onToggle: () => void; theme: typeof Colors.light;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={theme.accent} />
      <View style={styles.sectionHeaderText}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {title}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingBottom: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 34, height: 34, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18 },
  verseCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
  },
  verseText: { fontSize: 15, lineHeight: 24, fontStyle: "italic" },
  verseRef: { fontSize: 12, marginTop: 8 },
  content: { flex: 1 },
  loadingBox: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 15 },
  sectionSubtitle: { fontSize: 11, marginTop: 1 },
  sectionContent: { paddingHorizontal: 16, paddingBottom: 8 },
  emptySection: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  emptySectionText: { fontSize: 13, textAlign: "center" },
  wordsScroll: { gap: 10, paddingRight: 8 },
  wordCard: {
    width: 160,
    padding: 14,
    borderRadius: 12,
  },
  wordLemma: { fontSize: 22, marginBottom: 2 },
  wordTranslit: { fontSize: 12, marginBottom: 6 },
  wordLangBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  wordLangText: { fontSize: 9, letterSpacing: 0.5 },
  wordTransRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  wordTranslated: { fontSize: 12 },
  wordDef: { fontSize: 12, lineHeight: 17 },
  wordUsage: { marginTop: 8 },
  wordUsageLabel: { fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 },
  usagePills: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  usagePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  usagePillText: { fontSize: 10 },
  crossRefCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  crossRefHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  crossRefReference: { fontSize: 14 },
  crossRefText: { fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  crossRefConnection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  crossRefConnText: { fontSize: 12, lineHeight: 17, flex: 1 },
  contextCard: {
    padding: 16,
    borderRadius: 12,
  },
  contextText: { fontSize: 14, lineHeight: 22 },
  studyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  studyButtonText: { color: "#fff", fontSize: 15 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 8,
  },
  retryBtnText: { fontSize: 13 },
});
