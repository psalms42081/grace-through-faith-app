import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { SWEEP_LIGHT } from "@/constants/light-sweep";
import { apiRequest, queryClient } from "@/lib/query-client";

interface StrongEntry {
  id: string;
  language: string;
  lemma: string;
  transliteration: string | null;
  pronunciation: string | null;
  definition: string;
  extendedDefinition: string | null;
  kjvUsage: string | null;
  derivation: string | null;
}

interface WordMapping {
  map: {
    id: string;
    verseId: string;
    strongId: string;
    wordPosition: number;
    originalWord: string;
    translatedWord: string | null;
  };
  entry: StrongEntry | null;
}

export default function WordStudyScreen() {
  const params = useLocalSearchParams<{
    verseId?: string;
    book?: string;
    bookName?: string;
    chapter?: string;
    verse?: string;
    verseText?: string;
  }>();
  useTheme(); // Path B light sweep: screen is pinned light
  const theme = SWEEP_LIGHT;
  const insets = useSafeAreaInsets();
  const [selectedWord, setSelectedWord] = useState<WordMapping | null>(null);

  const resolvedVerse = params.verse || "1";
  const needsVerseLookup = !params.verseId && !!params.book && !!params.chapter;
  const { data: lookedUpVerse } = useQuery<{ id: string; text: string }>({
    queryKey: [`/api/verse?book=${params.book}&chapter=${params.chapter}&verse=${resolvedVerse}`],
    enabled: needsVerseLookup,
  });

  const resolvedVerseId = params.verseId || lookedUpVerse?.id || null;

  const { data: allBooks } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/books"],
    enabled: !!params.book && !params.bookName,
  });
  const displayBookName = params.bookName || allBooks?.find(b => b.id === Number(params.book))?.name || "";
  const displayVerseText = params.verseText || lookedUpVerse?.text || "";

  const { data: wordMappings, isLoading: mappingsLoading, error } = useQuery<WordMapping[]>({
    queryKey: [`/api/strong/verse/${resolvedVerseId}`],
    enabled: !!resolvedVerseId,
  });

  const generateMutation = useMutation<WordMapping[]>({
    mutationFn: () =>
      apiRequest("POST", "/api/strong/generate", {
        verseId: resolvedVerseId,
        bookName: displayBookName,
        chapter: Number(params.chapter),
        verse: Number(resolvedVerse),
        verseText: displayVerseText,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strong/verse/${resolvedVerseId}`] });
    },
  });

  const generationAttempted = useRef(false);

  useEffect(() => {
    if (
      wordMappings &&
      wordMappings.length === 0 &&
      resolvedVerseId &&
      displayVerseText &&
      !generateMutation.isPending &&
      !generationAttempted.current
    ) {
      generationAttempted.current = true;
      generateMutation.mutate();
    }
  }, [wordMappings, resolvedVerseId, displayVerseText]);

  useEffect(() => {
    generationAttempted.current = false;
  }, [resolvedVerseId]);

  const isLoading = mappingsLoading || (needsVerseLookup && !lookedUpVerse) || generateMutation.isPending;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const languageLabel = (lang: string) =>
    lang === "he" ? "Hebrew" : lang === "gr" ? "Greek" : lang;

  const hasData = wordMappings && wordMappings.length > 0;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.accent} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.text, fontFamily: "Lora_700Bold" },
            ]}
          >
            Word Study
          </Text>
          <Text
            style={[
              styles.headerSub,
              { color: theme.textSecondary, fontFamily: "Inter_400Regular" },
            ]}
          >
            {displayBookName} {params.chapter}:{params.verse}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.verseCard,
            { backgroundColor: theme.backgroundCard, borderColor: theme.border },
          ]}
        >
          <View style={styles.verseRefRow}>
            <Ionicons name="book-outline" size={14} color={theme.accent} />
            <Text
              style={[
                styles.verseRef,
                { color: theme.accentDark, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {displayBookName} {params.chapter}:{params.verse}
            </Text>
            <View style={[styles.translationBadge, { backgroundColor: theme.accent + "18" }]}>
              <Text style={[styles.translationText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
                KJV
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.verseText,
              { color: theme.text, fontFamily: "Lora_400Regular" },
            ]}
          >
            {displayVerseText}
          </Text>
          {wordMappings && wordMappings.length > 0 && (
            <View style={styles.wordPillsContainer}>
              <Text style={[styles.wordPillsLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                Tap a word to study
              </Text>
              <View style={styles.wordPillsRow}>
                {wordMappings.filter(wm => wm.entry).map((wm, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setSelectedWord(wm)}
                    style={({ pressed }) => [
                      styles.wordPill,
                      {
                        backgroundColor: pressed ? theme.accent + "30" : theme.accent + "18",
                        borderColor: theme.accent,
                      }
                    ]}
                  >
                    <Text style={[styles.wordPillText, {
                      color: theme.accentDark,
                      fontFamily: "Inter_600SemiBold"
                    }]}>
                      {wm.map.translatedWord || wm.entry?.lemma}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text
              style={[
                styles.loadingText,
                { color: theme.textMuted, fontFamily: "Inter_400Regular" },
              ]}
            >
              {generateMutation.isPending ? "Generating word analysis..." : "Loading word analysis..."}
            </Text>
          </View>
        )}

        {(error || generateMutation.isError) && (
          <View style={[styles.errorBox, { backgroundColor: theme.danger + "18", borderColor: theme.danger + "44" }]}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} />
            <Text style={[styles.errorText, { color: theme.danger, fontFamily: "Inter_400Regular" }]}>
              {generateMutation.isError ? "Failed to generate word study" : "Failed to load word data"}
            </Text>
          </View>
        )}

        {!isLoading && !error && !hasData && (
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: theme.backgroundCard, borderColor: theme.border },
            ]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: theme.accent + "18" }]}>
              <Ionicons name="language" size={28} color={theme.accent} />
            </View>
            <Text
              style={[
                styles.emptyTitle,
                { color: theme.text, fontFamily: "Lora_600SemiBold" },
              ]}
            >
              No Word Data Available
            </Text>
            <Text
              style={[
                styles.emptyBody,
                { color: theme.textMuted, fontFamily: "Inter_400Regular" },
              ]}
            >
              Word study data for this verse has not been mapped yet. Key passages
              like Genesis 1:1, Psalm 23:1, John 1:1, and John 3:16 have full word
              analysis available.
            </Text>
          </View>
        )}

        {hasData && (
          <>
            <Modal
              visible={!!selectedWord}
              transparent
              animationType="slide"
              onRequestClose={() => setSelectedWord(null)}
            >
              <Pressable
                style={styles.modalBackdrop}
                onPress={() => setSelectedWord(null)}
              />
              {selectedWord?.entry && (
                <View style={[styles.bottomSheet, { backgroundColor: theme.backgroundCard }]}>
                  <View style={styles.bottomSheetHandle} />
                  <View style={styles.wordHeader}>
                    <Text style={[styles.originalWord, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                      {selectedWord.entry.lemma}
                    </Text>
                    <View style={[styles.strongBadge, { backgroundColor: theme.accent + "18" }]}>
                      <Text style={[styles.strongNum, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
                        {selectedWord.entry.id}
                      </Text>
                    </View>
                  </View>
                  {selectedWord.map.translatedWord && (
                    <Text style={[styles.translatedWord, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                      "{selectedWord.map.translatedWord}"
                    </Text>
                  )}
                  {selectedWord.entry.transliteration && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
                        Transliteration
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                        {selectedWord.entry.transliteration}
                        {selectedWord.entry.pronunciation ? ` (${selectedWord.entry.pronunciation})` : ""}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
                      Definition
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                      {selectedWord.entry.definition}
                    </Text>
                  </View>
                  {selectedWord.entry.kjvUsage && (
                    <View style={styles.usageSection}>
                      <Text style={[styles.detailLabel, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
                        KJV Usage
                      </Text>
                      <View style={styles.usagePills}>
                        {selectedWord.entry.kjvUsage.split(",").map((u, j) => (
                          <View key={j} style={[styles.usagePill, { backgroundColor: theme.accent + "12" }]}>
                            <Text style={[styles.usagePillText, { color: theme.accentDark, fontFamily: "Inter_500Medium" }]}>
                              {u.trim()}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </Modal>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: { width: 36 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18 },
  headerSub: { fontSize: 12, marginTop: 2 },
  scrollView: { flex: 1 },
  content: { padding: 20, gap: 16 },
  verseCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  verseRefRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  verseRef: { fontSize: 13 },
  translationBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  translationText: { fontSize: 10 },
  verseText: { fontSize: 16, lineHeight: 26 },
  wordPillsContainer: {
    marginTop: 16,
    gap: 8,
  },
  wordPillsLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  wordPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  wordPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  wordPillText: {
    fontSize: 13,
  },
  loadingBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 13 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  errorText: { fontSize: 13 },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, textAlign: "center" },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  wordCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  wordHeader: { gap: 6 },
  wordTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  originalWord: { fontSize: 24 },
  langBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  langText: { fontSize: 10 },
  strongBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  strongNum: { fontSize: 10 },
  translationRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  translatedWord: { fontSize: 14, fontStyle: "italic" },
  detailRow: { gap: 4 },
  detailLabel: { fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" },
  detailValue: { fontSize: 14, lineHeight: 22 },
  usageSection: { gap: 8 },
  usagePills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  usagePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  usagePillText: { fontSize: 11 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 48,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(31,26,18,0.15)",
    alignSelf: "center",
    marginBottom: 16,
  },
  derivationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 2,
  },
  derivationText: { fontSize: 12, flex: 1, lineHeight: 18 },
});
