import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Share,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { safeGoBack } from "@/lib/safe-back";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/context/TranslationContext";
import * as Clipboard from "expo-clipboard";
import { useQuery } from "@tanstack/react-query";

const GOLD = "#C9933A";
const TEAL = "#2A8B8B";

interface PassageVerse {
  id: string;
  verse: number;
  text: string;
  translationId: string;
}

interface CatalogTranslation {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  available?: boolean;
}

export default function VerseActionsSheet() {
  // Route params are used ONLY as the reference coordinates (bookId/chapter/
  // verse/bookName). Route `text` and route `verseId` are IGNORED for
  // authoritative display and map identity — the canonical source is resolved
  // from /api/verse in the active translation below.
  const { bookId, chapter, verse, bookName } =
    useLocalSearchParams<{
      bookId: string;
      chapter: string;
      verse: string;
      text: string;
      bookName: string;
      verseId: string;
      translation: string;
    }>();
  const { isDark } = useTheme();
  const { translation } = useTranslation();
  const insets = useSafeAreaInsets();

  const hasValidRef = !!bookName && !!chapter && !!verse;
  const reference = hasValidRef ? `${bookName} ${chapter}:${verse}` : "Selected Verse";
  const verseNum = Number(verse);
  const sourceBook = bookId || bookName;
  const hasRefParams = !!sourceBook && !!chapter && !!verse;

  // Canonical source of truth: resolve the displayed verse via /api/verse using
  // bookId/chapter/verse in the ACTIVE translation. Never default to KJV; never
  // fall back to stale route text.
  const {
    data: canonicalVerse,
    isLoading: sourceLoading,
    isError: sourceError,
  } = useQuery<{
    id: string;
    verse: number;
    text: string;
    translation: string;
    translationName?: string;
  }>({
    queryKey: [
      `/api/verse?book=${encodeURIComponent(sourceBook || "")}&chapter=${encodeURIComponent(chapter || "")}&verse=${encodeURIComponent(verse || "")}&translation=${encodeURIComponent(translation)}`,
    ],
    enabled: hasRefParams,
    retry: false,
  });

  // All display/share/identity flows read canonical values only.
  const canonicalVerseId = canonicalVerse?.id ?? null;
  const canonicalText = canonicalVerse?.text ?? "";
  const txLabel = canonicalVerse?.translation || translation;
  const txName = canonicalVerse?.translationName || "";
  const fullText = canonicalText ? `${canonicalText}\n\u2014 ${reference} (${txLabel})` : reference;

  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: fullText });
    } catch {}
  }, [fullText]);

  const handleCopyTranslation = async (verseText: string, txCode: string) => {
    await Clipboard.setStringAsync(`${reference} (${txCode})\n${verseText}`);
    setCopiedTx(txCode);
    setTimeout(() => setCopiedTx(null), 1500);
  };

  // Comparison editions come from the live, available catalog only — never a
  // hardcoded list — and always exclude the verse's current translation.
  const { data: catalogTranslations, isLoading: catalogLoading, isError: catalogError } = useQuery<CatalogTranslation[]>({
    queryKey: ["/api/translations"],
  });

  const otherTranslations = useMemo(() => {
    if (!catalogTranslations) return [] as CatalogTranslation[];
    const currentCode = (txLabel || "").trim().toUpperCase();
    return catalogTranslations.filter(
      (t) => t.available !== false && t.abbreviation.trim().toUpperCase() !== currentCode
    );
  }, [catalogTranslations, txLabel]);

  const { data: crossRefData, isLoading: crossRefLoading, isError: crossRefError } = useQuery<{ crossReferences: { ref: string; text: string; connection: string; translation?: string; translationName?: string; source?: string }[] }>({
    // Translation is a distinct key dimension: the verse-map cache is isolated
    // per translation server-side, so the GET key must carry the active label.
    // The key uses the CANONICAL verse id (never the route verseId).
    queryKey: [`/api/verse-map/${canonicalVerseId}?translation=${encodeURIComponent(txLabel)}`],
    enabled: !!canonicalVerseId,
    retry: false,
    select: (raw: any) => {
      const refs = raw?.relatedVerses ?? raw?.crossReferences ?? [];
      return {
        crossReferences: refs.map((r: any) => ({
          ref: r.reference ?? r.ref ?? "",
          text: r.text ?? "",
          connection: r.theme ?? r.connection ?? "",
          // Preserve backend-returned per-ref translation/source metadata for
          // the badge and per-ref navigation (active label is only a fallback).
          translation: r.translation ?? undefined,
          translationName: r.translationName ?? undefined,
          source: r.source ?? undefined,
        })),
      };
    },
  });

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const textColor = isDark ? "#E8E4DF" : "#1A1A1A";
  const cardBg = isDark ? "#141416" : "#FAFAF8";
  const borderColor = isDark ? "#222" : "#EEE";
  const mutedColor = isDark ? "#666" : "#AAA";

  return (
    <>
      <Stack.Screen options={{ title: reference, headerShown: false }} />
      <View style={[styles.container, { backgroundColor: isDark ? "#0A0A0C" : "#FFFFFF" }]}>
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <Pressable onPress={() => safeGoBack(router)} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={textColor} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
            {reference}
          </Text>
          <Pressable onPress={handleShare} hitSlop={12}>
            <Ionicons name="share-outline" size={20} color={mutedColor} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View style={[styles.verseCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.verseRef, { color: GOLD, fontFamily: "Inter_500Medium" }]}>
              {reference}
            </Text>
            {sourceLoading ? (
              <ActivityIndicator size="small" color={GOLD} style={{ paddingVertical: 8, alignSelf: "flex-start" }} />
            ) : sourceError ? (
              <Text style={[styles.verseText, { color: "#EF4444", fontFamily: "Inter_500Medium" }]}>
                Could not load this verse in {txLabel}. Please try again later.
              </Text>
            ) : (
              <Text style={[styles.verseText, { color: textColor, fontFamily: "Lora_400Regular" }]}>
                {canonicalText}
              </Text>
            )}
            <View style={[styles.translationTag, { backgroundColor: GOLD + "12" }]}>
              <Text style={[styles.translationText, { color: GOLD, fontFamily: "Inter_600SemiBold" }]}>
                {txName ? `${txLabel} \u00B7 ${txName}` : txLabel}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Ionicons name="git-compare-outline" size={18} color={GOLD} />
            <Text style={[styles.sectionTitle, { color: textColor, fontFamily: "Inter_600SemiBold" }]}>
              Compare Translations
            </Text>
          </View>

          {catalogLoading ? (
            <View style={styles.crossRefLoading}>
              <ActivityIndicator size="small" color={GOLD} />
              <Text style={[styles.loadingText, { color: mutedColor, fontFamily: "Inter_400Regular" }]}>
                Loading translations...
              </Text>
            </View>
          ) : catalogError ? (
            <View style={[styles.compareCard, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="alert-circle-outline" size={18} color="#EF4444" style={{ marginBottom: 6 }} />
              <Text style={[styles.compareText, { color: "#EF4444", fontFamily: "Inter_500Medium" }]}>
                Could not load available translations. Please try again later.
              </Text>
            </View>
          ) : otherTranslations.length === 0 ? (
            <View style={[styles.compareCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.compareText, { color: mutedColor, fontStyle: "italic", fontFamily: "Inter_400Regular" }]}>
                No other translations available to compare.
              </Text>
            </View>
          ) : (
            otherTranslations.map((t) => (
              <TranslationCompareCard
                key={t.abbreviation}
                tx={t.abbreviation}
                txName={t.name}
                bookName={bookName || ""}
                chapter={chapter || ""}
                verseNum={verseNum}
                reference={reference}
                isDark={isDark}
                copiedTx={copiedTx}
                onCopy={handleCopyTranslation}
              />
            ))
          )}

          <View style={[styles.sectionHeader, { marginTop: 28 }]}>
            <Ionicons name="link-outline" size={18} color={GOLD} />
            <Text style={[styles.sectionTitle, { color: textColor, fontFamily: "Inter_600SemiBold" }]}>
              Cross References
            </Text>
          </View>

          {crossRefLoading ? (
            <View style={styles.crossRefLoading}>
              <ActivityIndicator size="small" color={GOLD} />
              <Text style={[styles.loadingText, { color: mutedColor, fontFamily: "Inter_400Regular" }]}>
                Finding cross references...
              </Text>
            </View>
          ) : crossRefData?.crossReferences && crossRefData.crossReferences.length > 0 ? (
            crossRefData.crossReferences.map((cr, i) => {
              // Prefer the backend-returned translation for this specific ref;
              // the active label is only a fallback for navigation and badge.
              const refTranslation = cr.translation || txLabel;
              const badgeLabel = cr.translation || cr.translationName || txLabel;
              return (
              <Pressable
                key={i}
                style={[styles.crossRefCard, { backgroundColor: cardBg, borderColor }]}
                onPress={() => {
                  const match = cr.ref.match(/^(\d?\s?[A-Za-z][A-Za-z\s]+?)\s+(\d+):(\d+)/);
                  if (match) {
                    router.push({
                      pathname: "/verse-explain" as any,
                      params: {
                        bookName: match[1],
                        chapter: match[2],
                        verse: match[3],
                        text: cr.text,
                        translation: refTranslation,
                      },
                    });
                  }
                }}
              >
                <View style={styles.crossRefHeader}>
                  <Text style={[styles.crossRefRef, { color: TEAL, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>{cr.ref}</Text>
                  <View style={styles.crossRefHeaderRight}>
                    {!!badgeLabel && (
                      <View style={[styles.crossRefTxBadge, { backgroundColor: GOLD + "18" }]}>
                        <Text style={[styles.crossRefTxBadgeText, { color: GOLD, fontFamily: "Inter_600SemiBold" }]}>{badgeLabel}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={14} color={mutedColor} />
                  </View>
                </View>
                <Text style={[styles.crossRefText, { color: textColor, fontFamily: "Inter_400Regular" }]}>{cr.text}</Text>
                <View style={[styles.connectionBox, { borderLeftColor: GOLD + "50" }]}>
                  <Text style={[styles.connectionText, { color: mutedColor, fontFamily: "Inter_400Regular" }]}>{cr.connection}</Text>
                </View>
              </Pressable>
              );
            })
          ) : crossRefError ? (
            <View style={[styles.crossRefCard, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="alert-circle-outline" size={18} color="#EF4444" style={{ marginBottom: 6 }} />
              <Text style={[styles.crossRefText, { color: "#EF4444", fontFamily: "Inter_500Medium" }]}>
                Could not load cross references. Please try again later.
              </Text>
            </View>
          ) : !crossRefLoading ? (
            <View style={[styles.crossRefCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.crossRefText, { color: mutedColor, fontStyle: "italic", fontFamily: "Inter_400Regular" }]}>
                No cross references found for this verse.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </>
  );
}

function TranslationCompareCard({
  tx,
  txName,
  bookName,
  chapter,
  verseNum,
  reference,
  isDark,
  copiedTx,
  onCopy,
}: {
  tx: string;
  txName?: string;
  bookName: string;
  chapter: string;
  verseNum: number;
  reference: string;
  isDark: boolean;
  copiedTx: string | null;
  onCopy: (text: string, tx: string) => void;
}) {
  // Query key is translation-isolated so each edition caches independently.
  const { data, isLoading, isError } = useQuery<{
    verses: PassageVerse[];
    translation?: string;
    translationName?: string;
  }>({
    queryKey: [`/api/passage?book=${encodeURIComponent(bookName)}&chapter=${chapter}&translation=${tx}`],
    enabled: !!bookName && !!chapter,
  });

  const matchedVerse = data?.verses?.find((v: PassageVerse) => v.verse === verseNum);
  // Prefer the translation metadata the provider returns for this response.
  const displayTx = data?.translation || matchedVerse?.translationId || tx;
  const displayName = data?.translationName || txName;
  const textColor = isDark ? "#E8E4DF" : "#1A1A1A";
  const cardBg = isDark ? "#141416" : "#FAFAF8";
  const borderColor = isDark ? "#222" : "#EEE";
  const mutedColor = isDark ? "#666" : "#AAA";

  const handleShare = async () => {
    if (!matchedVerse) return;
    try {
      await Share.share({ message: `${reference} (${displayTx})\n${matchedVerse.text}` });
    } catch {}
  };

  return (
    <View style={[styles.compareCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.compareHeader}>
        <View style={styles.compareBadgeRow}>
          <View style={[styles.txBadge, { backgroundColor: TEAL + "18" }]}>
            <Text style={[styles.txBadgeText, { color: TEAL, fontFamily: "Inter_600SemiBold" }]}>{displayTx}</Text>
          </View>
          {!!displayName && (
            <Text style={[styles.compareTxName, { color: mutedColor, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
              {displayName}
            </Text>
          )}
        </View>
        {matchedVerse && (
          <View style={styles.compareActions}>
            <Pressable onPress={() => onCopy(matchedVerse.text, displayTx)} hitSlop={10}>
              <Ionicons
                name={copiedTx === displayTx ? "checkmark-circle" : "copy-outline"}
                size={16}
                color={copiedTx === displayTx ? "#10B981" : mutedColor}
              />
            </Pressable>
            <Pressable onPress={handleShare} hitSlop={10}>
              <Ionicons name="share-outline" size={16} color={mutedColor} />
            </Pressable>
          </View>
        )}
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={TEAL} style={{ paddingVertical: 8 }} />
      ) : isError ? (
        <Text style={[styles.compareText, { color: "#EF4444", fontFamily: "Inter_400Regular" }]}>
          Could not load this translation.
        </Text>
      ) : matchedVerse ? (
        <Text style={[styles.compareText, { color: textColor, fontFamily: "Inter_400Regular" }]}>
          {matchedVerse.text}
        </Text>
      ) : (
        <Text style={[styles.compareText, { color: mutedColor, fontStyle: "italic", fontFamily: "Inter_400Regular" }]}>
          Not available for this verse.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Lora_700Bold",
    letterSpacing: -0.3,
  },
  content: { padding: 20 },
  verseCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  verseRef: { fontSize: 12, marginBottom: 12, letterSpacing: 0.3 },
  verseText: { fontSize: 17, lineHeight: 30.6 },
  translationTag: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 14,
  },
  translationText: { fontSize: 10, letterSpacing: 0.5 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  compareCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 8,
  },
  compareHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compareActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  compareBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  compareTxName: {
    fontSize: 12,
    flexShrink: 1,
  },
  compareText: {
    fontSize: 15,
    lineHeight: 25,
  },
  txBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  txBadgeText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  crossRefLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  crossRefCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 8,
  },
  crossRefHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  crossRefRef: {
    fontSize: 14,
    textDecorationLine: "underline",
    flexShrink: 1,
  },
  crossRefHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crossRefTxBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  crossRefTxBadgeText: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  crossRefText: {
    fontSize: 15,
    lineHeight: 25,
  },
  connectionBox: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginTop: 4,
  },
  connectionText: {
    fontSize: 13,
    lineHeight: 20,
    fontStyle: "italic",
  },
});
