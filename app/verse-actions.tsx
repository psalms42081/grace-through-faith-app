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
import * as Clipboard from "expo-clipboard";
import { useQuery } from "@tanstack/react-query";

const GOLD = "#C9933A";
const TEAL = "#2A8B8B";

const COMPARE_TRANSLATIONS = ["KJV", "ASV", "WEB", "BBE", "YLT", "RV1909", "LSG", "ARC", "TAGV"];

interface PassageVerse {
  id: string;
  verse: number;
  text: string;
  translationId: string;
}

export default function VerseActionsSheet() {
  const { bookId, chapter, verse, text, bookName, verseId, translation } =
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
  const insets = useSafeAreaInsets();

  const hasValidRef = bookName && chapter && verse;
  const reference = hasValidRef ? `${bookName} ${chapter}:${verse}` : "Selected Verse";
  const txLabel = translation || "KJV";
  const fullText = text ? `${text}\n\u2014 ${reference} (${txLabel})` : reference;
  const verseNum = Number(verse);

  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: fullText });
    } catch {}
  }, [fullText]);

  const handleCopyTranslation = async (verseText: string, txName: string) => {
    await Clipboard.setStringAsync(`${reference} (${txName})\n${verseText}`);
    setCopiedTx(txName);
    setTimeout(() => setCopiedTx(null), 1500);
  };

  const otherTranslations = useMemo(
    () => COMPARE_TRANSLATIONS.filter(t => t !== txLabel),
    [txLabel]
  );

  const { data: crossRefData, isLoading: crossRefLoading, isError: crossRefError } = useQuery<{ crossReferences: { ref: string; text: string; connection: string }[] }>({
    queryKey: [`/api/verse-map/${verseId}`],
    enabled: !!verseId,
    retry: false,
    select: (raw: any) => {
      const refs = raw?.relatedVerses ?? raw?.crossReferences ?? [];
      return {
        crossReferences: refs.map((r: any) => ({
          ref: r.reference ?? r.ref ?? "",
          text: r.text ?? "",
          connection: r.theme ?? r.connection ?? "",
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
            <Text style={[styles.verseText, { color: textColor, fontFamily: "Lora_400Regular" }]}>
              {text}
            </Text>
            <View style={[styles.translationTag, { backgroundColor: GOLD + "12" }]}>
              <Text style={[styles.translationText, { color: GOLD, fontFamily: "Inter_600SemiBold" }]}>
                {txLabel}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Ionicons name="git-compare-outline" size={18} color={GOLD} />
            <Text style={[styles.sectionTitle, { color: textColor, fontFamily: "Inter_600SemiBold" }]}>
              Compare Translations
            </Text>
          </View>

          {otherTranslations.map(tx => (
            <TranslationCompareCard
              key={tx}
              tx={tx}
              bookName={bookName || ""}
              chapter={chapter || ""}
              verseNum={verseNum}
              reference={reference}
              isDark={isDark}
              copiedTx={copiedTx}
              onCopy={handleCopyTranslation}
            />
          ))}

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
            crossRefData.crossReferences.map((cr, i) => (
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
                        translation: txLabel,
                      },
                    });
                  }
                }}
              >
                <View style={styles.crossRefHeader}>
                  <Text style={[styles.crossRefRef, { color: TEAL, fontFamily: "Inter_600SemiBold" }]}>{cr.ref}</Text>
                  <Ionicons name="chevron-forward" size={14} color={mutedColor} />
                </View>
                <Text style={[styles.crossRefText, { color: textColor, fontFamily: "Inter_400Regular" }]}>{cr.text}</Text>
                <View style={[styles.connectionBox, { borderLeftColor: GOLD + "50" }]}>
                  <Text style={[styles.connectionText, { color: mutedColor, fontFamily: "Inter_400Regular" }]}>{cr.connection}</Text>
                </View>
              </Pressable>
            ))
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
  bookName,
  chapter,
  verseNum,
  reference,
  isDark,
  copiedTx,
  onCopy,
}: {
  tx: string;
  bookName: string;
  chapter: string;
  verseNum: number;
  reference: string;
  isDark: boolean;
  copiedTx: string | null;
  onCopy: (text: string, tx: string) => void;
}) {
  const { data, isLoading, isError } = useQuery<{ verses: PassageVerse[] }>({
    queryKey: [`/api/passage?book=${encodeURIComponent(bookName)}&chapter=${chapter}&translation=${tx}`],
    enabled: !!bookName && !!chapter,
  });

  const matchedVerse = data?.verses?.find((v: PassageVerse) => v.verse === verseNum);
  const textColor = isDark ? "#E8E4DF" : "#1A1A1A";
  const cardBg = isDark ? "#141416" : "#FAFAF8";
  const borderColor = isDark ? "#222" : "#EEE";
  const mutedColor = isDark ? "#666" : "#AAA";

  const handleShare = async () => {
    if (!matchedVerse) return;
    try {
      await Share.share({ message: `${reference} (${tx})\n${matchedVerse.text}` });
    } catch {}
  };

  return (
    <View style={[styles.compareCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.compareHeader}>
        <View style={[styles.txBadge, { backgroundColor: TEAL + "18" }]}>
          <Text style={[styles.txBadgeText, { color: TEAL, fontFamily: "Inter_600SemiBold" }]}>{tx}</Text>
        </View>
        {matchedVerse && (
          <View style={styles.compareActions}>
            <Pressable onPress={() => onCopy(matchedVerse.text, tx)} hitSlop={10}>
              <Ionicons
                name={copiedTx === tx ? "checkmark-circle" : "copy-outline"}
                size={16}
                color={copiedTx === tx ? "#10B981" : mutedColor}
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
