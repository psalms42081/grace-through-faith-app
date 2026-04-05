import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Share,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { safeGoBack } from "@/lib/safe-back";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import * as Clipboard from "expo-clipboard";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

const GOLD = "#C9933A";
const TEAL = "#2A8B8B";

const HIGHLIGHT_COLORS = {
  pink: { bg: "#FFB3C1", label: "Pink" },
  yellow: { bg: "#FFF176", label: "Yellow" },
  blue: { bg: "#B3D9FF", label: "Blue" },
  green: { bg: "#B3FFB3", label: "Green" },
} as const;

type HighlightColorKey = keyof typeof HIGHLIGHT_COLORS;

const COMPARE_TRANSLATIONS = ["KJV", "NLT", "NIV", "AMP", "NASB", "ASV", "WEB", "BBE", "YLT"];

interface PassageVerse {
  id: string;
  verse: number;
  text: string;
  translationId: string;
}

export default function VerseActionsSheet() {
  const { bookId, chapter, verse, text, bookName, verseId, translation, tab } =
    useLocalSearchParams<{
      bookId: string;
      chapter: string;
      verse: string;
      text: string;
      bookName: string;
      verseId: string;
      translation: string;
      tab: string;
    }>();
  const { theme, isDark } = useTheme();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();

  const canonicalVerseId = verseId || `${bookId}_${chapter}_${verse}`;
  const hasValidRef = bookName && chapter && verse;
  const reference = hasValidRef ? `${bookName} ${chapter}:${verse}` : "Selected Verse";
  const txLabel = translation || "KJV";
  const fullText = text ? `${text}\n\u2014 ${reference} (${txLabel})` : reference;
  const verseNum = Number(verse);

  const isCompareTab = tab === "compare";
  const [activeSection, setActiveSection] = useState<"actions" | "compare">(isCompareTab ? "compare" : "actions");

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  const showFeedback = (msg: string, isError = false) => {
    setFeedbackMsg(msg);
    if (!isError) {
      setTimeout(() => setFeedbackMsg(null), 1500);
    } else {
      setTimeout(() => setFeedbackMsg(null), 2500);
    }
  };

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(fullText);
    showFeedback("Copied!");
  }, [text, reference, txLabel]);

  const handleCopyTranslation = async (verseText: string, txName: string) => {
    await Clipboard.setStringAsync(`${reference} (${txName})\n${verseText}`);
    setCopiedTx(txName);
    setTimeout(() => setCopiedTx(null), 1500);
  };

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: fullText });
    } catch {}
  }, [fullText]);

  const handleHighlight = useCallback(async (color: HighlightColorKey) => {
    if (!userId) {
      showFeedback("Sign in to save highlights", true);
      return;
    }
    try {
      await apiRequest("POST", "/api/highlights", {
        userId,
        verseId: canonicalVerseId,
        color,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/highlights/${userId}`] });
      showFeedback("Highlighted!");
    } catch (err: any) {
      const isAuth = !userId || err?.message?.includes("401") || err?.message?.includes("Unauthorized");
      showFeedback(isAuth ? "Sign in to save highlights" : "Could not save highlight.", true);
    }
  }, [userId, canonicalVerseId]);

  const handleBookmark = useCallback(async () => {
    if (!userId) {
      showFeedback("Sign in to save bookmarks", true);
      return;
    }
    try {
      await apiRequest("POST", "/api/bookmarks", {
        userId,
        verseId: canonicalVerseId,
        label: reference,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/${userId}`] });
      showFeedback("Saved!");
    } catch (err: any) {
      const isAuth = !userId || err?.message?.includes("401") || err?.message?.includes("Unauthorized");
      showFeedback(isAuth ? "Sign in to save bookmarks" : "Could not save bookmark.", true);
    }
  }, [userId, canonicalVerseId, reference]);

  const handleSaveNote = useCallback(async () => {
    if (!userId) {
      showFeedback("Sign in to add notes", true);
      return;
    }
    if (!noteText.trim()) return;
    try {
      await apiRequest("POST", "/api/notes", {
        userId,
        verseId: canonicalVerseId,
        content: noteText.trim(),
      });
      queryClient.invalidateQueries({ queryKey: [`/api/notes/${userId}`] });
      showFeedback("Note saved!");
    } catch {
      showFeedback("Could not save note.", true);
    }
  }, [userId, canonicalVerseId, noteText]);

  const otherTranslations = useMemo(
    () => COMPARE_TRANSLATIONS.filter(t => t !== txLabel),
    [txLabel]
  );

  const { data: crossRefData, isLoading: crossRefLoading, isError: crossRefError } = useQuery<{ crossReferences: { ref: string; text: string; connection: string }[] }>({
    queryKey: [`/api/ai/cross-references?bookName=${encodeURIComponent(bookName || "")}&chapter=${chapter}&verse=${verse}&translation=${txLabel}`],
    enabled: !!bookName && !!chapter && !!verse && activeSection === "compare",
    retry: false,
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

        <View style={[styles.tabRow, { borderBottomColor: borderColor }]}>
          <Pressable
            onPress={() => setActiveSection("actions")}
            style={[styles.tab, activeSection === "actions" && styles.tabActive]}
          >
            <Text style={[styles.tabText, { color: activeSection === "actions" ? GOLD : mutedColor }]}>
              Actions
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveSection("compare")}
            style={[styles.tab, activeSection === "compare" && styles.tabActive]}
          >
            <Text style={[styles.tabText, { color: activeSection === "compare" ? GOLD : mutedColor }]}>
              Compare & References
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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

          {feedbackMsg && (
            <View style={[styles.feedbackBanner, {
              backgroundColor: (feedbackMsg.startsWith("Sign in") || feedbackMsg.startsWith("Could not")) ? "#EF444420" : "#10B98120",
              borderColor: (feedbackMsg.startsWith("Sign in") || feedbackMsg.startsWith("Could not")) ? "#EF444440" : "#10B98140",
            }]}>
              <Ionicons
                name={(feedbackMsg.startsWith("Sign in") || feedbackMsg.startsWith("Could not")) ? "alert-circle" : "checkmark-circle"}
                size={18}
                color={(feedbackMsg.startsWith("Sign in") || feedbackMsg.startsWith("Could not")) ? "#EF4444" : "#10B981"}
              />
              <Text style={[styles.feedbackText, {
                color: (feedbackMsg.startsWith("Sign in") || feedbackMsg.startsWith("Could not")) ? "#EF4444" : "#10B981",
                fontFamily: "Inter_600SemiBold",
              }]}>
                {feedbackMsg}
              </Text>
            </View>
          )}

          {activeSection === "actions" && (
            <>
              <View style={styles.quickRow}>
                <QuickAction icon="copy-outline" label="Copy" theme={theme} isDark={isDark} onPress={handleCopy} />
                <QuickAction icon="color-fill-outline" label="Highlight" theme={theme} isDark={isDark} onPress={() => setShowColorPicker(!showColorPicker)} color={GOLD} />
                <QuickAction icon="bookmark-outline" label="Save" theme={theme} isDark={isDark} onPress={handleBookmark} />
                <QuickAction icon="share-outline" label="Share" theme={theme} isDark={isDark} onPress={handleShare} />
              </View>

              {showColorPicker && (
                <View style={[styles.colorPickerRow, { backgroundColor: cardBg, borderColor }]}>
                  {(Object.keys(HIGHLIGHT_COLORS) as HighlightColorKey[]).map((key) => (
                    <Pressable
                      key={key}
                      onPress={() => handleHighlight(key)}
                      style={({ pressed }) => [
                        styles.colorDot,
                        { backgroundColor: HIGHLIGHT_COLORS[key].bg, opacity: pressed ? 0.6 : 1 },
                      ]}
                    >
                      <Text style={styles.colorLabel}>{HIGHLIGHT_COLORS[key].label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <QuickAction icon="create-outline" label="Add Note" theme={theme} isDark={isDark} onPress={() => setShowNoteInput(!showNoteInput)} fullWidth />

              {showNoteInput && (
                <View style={[styles.noteContainer, { backgroundColor: cardBg, borderColor }]}>
                  <TextInput
                    style={[styles.noteInput, { color: textColor }]}
                    placeholder="Write a note for this verse..."
                    placeholderTextColor={isDark ? "#555" : "#AAA"}
                    value={noteText}
                    onChangeText={setNoteText}
                    multiline
                    autoFocus
                    maxLength={500}
                  />
                  <Pressable onPress={handleSaveNote} style={styles.noteSaveBtn}>
                    <Text style={styles.noteSaveText}>Save Note</Text>
                  </Pressable>
                </View>
              )}

              <QuickAction
                icon="bulb-outline"
                label="Explain This Verse"
                theme={theme}
                isDark={isDark}
                onPress={() => {
                  router.push({ pathname: "/verse-explain" as any, params: { bookId, bookName, chapter, verse, verseId, text, translation } });
                }}
                fullWidth
              />
            </>
          )}

          {activeSection === "compare" && (
            <>
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
                  enabled={activeSection === "compare"}
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
            </>
          )}
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
  enabled,
  isDark,
  copiedTx,
  onCopy,
}: {
  tx: string;
  bookName: string;
  chapter: string;
  verseNum: number;
  reference: string;
  enabled: boolean;
  isDark: boolean;
  copiedTx: string | null;
  onCopy: (text: string, tx: string) => void;
}) {
  const { data, isLoading, isError } = useQuery<{ verses: PassageVerse[] }>({
    queryKey: [`/api/passage?book=${encodeURIComponent(bookName)}&chapter=${chapter}&translation=${tx}`],
    enabled: !!bookName && !!chapter && enabled,
  });

  const matchedVerse = data?.verses?.find((v: PassageVerse) => v.verse === verseNum);
  const textColor = isDark ? "#E8E4DF" : "#1A1A1A";
  const cardBg = isDark ? "#141416" : "#FAFAF8";
  const borderColor = isDark ? "#222" : "#EEE";
  const mutedColor = isDark ? "#666" : "#AAA";

  return (
    <View style={[styles.compareCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.compareHeader}>
        <View style={[styles.txBadge, { backgroundColor: TEAL + "18" }]}>
          <Text style={[styles.txBadgeText, { color: TEAL, fontFamily: "Inter_600SemiBold" }]}>{tx}</Text>
        </View>
        {matchedVerse && (
          <Pressable onPress={() => onCopy(matchedVerse.text, tx)} hitSlop={8}>
            <Ionicons
              name={copiedTx === tx ? "checkmark-circle" : "copy-outline"}
              size={16}
              color={copiedTx === tx ? "#10B981" : mutedColor}
            />
          </Pressable>
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

function QuickAction({
  icon,
  label,
  theme,
  isDark,
  onPress,
  color,
  fullWidth,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  theme: typeof Colors.light;
  isDark: boolean;
  onPress: () => void;
  color?: string;
  fullWidth?: boolean;
}) {
  const iconColor = color ?? (isDark ? "#E8E4DF" : "#1A1A1A");
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickBtn,
        fullWidth && { marginBottom: 12 },
        {
          backgroundColor: isDark ? "#141416" : "#FAFAF8",
          borderColor: isDark ? "#222" : "#EEE",
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={[styles.quickLabel, { color: isDark ? "#E8E4DF" : "#1A1A1A", fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
    </Pressable>
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
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: GOLD,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
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
  quickRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  quickLabel: { fontSize: 12 },
  colorPickerRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.06)",
  },
  colorLabel: {
    fontSize: 8,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(0,0,0,0.5)",
    marginTop: 1,
  },
  noteContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  noteInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
  },
  noteSaveBtn: {
    alignSelf: "flex-end",
    backgroundColor: GOLD,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  noteSaveText: {
    fontSize: 13,
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  feedbackText: { fontSize: 14 },
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
