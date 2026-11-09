import React, { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Share,
  TextInput,
  Animated,
  Dimensions,
  PanResponder,
} from "react-native";
import { router, useLocalSearchParams, Stack, useFocusEffect, useNavigation, useSegments, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/context/TranslationContext";
import TTSPlayerBar from "@/components/reader/TTSPlayerBar";
import { TypographyPreviewProse } from "@/components/reader/TypographyPreviewProse";
import { VerseSpokenText } from "@/components/reader/VerseSpokenText";
import { ReadingSizeControl } from "@/components/reader/ReadingSizeControl";
import { READING_CHROME_FONT_CAP } from "@/lib/reading-font-scale";
import { setReadingFontScale, useReadingFontScale, useSystemFontScale } from "@/lib/use-reading-font-scale";
import type { WordStudySheetTarget } from "@/components/reader/WordStudySheet";
import { VERSE_SHEET_COLLAPSED_HEIGHT } from "@/lib/verse-sheet";

const VerseSheet = React.lazy(() =>
  import("@/components/reader/VerseSheet").then((mod) => ({ default: mod.VerseSheet })),
);
const WordStudySheet = React.lazy(() =>
  import("@/components/reader/WordStudySheet").then((mod) => ({ default: mod.WordStudySheet })),
);
const OriginalWordsSheet = React.lazy(() =>
  import("@/components/reader/OriginalWordsSheet").then((mod) => ({ default: mod.OriginalWordsSheet })),
);
import { TranslationPickerList } from "@/components/reader/TranslationPickerList";
import {
  ChapterAttribution,
  type ChapterAttributionData,
  type ChapterFootnote,
} from "@/components/reader/ChapterAttribution";
import { originalWordsFromStepMaps } from "@/lib/reader-word-study";
import { translationLabel, type CatalogTranslation } from "@/lib/translation-catalog";
import { formatSheetReference } from "@/lib/verse-sheet";
import { READER_VERSION_CHIP_MAX_WIDTH, readerHeaderTitleMaxWidth } from "@/lib/reader-header-layout";
import { bibleBookName } from "@/lib/scripture-reference";
import { useTranslationCatalog } from "@/hooks/useTranslationCatalog";
import { withAcrosticHeadings } from "@/lib/group-verses-by-paragraph";
import type { ReaderStrongMap } from "@/lib/reader-word-study";
import { comparisonTranslation } from "@/lib/compare-translation";
import { isKjvTranslation } from "@/lib/strong-map-policy";
import { RED_LETTERS_STORAGE_KEY, redLettersFromStorage, spokenRangesForLine } from "@/lib/words-of-christ";
import useBibleAudio from "@/hooks/useBibleAudio";
import { withDeviceTimeZone } from "@/lib/device-time-zone";
import {
  goBibleReaderBack,
  isBibleTabSegments,
  openBibleTabBooks,
} from "@/lib/bible-tab-navigation";
import {
  useCanPopNestedStack,
  useHardwareBackToHomeWhenAtStackRoot,
} from "@/lib/use-hardware-back-to-home";
import {
  READER_FLOATING_CHROME_HEIGHT,
  floatingChromeHiddenAfterScroll,
  nativeTabBarHeight,
  readerChromeBottom,
  readerScrollBottomPad as readingScrollPad,
  readerTabBarClearance,
} from "@/lib/reader-floating-chrome";
import {
  buildHighlightSheetPayload,
  formatVerseRangeLabel,
  highlightIdsForVerses,
  bookmarkIdsForVerses,
  toggleVerseSelection,
  verseSurfaceStyle,
  VERSE_SELECTION_WASH,
} from "@/lib/verse-selection";
import { scriptureOverlayHref } from "@/lib/scripture-nav";
import { scrollDomToVerse } from "@/lib/reader-verse-anchor";
import { VERSE_SHEET_HIGHLIGHTS, type VerseSheetHighlightKey } from "@/lib/verse-sheet";
import { wordStudyHintCopy, wordStudyHintReturns } from "@/lib/word-study-hint";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { isPartialWordRange } from "@/lib/verse-word-range";
import {
  addSessionHighlight,
  getSessionHighlights,
  removeSessionHighlight,
  subscribeSessionHighlights,
} from "@/lib/session-highlights";
import type { VerseWordRangeHighlight } from "@/components/reader/VerseWordSpans";

const VERSE_TAP_HINT_KEY = "@grace-through-faith/verse-tap-hint-dismissed";
const WORD_STUDY_HINT_KEY = "@grace-through-faith/word-study-hint-hidden-at";
const DEFAULT_TRANSLATIONS = ["KJV", "ASV", "WEB", "BBE", "YLT", "RV1909", "LSG", "ARC", "TAGV"];
const TRANSLATION_LABELS: Record<string, string> = {
  KJV: "King James Version",
  ASV: "American Standard",
  WEB: "World English Bible",
  BBE: "Bible in Basic English",
  YLT: "Young's Literal Translation",
  RV1909: "Reina Valera 1909",
  LSG: "Louis Segond 1910",
  ARC: "Almeida Revista e Corrigida",
  TAGV: "Ang Biblia (Tagalog)",
};
const DEFAULT_TRANSLATION_LANGUAGES: Record<string, { tag: string; name: string }> = {
  RV1909: { tag: "es", name: "Spanish" },
  LSG: { tag: "fr", name: "French" },
  ARC: { tag: "pt", name: "Portuguese" },
  TAGV: { tag: "fil", name: "Filipino" },
};

const HIGHLIGHT_COLORS = {
  blue: { bg: "#90CAF9", label: "Blue" },
  yellow: { bg: "#FFF176", label: "Yellow" },
  pink: { bg: "#F48FB1", label: "Pink" },
  green: { bg: "#A5D6A7", label: "Green" },
  orange: { bg: "#FFCC80", label: "Orange" },
  rose: { bg: "#F8BBD0", label: "Rose" },
  purple: { bg: "#CE93D8", label: "Purple" },
} as const;

type HighlightColorKey = keyof typeof HIGHLIGHT_COLORS;

// ── Path B reader-v2 (Brief 02) ─────────────────────────────────────────────
// Canon 4 highlight colours. Legacy pink/purple highlights are remapped at
// RENDER time only (data untouched): pink → orange, purple → blue.
const CANON_HIGHLIGHTS: HighlightColorKey[] = ["yellow", "green", "blue", "orange"];
const LEGACY_HIGHLIGHT_MAP: Partial<Record<HighlightColorKey, HighlightColorKey>> = {
  pink: "orange",
  purple: "blue",
};
function canonHighlightBg(colorKey: string): string | null {
  const key = colorKey as HighlightColorKey;
  const mapped = LEGACY_HIGHLIGHT_MAP[key] ?? key;
  return HIGHLIGHT_COLORS[mapped]?.bg ?? null;
}

const RV2_SURFACE = "#FBF7EE";   // PathB.surface
const RV2_INK = "#1F1A12";       // PathB.ink
const RV2_INK_MUTED = "#6B6660"; // WCAG-safe muted (HV2.inkMutedText)
const RV2_CORAL = "#E8604C";     // ONLY the Listen play button
const RV2_PILL = "#F1EBDD";      // slightly darker cream for pills/surfaces
const RV2_BORDER = "#E7E0D2";
const READER_TOGGLE_ON_INK = "#C24431";
const READER_TOGGLE_ON_TINT = "#FBE9E4";
/** Internal one-release rollback. Default off = new typography + floating chrome. */
const READER_LEGACY_VERSE_BLOCKS = false;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SPLIT_MODE_KEY = "@grace-through-faith/split-mode";
const SPLIT_TRANSLATION_KEY = "@grace-through-faith/split-translation";

const DARK_BG = "#0A0A0A";
const DARK_SURFACE = "#1A1A1A";
const DARK_BORDER = "#1F1F1F";
const DARK_TEXT = "#F5F0E8";
const DARK_MUTED = "#666";
const LIGHT_BG = "#FFFFFF";
const LIGHT_SURFACE = "#F8F7F5";
const LIGHT_TEXT = "#1A1A1A";

type Translation = string;

interface Verse {
  id: string;
  verse: number;
  text: string;
}

interface PassageResponse {
  book: { id: number; name: string; chapterCount: number };
  chapter: number;
  verses: Verse[];
  /** API.Bible-only source structure; local KJV responses do not include this. */
  providerContent?: {
    headings?: { text: string; beforeVerse?: number; kind?: "qa" }[];
    paragraphs?: { verseStart: number; verseEnd: number }[];
  };
  /** YouVersion only: the copyright line the version requires, and its footnotes. */
  attribution?: ChapterAttributionData;
  footnotes?: ChapterFootnote[];
  /** Chapter count of this translation when it is known apart from KJV metadata. */
  translationChapterCount?: number;
}

function BottomSheetToolbar({
  verses,
  highlightIds,
  bookName,
  bookId,
  chapter,
  translation,
  userId,
  isAuthenticated,
  onDismiss,
  isDark,
  bottomPad,
}: {
  verses: Verse[];
  highlightIds: string[];
  bookName: string;
  bookId: string;
  chapter: string;
  translation: string;
  userId: string | null;
  isAuthenticated: boolean;
  onDismiss: () => void;
  isDark: boolean;
  bottomPad: number;
}) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const [activeColor, setActiveColor] = useState<HighlightColorKey | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const noteInputRef = useRef<TextInput>(null);

  const sheetPayload = useMemo(
    () => buildHighlightSheetPayload({ bookName, chapter, translation, verses }),
    [bookName, chapter, translation, verses],
  );
  const firstVerse = verses[0];
  const reference = sheetPayload.reference;
  const fullText = sheetPayload.copyText;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 15,
        stiffness: 120,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, overlayAnim]);

  const dismissSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  }, [onDismiss, slideAnim, overlayAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          dismissSheet();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            damping: 20,
            stiffness: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current); }, []);
  const showFeedback = (msg: string, isError = false) => {
    setFeedback({ message: msg, isError });
    Haptics.notificationAsync(
      isError ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success
    );
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      feedbackTimerRef.current = null;
      setFeedback(null);
      dismissSheet();
    }, 800);
  };

  const handleHighlight = async (color: HighlightColorKey) => {
    if (!userId) { showFeedback("Sign in to highlight"); return; }
    if (verses.length === 0) return;
    setActiveColor(color);
    try {
      await Promise.all(
        verses.map((v) => apiRequest("POST", "/api/highlights", { userId, verseId: v.id, color })),
      );
      queryClient.invalidateQueries({ queryKey: [`/api/highlights/${userId}`] });
      showFeedback("Highlighted!");
    } catch {
      showFeedback("Failed to highlight", true);
    }
  };

  const handleClearHighlights = async () => {
    if (!userId) { showFeedback("Sign in to highlight"); return; }
    try {
      await Promise.all(
        highlightIds.map((id) => apiRequest("DELETE", `/api/highlights/${id}`)),
      );
      queryClient.invalidateQueries({ queryKey: [`/api/highlights/${userId}`] });
      setActiveColor(null);
      showFeedback("Cleared!");
    } catch {
      showFeedback("Failed to clear", true);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(fullText);
    showFeedback("Copied!");
  };

  const handleShare = async () => {
    try { await Share.share({ message: fullText }); dismissSheet(); } catch { dismissSheet(); }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) { showFeedback("Sign in to save"); return; }
    if (!firstVerse) return;
    try {
      await apiRequest("POST", "/api/bookmarks", { userId, verseId: firstVerse.id, label: reference });
      queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/${userId}`] });
      showFeedback("Saved!");
    } catch {
      showFeedback("Failed to save", true);
    }
  };

  const handleSaveNote = async () => {
    if (!isAuthenticated) { showFeedback("Sign in to add notes"); return; }
    if (!noteText.trim() || !firstVerse) return;
    try {
      await apiRequest("POST", "/api/notes", { userId, verseId: firstVerse.id, content: noteText.trim() });
      queryClient.invalidateQueries({ queryKey: [`/api/notes/${userId}`] });
      showFeedback("Note saved!");
    } catch {
      showFeedback("Failed to save note", true);
    }
  };

  const handleExplain = () => {
    if (!bookName || !chapter || !firstVerse) {
      console.warn("[BottomSheetToolbar] Missing verse data for Explain:", { bookName, bookId, chapter, firstVerse });
      return;
    }
    dismissSheet();
    router.push({ pathname: "/verse-explain" as any, params: { bookId, bookName, chapter, verse: String(firstVerse.verse), verseId: String(firstVerse.id), text: firstVerse.text, translation } });
  };

  const handleCompare = () => {
    if (!bookName || !chapter || !firstVerse) {
      console.warn("[BottomSheetToolbar] Missing verse data for Compare:", { bookName, bookId, chapter, firstVerse });
      return;
    }
    dismissSheet();
    router.push({ pathname: "/verse-actions" as any, params: { bookId, bookName, chapter, verse: String(firstVerse.verse), verseId: String(firstVerse.id), text: firstVerse.text, translation, tab: "compare" } });
  };

  const sheetBg = isDark ? DARK_SURFACE : "#FFFFFF";
  const labelColor = isDark ? "#AAAAAA" : "#666666";
  const iconColor = isDark ? DARK_TEXT : LIGHT_TEXT;

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)", opacity: overlayAnim, zIndex: 1000 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} />
      </Animated.View>
      <Animated.View
        style={[
          sheetStyles.sheet,
          {
            backgroundColor: sheetBg,
            paddingBottom: Math.max(bottomPad, Platform.OS === "android" ? 24 : 16) + 8,
            transform: [
              { translateY: Animated.add(slideAnim, dragY) },
            ],
            zIndex: 1001,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={sheetStyles.handleBar}>
          <View style={[sheetStyles.handle, { backgroundColor: isDark ? "#333333" : "#CCCCCC" }]} />
        </View>

        <View style={sheetStyles.selectedVerse}>
          <Text style={[sheetStyles.selectedRef, { color: "#6B6660" }]} numberOfLines={1}>
            {reference}
          </Text>
          <Text style={[sheetStyles.selectedText, { color: isDark ? DARK_TEXT : LIGHT_TEXT }]} numberOfLines={2}>
            {sheetPayload.preview}
          </Text>
        </View>

        {feedback ? (
          <View style={sheetStyles.feedbackRow}>
            <Ionicons
              name={feedback.isError ? "close-circle" : "checkmark-circle"}
              size={18}
              color={feedback.isError ? "#EF4444" : "#10B981"}
            />
            <Text
              style={[
                sheetStyles.feedbackText,
                { color: feedback.isError ? "#EF4444" : "#10B981" },
              ]}
            >
              {feedback.message}
            </Text>
          </View>
        ) : showNoteInput ? (
          <View style={sheetStyles.noteContainer}>
            <NoteFormattingToolbar
              noteText={noteText}
              onChangeText={setNoteText}
              isDark={isDark}
              noteInputRef={noteInputRef}
            />
            <TextInput
              ref={noteInputRef}
              style={[sheetStyles.noteInput, { color: isDark ? DARK_TEXT : LIGHT_TEXT, backgroundColor: isDark ? "#111111" : "#F5F5F5", borderColor: isDark ? "#2A2A2A" : "#E0E0E0" }]}
              placeholder="Write your note..."
              placeholderTextColor={isDark ? "#555" : "#AAA"}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              autoFocus
              maxLength={500}
            />
            <View style={sheetStyles.noteActions}>
              <Pressable onPress={() => setShowNoteInput(false)} style={sheetStyles.noteCancelBtn}>
                <Text style={[sheetStyles.noteCancelText, { color: isDark ? "#888" : "#999" }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveNote} style={sheetStyles.noteSaveBtn}>
                <Text style={sheetStyles.noteSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={sheetStyles.colorRow}>
              <Pressable
                onPress={handleClearHighlights}
                accessibilityLabel="Clear highlights"
                style={sheetStyles.underlineBtn}
              >
                <Ionicons name="remove-outline" size={20} color="#999" />
              </Pressable>
              <View style={sheetStyles.colorDots}>
                {CANON_HIGHLIGHTS.map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => handleHighlight(key)}
                    style={({ pressed }) => [
                      sheetStyles.colorDot,
                      { backgroundColor: HIGHLIGHT_COLORS[key].bg, opacity: pressed ? 0.6 : 1 },
                      activeColor === key && sheetStyles.colorDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={[sheetStyles.actionRow, { borderTopColor: isDark ? "#2A2A2A" : "#F0F0F0" }]}>
              <SheetAction icon="copy-outline" label="Copy" onPress={handleCopy} color={iconColor} labelColor={labelColor} />
              <SheetAction icon="bulb-outline" label="Explain" onPress={handleExplain} color={iconColor} labelColor={labelColor} />
              <SheetAction icon="create-outline" label="Note" onPress={() => setShowNoteInput(true)} color={iconColor} labelColor={labelColor} />
              <SheetAction icon="git-compare-outline" label="Compare" onPress={handleCompare} color={iconColor} labelColor={labelColor} />
              <SheetAction icon="bookmark-outline" label="Save" onPress={handleBookmark} color={iconColor} labelColor={labelColor} />
              <SheetAction icon="share-outline" label="Share" onPress={handleShare} color={iconColor} labelColor={labelColor} />
            </View>
          </>
        )}
      </Animated.View>
    </>
  );
}

function NoteFormattingToolbar({
  noteText,
  onChangeText,
  isDark,
  noteInputRef,
}: {
  noteText: string;
  onChangeText: (t: string) => void;
  isDark: boolean;
  noteInputRef: React.RefObject<TextInput | null>;
}) {
  const insertFormat = (prefix: string, suffix: string) => {
    const input = noteInputRef.current;
    if (!input) {
      onChangeText(noteText + prefix + suffix);
      return;
    }
    (input as any).focus?.();
    const cursor = noteText.length;
    const before = noteText.slice(0, cursor);
    const after = noteText.slice(cursor);
    onChangeText(before + prefix + suffix + after);
  };

  const handleBold = () => insertFormat("**", "**");
  const handleItalic = () => insertFormat("*", "*");
  const handleBullet = () => {
    const endsWithNewline = noteText.endsWith("\n") || noteText.length === 0;
    const prefix = endsWithNewline ? "- " : "\n- ";
    onChangeText(noteText + prefix);
  };
  const handleHeading = () => {
    const endsWithNewline = noteText.endsWith("\n") || noteText.length === 0;
    const prefix = endsWithNewline ? "## " : "\n## ";
    onChangeText(noteText + prefix);
  };

  const toolbarBg = isDark ? "#111111" : "#EEEEEE";
  const btnBg = isDark ? "#1A1A1A" : "#E0E0E0";
  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;

  return (
    <View style={[fmtStyles.toolbar, { backgroundColor: toolbarBg }]}>
      <Pressable onPress={handleBold} style={({ pressed }) => [fmtStyles.fmtBtn, { backgroundColor: btnBg, opacity: pressed ? 0.6 : 1 }]}>
        <Text style={[fmtStyles.fmtBtnText, { color: textColor, fontFamily: "Inter_700Bold" }]}>B</Text>
      </Pressable>
      <Pressable onPress={handleItalic} style={({ pressed }) => [fmtStyles.fmtBtn, { backgroundColor: btnBg, opacity: pressed ? 0.6 : 1 }]}>
        <Text style={[fmtStyles.fmtBtnText, { color: textColor, fontStyle: "italic" }]}>I</Text>
      </Pressable>
      <Pressable onPress={handleBullet} style={({ pressed }) => [fmtStyles.fmtBtn, { backgroundColor: btnBg, opacity: pressed ? 0.6 : 1 }]}>
        <Ionicons name="list-outline" size={16} color={textColor} />
      </Pressable>
      <Pressable onPress={handleHeading} style={({ pressed }) => [fmtStyles.fmtBtn, { backgroundColor: btnBg, opacity: pressed ? 0.6 : 1 }]}>
        <Text style={[fmtStyles.fmtBtnText, { color: textColor, fontFamily: "Inter_600SemiBold", fontSize: 13 }]}>H</Text>
      </Pressable>
    </View>
  );
}

const fmtStyles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    height: 32,
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  fmtBtn: {
    width: 36,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  fmtBtnText: {
    fontSize: 15,
  },
});

function SheetAction({ icon, label, onPress, color, labelColor }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; color: string; labelColor: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [sheetStyles.actionItem, { opacity: pressed ? 0.5 : 1 }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[sheetStyles.actionLabel, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

const sheetStyles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.25, shadowRadius: 16 },
      android: { elevation: 16 },
      web: { boxShadow: "0 -4px 24px rgba(0,0,0,0.3)" },
    }),
  },
  handleBar: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  selectedVerse: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  selectedRef: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  selectedText: {
    fontSize: 14,
    fontFamily: "Lora_400Regular_Italic",
    lineHeight: 20,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  underlineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDots: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorDotActive: {
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.9)",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 48,
  },
  actionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
  },
  feedbackText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  noteContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  noteInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: "top",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  noteCancelBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  noteCancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  noteSaveBtn: { backgroundColor: "#1F1A12", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  noteSaveText: { fontSize: 14, color: "#fff", fontFamily: "Inter_600SemiBold" },
});

const NAV_VERSE_WASH_HOLD_MS = 2000;
const NAV_VERSE_WASH_FADE_MS = 400;

export default function VerseReaderScreen() {
  const { bookId, chapter, translation: txParam, verse: verseParam, verseEnd: verseEndParam, verses: versesParam } = useLocalSearchParams<{ bookId: string; chapter: string; translation?: string; verse?: string; verseEnd?: string; verses?: string }>();
  const navigation = useNavigation();
  const useNewTypography = !READER_LEGACY_VERSE_BLOCKS;
  const segments = useSegments();
  const pathname = usePathname();
  const isTabReader = isBibleTabSegments(segments);
  const isScriptureOverlay = pathname === "/scripture";
  const canPopStack = useCanPopNestedStack();
  const handleReaderBack = useCallback(() => {
    if (isScriptureOverlay) {
      router.back();
      return;
    }
    goBibleReaderBack(router, canPopStack, isTabReader);
  }, [canPopStack, isScriptureOverlay, isTabReader]);
  const hardwareAtRoot = useCallback(() => {
    goBibleReaderBack(router, false, isTabReader);
  }, [isTabReader]);
  useHardwareBackToHomeWhenAtStackRoot(isTabReader || isScriptureOverlay, canPopStack, hardwareAtRoot);
  const { theme } = useTheme();
  const isDark = false; // reader-v2 is light-only; theme toggle slot arrives with global dark mode
  const { userId, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { translation: globalTranslation, setTranslation: setGlobalTranslation } = useTranslation();
  const { data: availableTranslations } = useTranslationCatalog();
  // Authoritative catalog wins once loaded; only entries with available !== false
  // are offered in pickers. Static fallback is public-domain only (never NKJV).
  const translationList = availableTranslations
    ? availableTranslations.filter((t) => t.available !== false).map((t) => t.abbreviation)
    : DEFAULT_TRANSLATIONS;
  const catalogLoaded = !!availableTranslations;
  const pickerCatalog = useMemo<CatalogTranslation[]>(
    () =>
      availableTranslations ??
      DEFAULT_TRANSLATIONS.map((code) => ({
        id: code,
        abbreviation: code,
        name: TRANSLATION_LABELS[code] ?? code,
        language: DEFAULT_TRANSLATION_LANGUAGES[code]?.tag ?? "en",
        languageName: DEFAULT_TRANSLATION_LANGUAGES[code]?.name ?? "English",
      })),
    [availableTranslations],
  );

  // Normalize the requested code (trim + uppercase) and keep it AS the request
  // identity. We never silently substitute KJV for an explicit URL translation
  // or the active global translation — the backend must return an explicit
  // translation/passage error so we can render an "unavailable" state instead
  // of relabeling another edition's text.
  const normalizeCode = useCallback((t: string | null | undefined): string => {
    return (t ?? "").trim().toUpperCase();
  }, []);
  const requestedTx = normalizeCode(txParam) || normalizeCode(globalTranslation) || "KJV";
  const [translation, setTranslationLocal] = useState<Translation>(requestedTx);
  const userOverrodeTranslation = useRef(false);
  const readerBasePath = isTabReader ? "/(tabs)/read" : "/read";
  const readerRoute = useCallback(
    (targetChapter: number) => {
      if (isScriptureOverlay) {
        return scriptureOverlayHref({
          bookId: String(bookId),
          chapter: targetChapter,
          translation,
        }) as any;
      }
      return `${readerBasePath}/${bookId}/${targetChapter}?translation=${encodeURIComponent(translation)}` as any;
    },
    [bookId, isScriptureOverlay, readerBasePath, translation],
  );

  useEffect(() => {
    userOverrodeTranslation.current = false;
  }, [txParam]);

  useEffect(() => {
    if (userOverrodeTranslation.current) return;
    const normalizedParam = normalizeCode(txParam);
    const normalizedGlobal = normalizeCode(globalTranslation);
    if (normalizedParam && normalizedParam !== translation) {
      // Honor the explicit URL translation as-is (no availability filtering);
      // the passage query will surface an explicit error if it is not licensed.
      setTranslationLocal(normalizedParam);
    } else if (!normalizedParam && normalizedGlobal && normalizedGlobal !== translation) {
      setTranslationLocal(normalizedGlobal);
    }
  }, [txParam, globalTranslation, translation, normalizeCode]);

  // Whether the resolved translation is absent from the authoritative catalog.
  // Used (together with a passage error) to render a "not licensed" state
  // instead of relabeling substituted text. Global selection is NOT changed.
  const translationUnavailable = catalogLoaded && !translationList.includes(translation);

  const setTranslation = useCallback((t: Translation) => {
    userOverrodeTranslation.current = true;
    setTranslationLocal(t);
    setGlobalTranslation(t);
  }, [setGlobalTranslation]);

  const [splitMode, setSplitMode] = useState(false);
  /** Device choice. Null until storage has been read, and when the device has never chosen. */
  const [savedSplitTranslation, setSavedSplitTranslation] = useState<string | null>(null);
  const splitTranslation = comparisonTranslation(translation, savedSplitTranslation);
  const [showSplitTranslationPicker, setShowSplitTranslationPicker] = useState(false);
  const splitScrollRef = useRef<ScrollView>(null);
  const isSyncingScroll = useRef(false);
  /** Reader column width; on web the app is a centred column narrower than the window. */
  const [readerWidth, setReaderWidth] = useState(0);
  const [headerChipsWidth, setHeaderChipsWidth] = useState(0);
  const headerTitleMaxWidth = readerHeaderTitleMaxWidth(readerWidth, headerChipsWidth);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      AsyncStorage.getItem(SPLIT_MODE_KEY),
      AsyncStorage.getItem(SPLIT_TRANSLATION_KEY),
    ]).then(([mode, saved]) => {
      if (cancelled) return;
      if (mode === "1") setSplitMode(true);
      setSavedSplitTranslation(saved || null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSetSplitTranslation = useCallback((t: string) => {
    setSavedSplitTranslation(t);
    AsyncStorage.setItem(SPLIT_TRANSLATION_KEY, t);
  }, []);

  const isSideBySide = readerWidth >= 600;
  /** Under 600px the second translation sits under each verse instead of a second pane. */
  const stackedSplit = splitMode && !isSideBySide;

  const { data: splitData, error: splitError } = useQuery<PassageResponse>({
    queryKey: [`/api/passage?book=${bookId}&chapter=${chapter}&translation=${splitTranslation}`],
    enabled: splitMode,
  });

  // If the stored split translation vanished from the authoritative catalog, do
  // NOT render another translation's text under its label — flag it unavailable.
  const splitUnavailable = catalogLoaded && !translationList.includes(splitTranslation);
  const translationDisplay = translationLabel(translation, availableTranslations);
  const splitTranslationLabel = translationLabel(splitTranslation, availableTranslations);
  const splitLoadFailed = !!splitError || splitUnavailable;
  // Compare shows headings from the reading version only; the comparison
  // version's own section titles would land under the wrong verse.
  const splitVerses = useMemo(
    () => withAcrosticHeadings(splitLoadFailed ? [] : (splitData?.verses ?? []), undefined).verses,
    [splitLoadFailed, splitData?.verses],
  );
  const splitVerseByNum = useMemo(
    () => new Map(splitVerses.map((v) => [v.verse, v])),
    [splitVerses],
  );

  const handlePrimaryScroll = useCallback((event: any) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    const y = event.nativeEvent.contentOffset.y;
    splitScrollRef.current?.scrollTo({ y, animated: false });
    setTimeout(() => { isSyncingScroll.current = false; }, 50);
  }, []);

  const handleSplitScroll = useCallback((event: any) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    const y = event.nativeEvent.contentOffset.y;
    scrollViewRef.current?.scrollTo({ y, animated: false });
    setTimeout(() => { isSyncingScroll.current = false; }, 50);
  }, []);

  const [selectedVerseNums, setSelectedVerseNums] = useState<number[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [localHighlightMap, setLocalHighlightMap] = useState<Map<string, HighlightColorKey>>(
    () => new Map(),
  );
  const [bookmarkOverride, setBookmarkOverride] = useState<boolean | null>(null);
  const [wordStudyMode, setWordStudyMode] = useState(false);
  const [wordStudyTarget, setWordStudyTarget] = useState<WordStudySheetTarget | null>(null);
  const [originalWordsVerse, setOriginalWordsVerse] = useState<{ id: string; verse: number } | null>(null);
  const verseInteractedAt = useRef(0);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [highlightedFromNav, setHighlightedFromNav] = useState<number | null>(null);
  const [navHighlightAlpha, setNavHighlightAlpha] = useState(0);
  const verseTapFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setSelectedVerseNums([]);
    setSheetOpen(false);
    setWordStudyTarget(null);
    setOriginalWordsVerse(null);
    setLocalHighlightMap(new Map());
    setBookmarkOverride(null);
  }, [bookId, chapter]);




  // reader-v2: text size (AA sheet), chapter picker, strip visibility
  const readingScale = useReadingFontScale();
  const fontScale = readingScale * useSystemFontScale();
  const [wordsOfChrist, setWordsOfChrist] = useState(true);
  const [showTextSizeSheet, setShowTextSizeSheet] = useState(false);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [showStudySheet, setShowStudySheet] = useState(false);
  const stripAnim = useRef(new Animated.Value(0)).current; // 0 shown, 1 hidden
  const stripHiddenRef = useRef(false);
  const [stripHidden, setStripHiddenState] = useState(false);
  const lastScrollY = useRef(0);
  const previewTouchY = useRef(0);

  const applyFontScale = useCallback((n: number) => {
    setReadingFontScale(n);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem(RED_LETTERS_STORAGE_KEY).then((value) => {
        if (active) setWordsOfChrist(redLettersFromStorage(value));
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const setStripHidden = useCallback((hidden: boolean) => {
    if (stripHiddenRef.current === hidden) return;
    stripHiddenRef.current = hidden;
    setStripHiddenState(hidden);
    Animated.timing(stripAnim, { toValue: hidden ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [stripAnim]);

  const handleReaderScroll = useCallback((event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const y = contentOffset.y;
    const dy = y - lastScrollY.current;
    lastScrollY.current = y;
    setStripHidden(
      floatingChromeHiddenAfterScroll({
        y,
        dy,
        viewportHeight: layoutMeasurement?.height ?? 0,
        contentHeight: contentSize?.height ?? 0,
        currentlyHidden: stripHiddenRef.current,
      }),
    );
  }, [setStripHidden]);

  const onPreviewChromeTouchStart = useCallback((event: any) => {
    previewTouchY.current = event.nativeEvent.pageY;
  }, []);

  const onPreviewChromeTouchEnd = useCallback((event: any) => {
    if (!stripHiddenRef.current) return;
    if (Math.abs(event.nativeEvent.pageY - previewTouchY.current) < 10) {
      setStripHidden(false);
    }
  }, [setStripHidden]);

  const [showVerseTapHint, setShowVerseTapHint] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(VERSE_TAP_HINT_KEY).then((val) => {
      if (!val) setShowVerseTapHint(true);
    });
  }, []);

  const dismissVerseTapHint = useCallback(() => {
    setShowVerseTapHint(false);
    AsyncStorage.setItem(VERSE_TAP_HINT_KEY, "1");
  }, []);

  const motion = usePrefersReducedMotion();
  const [hintHiddenAt, setHintHiddenAt] = useState<number | null | undefined>(undefined);
  const [wordStudyHintOn, setWordStudyHintOn] = useState(false);
  const [wordStudyPulse, setWordStudyPulse] = useState(0);
  const wordStudyWasOn = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(WORD_STUDY_HINT_KEY)
      .then((val) => {
        const stored = val == null || val === "" ? NaN : Number(val);
        setHintHiddenAt(Number.isFinite(stored) ? stored : null);
      })
      .catch(() => setHintHiddenAt(null));
  }, []);
  useEffect(() => {
    if (hintHiddenAt === undefined || !motion.ready) return;
    const turnedOn = wordStudyMode && !wordStudyWasOn.current;
    if (!wordStudyMode) {
      setWordStudyHintOn(false);
    } else if (turnedOn) {
      setWordStudyHintOn(wordStudyHintReturns(hintHiddenAt, Date.now()));
      if (!motion.reduced) setWordStudyPulse((n) => n + 1);
    }
    wordStudyWasOn.current = wordStudyMode;
  }, [wordStudyMode, hintHiddenAt, motion.ready, motion.reduced]);
  const dismissWordStudyHint = useCallback(() => {
    const hiddenAt = Date.now();
    setWordStudyHintOn(false);
    setHintHiddenAt(hiddenAt);
    AsyncStorage.setItem(WORD_STUDY_HINT_KEY, String(hiddenAt)).catch(() => {});
  }, []);
  const wordStudyHint = wordStudyHintCopy(Number(bookId));


  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: [`/api/highlights/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/${userId}`] });
    }, [userId])
  );

  const { data, isLoading, error } = useQuery<PassageResponse>({
    queryKey: [`/api/passage?book=${bookId}&chapter=${chapter}&translation=${translation}`],
  });

  const sessionHighlights = useSyncExternalStore(
    subscribeSessionHighlights,
    getSessionHighlights,
    getSessionHighlights,
  );
  useEffect(() => {
    if (isAuthenticated) return;
    setLocalHighlightMap(() => {
      const next = new Map<string, HighlightColorKey>();
      for (const row of sessionHighlights) {
        if (row.startWord != null || row.endWord != null) continue;
        next.set(row.verseId, (row.color as HighlightColorKey) || "yellow");
      }
      return next;
    });
  }, [isAuthenticated, sessionHighlights]);
  const { data: highlightsData } = useQuery<{
    id: string;
    verseId: string;
    color: string;
    startWord?: number | null;
    endWord?: number | null;
    bookId?: number;
    chapter?: number;
    verse?: number;
    verseText?: string | null;
    bookName?: string | null;
  }[]>({
    queryKey: [`/api/highlights/${userId}`],
  });

  const { data: bookmarksData } = useQuery<{ id: string; verseId: string; label: string; bookId?: number; chapter?: number; verse?: number }[]>({
    queryKey: [`/api/bookmarks/${userId}`],
  });

  const highlightColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (highlightsData) {
      for (const h of highlightsData) {
        if (isPartialWordRange(h)) continue;
        map.set(h.verseId, h.color);
        if (h.bookId && h.chapter && h.verse) {
          map.set(`${h.bookId}:${h.chapter}:${h.verse}`, h.color);
        }
      }
    }
    return map;
  }, [highlightsData]);

  const bookmarkedVerseIds = useMemo(() => {
    const set = new Set<string>();
    if (bookmarksData) {
      for (const b of bookmarksData) {
        set.add(b.verseId);
        if (b.bookId && b.chapter && b.verse) {
          set.add(`${b.bookId}:${b.chapter}:${b.verse}`);
        }
      }
    }
    return set;
  }, [bookmarksData]);

  const routeBookId = Array.isArray(bookId) ? bookId[0] : bookId;
  const routeChapter = Array.isArray(chapter) ? chapter[0] ?? "" : chapter ?? "";
  const bookName = data?.book?.name || bibleBookName(routeBookId);
  const headerLabel = `${bookName} ${routeChapter}`.trim();
  useLayoutEffect(() => {
    navigation.setOptions({ title: headerLabel });
  }, [navigation, headerLabel]);
  const totalChapters = data?.book?.chapterCount ?? 0;
  const translationChapterCount = data?.translationChapterCount ?? totalChapters;
  const chapterNum = Number(chapter);

  const canGoPrev = chapterNum > 1;
  const canGoNext = chapterNum < totalChapters;

  const primaryAcrostic = useMemo(
    () => withAcrosticHeadings(data?.verses ?? [], data?.providerContent?.headings),
    [data?.verses, data?.providerContent?.headings],
  );
  const verses = primaryAcrostic.verses;
  const [paintedCount, setPaintedCount] = useState(24);
  useEffect(() => {
    const jump = Number(verseParam);
    setPaintedCount(Math.max(24, Number.isFinite(jump) && jump > 0 ? jump : 0));
  }, [bookId, chapter, translation, verseParam]);
  useEffect(() => {
    if (paintedCount >= verses.length) return;
    const frame = requestAnimationFrame(() => {
      setPaintedCount((count) => Math.min(verses.length, count + 36));
    });
    return () => cancelAnimationFrame(frame);
  }, [paintedCount, verses.length]);
  const visibleVerses = paintedCount >= verses.length ? verses : verses.slice(0, paintedCount);
  const wordRanges = useMemo((): VerseWordRangeHighlight[] => {
    const rows: VerseWordRangeHighlight[] = [];
    const seen = new Set<string>();
    const push = (verseId: string, start: number, end: number, color: string) => {
      const key = `${verseId}:${start}:${end}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ verseId, start, end, color });
    };
    for (const row of highlightsData ?? []) {
      if (!isPartialWordRange(row)) continue;
      push(row.verseId, row.startWord, row.endWord, row.color);
    }
    if (!isAuthenticated) {
      for (const row of sessionHighlights) {
        if (!isPartialWordRange(row)) continue;
        push(row.verseId, row.startWord, row.endWord, row.color);
      }
    }
    return rows;
  }, [highlightsData, isAuthenticated, sessionHighlights]);

  useEffect(() => {
    if (!verseParam) return;
    const vNum = parseInt(verseParam, 10);
    if (isNaN(vNum) || verses.length === 0) return;

    const listed = (versesParam ?? "")
      .split(",")
      .map((piece) => parseInt(piece, 10))
      .filter((verse) => Number.isInteger(verse) && verse > 0);
    const endNum = verseEndParam ? parseInt(verseEndParam, 10) : NaN;
    const wanted = listed.length > 0
      ? listed
      : Number.isInteger(endNum) && endNum >= vNum
        ? Array.from({ length: endNum - vNum + 1 }, (_, index) => vNum + index)
        : [];
    if (wanted.length > 0) {
      const present = new Set(verses.map((verse) => verse.verse));
      const selected = wanted.filter((verse) => present.has(verse));
      if (selected.length > 0) {
        setSelectedVerseNums(selected);
        setSheetOpen(true);
      }
    }

    setHighlightedFromNav(vNum);
    setNavHighlightAlpha(1);

    let mounted = true;
    let fadeInterval: ReturnType<typeof setInterval> | null = null;
    let scrollRetry: ReturnType<typeof setTimeout> | null = null;
    let tries = 0;

    const tryScroll = () => {
      if (!mounted) return;
      if (scrollDomToVerse(vNum)) return;
      tries += 1;
      if (tries < 16) {
        scrollRetry = setTimeout(tryScroll, 120);
      }
    };
    const scrollStart = setTimeout(tryScroll, 80);

    const fadeStart = setTimeout(() => {
      if (!mounted) return;
      const steps = 8;
      let step = 0;
      fadeInterval = setInterval(() => {
        step += 1;
        if (!mounted) {
          if (fadeInterval) clearInterval(fadeInterval);
          return;
        }
        setNavHighlightAlpha(1 - step / steps);
        if (step >= steps) {
          if (fadeInterval) clearInterval(fadeInterval);
          setHighlightedFromNav(null);
        }
      }, NAV_VERSE_WASH_FADE_MS / steps);
    }, NAV_VERSE_WASH_HOLD_MS);

    return () => {
      mounted = false;
      clearTimeout(scrollStart);
      if (scrollRetry) clearTimeout(scrollRetry);
      clearTimeout(fadeStart);
      if (fadeInterval) clearInterval(fadeInterval);
    };
  }, [verseEndParam, verseParam, verses, versesParam]);

  const kjvWordStudy = isKjvTranslation(translation);
  const chapterStrongEnabled = kjvWordStudy && (wordStudyMode || !!originalWordsVerse);
  const { data: chapterStrongMaps, isFetching: chapterStrongFetching } = useQuery<Record<string, ReaderStrongMap[]>>({
    queryKey: [`/api/strong/chapter/${bookId}/${chapterNum}?translation=KJV`],
    enabled: chapterStrongEnabled && Number.isFinite(Number(bookId)) && Number.isFinite(chapterNum),
  });
  const mapsByVerseId = useMemo(() => {
    const map = new Map<string, ReaderStrongMap[]>();
    if (!chapterStrongEnabled || !chapterStrongMaps) return map;
    for (const [verseId, rows] of Object.entries(chapterStrongMaps)) {
      if (Array.isArray(rows)) map.set(verseId, rows);
    }
    return map;
  }, [chapterStrongEnabled, chapterStrongMaps]);
  const originalWordsMaps = useMemo(
    () => (originalWordsVerse ? mapsByVerseId.get(originalWordsVerse.id) ?? [] : []),
    [originalWordsVerse, mapsByVerseId],
  );
  const originalWordsRows = useMemo(
    () => originalWordsFromStepMaps(originalWordsMaps),
    [originalWordsMaps],
  );
  const originalWordsLoading = !!originalWordsVerse
    && !mapsByVerseId.has(originalWordsVerse.id)
    && chapterStrongFetching;
  const selectedVerseSet = useMemo(() => new Set(selectedVerseNums), [selectedVerseNums]);
  const selectedVerseObjs = useMemo(
    () => verses.filter((v) => selectedVerseSet.has(v.verse)).sort((a, b) => a.verse - b.verse),
    [verses, selectedVerseSet],
  );
  const selectedHighlightIds = useMemo(
    () => highlightIdsForVerses(highlightsData ?? [], selectedVerseObjs, Number(bookId), chapterNum),
    [highlightsData, selectedVerseObjs, bookId, chapterNum],
  );
  const selectedBookmarkIds = useMemo(
    () => bookmarkIdsForVerses(bookmarksData ?? [], selectedVerseObjs, Number(bookId), chapterNum),
    [bookmarksData, selectedVerseObjs, bookId, chapterNum],
  );
  const activeSheetColor = useMemo((): VerseSheetHighlightKey | null => {
    const first = selectedVerseObjs[0];
    if (!first) return null;
    const raw =
      localHighlightMap.get(first.id) ??
      highlightColorMap.get(first.id) ??
      highlightColorMap.get(`${bookId}:${chapterNum}:${first.verse}`);
    if (!raw) return null;
    if (raw === "orange" || raw === "pink") return "rose";
    const mapped = (LEGACY_HIGHLIGHT_MAP[raw as HighlightColorKey] ?? raw) as string;
    return VERSE_SHEET_HIGHLIGHTS.some((dot) => dot.key === mapped)
      ? (mapped as VerseSheetHighlightKey)
      : null;
  }, [selectedVerseObjs, localHighlightMap, highlightColorMap, bookId, chapterNum]);
  const selectionBookmarked = bookmarkOverride ?? (
    selectedVerseObjs.length > 0 && selectedVerseObjs.every((v) =>
      bookmarkedVerseIds.has(v.id) || bookmarkedVerseIds.has(`${bookId}:${chapterNum}:${v.verse}`),
    )
  );

  useEffect(() => {
    setBookmarkOverride(null);
  }, [selectedVerseNums.join(",")]);
  // Do not infer headings from KJV verse text. These maps are populated only
  // when the provider explicitly returned its own chapter structure.
  const providerHeadings = primaryAcrostic.headingsByVerse;
  const providerParagraphStarts = useMemo(
    () => new Set((data?.providerContent?.paragraphs ?? []).map((paragraph) => paragraph.verseStart)),
    [data?.providerContent?.paragraphs]
  );

  const audio = useBibleAudio(verses, bookId, chapter, translation, scrollViewRef, bookName);
  const { handleStop: audioHandleStop } = audio;

  const readingHistoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!data?.book?.name || !bookId || !chapter) return;

    if (readingHistoryTimerRef.current) {
      clearTimeout(readingHistoryTimerRef.current);
      readingHistoryTimerRef.current = null;
    }

    const bookNameSnapshot = data.book.name;
    const bookIdNum = Number(bookId);
    const chapterNum = Number(chapter);

    readingHistoryTimerRef.current = setTimeout(() => {
      readingHistoryTimerRef.current = null;
      apiRequest("POST", withDeviceTimeZone("/api/reading-history"), {
        userId,
        bookId: bookIdNum,
        bookName: bookNameSnapshot,
        chapter: chapterNum,
        translation,
      })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/reading-history/recent?userId=${userId}`] });
          queryClient.invalidateQueries({ queryKey: [withDeviceTimeZone(`/api/reading-streaks?userId=${userId}`)] });
          queryClient.invalidateQueries({ queryKey: [`/api/spiritual-rings?userId=${userId}`] });
          queryClient.invalidateQueries({ queryKey: [withDeviceTimeZone(`/api/reading-streaks/weekly?userId=${userId}`)] });
        })
        .catch(() => {});
    }, 60_000);

    return () => {
      if (readingHistoryTimerRef.current) {
        clearTimeout(readingHistoryTimerRef.current);
        readingHistoryTimerRef.current = null;
      }
    };
  }, [data?.book?.name, bookId, chapter, translation, userId]);

  const prefetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data?.verses?.length || !bookId || !chapter) return;
    if (!isAuthenticated) return;
    const prefetchKey = `${bookId}-${chapter}-${translation}`;
    if (prefetchedRef.current === prefetchKey) return;
    prefetchedRef.current = prefetchKey;

    const bId = Number(bookId);
    const ch = Number(chapter);
    queryClient.prefetchQuery({ queryKey: [`/api/chapter-context/${bId}/${ch}`] });
  }, [data?.verses, bookId, chapter, translation, isAuthenticated]);

  const goToPrev = useCallback(() => {
    if (canGoPrev) {
      audioHandleStop();
      router.replace(readerRoute(chapterNum - 1));
    }
  }, [chapterNum, canGoPrev, audioHandleStop, readerRoute]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      audioHandleStop();
      router.replace(readerRoute(chapterNum + 1));
    }
  }, [chapterNum, canGoNext, audioHandleStop, readerRoute]);

  const tabBarClearance = readerTabBarClearance(
    isTabReader || Platform.OS === "web",
    isTabReader && Platform.OS !== "web" ? nativeTabBarHeight(insets.bottom) : undefined,
    Platform.OS,
  );
  const safeBottom = Platform.OS === "web" ? (tabBarClearance > 0 ? 0 : 34) : insets.bottom;
  const bottomPad = tabBarClearance > 0 ? tabBarClearance : safeBottom;
  const chromeBottom = readerChromeBottom(tabBarClearance, safeBottom);
  const readerScrollBottomPad = readingScrollPad({
    tabBarHeight: tabBarClearance,
    safeBottom,
    fontScale,
    chromeHeight: sheetOpen && !wordStudyMode ? VERSE_SHEET_COLLAPSED_HEIGHT : READER_FLOATING_CHROME_HEIGHT,
  });
  const listenClearance =
    !audio.isActive && !sheetOpen && !wordStudyTarget
      ? chromeBottom + READER_FLOATING_CHROME_HEIGHT
      : 0;

  const handleVerseTap = useCallback((item: Verse) => {
    if (wordStudyMode) return;
    verseInteractedAt.current = Date.now();
    if (useNewTypography) setStripHidden(false);
    if (showVerseTapHint) dismissVerseTapHint();
    Haptics.selectionAsync();
    setSelectedVerseNums((prev) => {
      const next = toggleVerseSelection(prev, item.verse);
      setSheetOpen(next.length > 0);
      return next;
    });
  }, [wordStudyMode, useNewTypography, setStripHidden, showVerseTapHint, dismissVerseTapHint]);

  const handleVerseLongPress = handleVerseTap;

  const dismissToolbar = useCallback(() => {
    setSheetOpen(false);
    setSelectedVerseNums([]);
  }, []);

  const handleReaderBackgroundPress = useCallback(() => {
    if (Date.now() - verseInteractedAt.current < 250) return;
    if (useNewTypography) setStripHidden(false);
    dismissToolbar();
  }, [dismissToolbar, useNewTypography, setStripHidden]);

  // A.3 strip actions
  const [stripToast, setStripToast] = useState<string | null>(null);
  const stripToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showStripToast = useCallback((msg: string) => {
    setStripToast(msg);
    if (stripToastTimer.current) clearTimeout(stripToastTimer.current);
    stripToastTimer.current = setTimeout(() => setStripToast(null), 2800);
  }, []);
  useEffect(() => () => { if (stripToastTimer.current) clearTimeout(stripToastTimer.current); }, []);

  const toggleSplitMode = useCallback(() => {
    const next = !splitMode;
    setSplitMode(next);
    AsyncStorage.setItem(SPLIT_MODE_KEY, next ? "1" : "0");
    showStripToast(next ? "Compare on" : "Compare off");
  }, [splitMode, showStripToast]);

  useEffect(() => {
    if (!kjvWordStudy && wordStudyMode) setWordStudyMode(false);
  }, [kjvWordStudy, wordStudyMode]);

  const toggleWordStudyMode = useCallback(() => {
    if (!kjvWordStudy) {
      showStripToast("Word study is available in the KJV");
      return;
    }
    setWordStudyMode((on) => {
      const next = !on;
      if (next) {
        setSelectedVerseNums([]);
        setSheetOpen(false);
      }
      return next;
    });
  }, [kjvWordStudy, showStripToast]);

  const handleWordActivate = useCallback((
    surface: string,
    mapping: ReaderStrongMap,
    verseNum?: number,
    verseText?: string,
  ) => {
    Haptics.selectionAsync();
    setSheetOpen(false);
    const fromVerse = typeof verseNum === "number"
      ? verses.find((item) => item.verse === verseNum)?.text
      : undefined;
    setWordStudyTarget({
      surface,
      mapping,
      bookName: bookName ?? "",
      chapter: chapterNum,
      verse: verseNum,
      verseText: verseText || fromVerse,
    });
  }, [bookName, chapterNum, verses]);

  const firstVerseId = verses[0]?.id;
  const chapterBookmarked = firstVerseId
    ? bookmarkedVerseIds.has(firstVerseId) || bookmarkedVerseIds.has(`${bookId}:${chapterNum}:1`)
    : false;

  const handleChapterBookmark = useCallback(async () => {
    if (!isAuthenticated) { showStripToast("Sign in to save"); return; }
    if (!firstVerseId) return;
    try {
      await apiRequest("POST", "/api/bookmarks", { userId, verseId: firstVerseId, label: `${bookName} ${chapter}` });
      queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/${userId}`] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showStripToast("Chapter saved");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showStripToast("Failed to save");
    }
  }, [isAuthenticated, firstVerseId, userId, bookName, chapter, showStripToast]);

  const handleRemoveHighlight = useCallback(async () => {
    if (selectedVerseObjs.length === 0) { showStripToast("Tap a verse first"); return; }
    if (!isAuthenticated || !userId) {
      for (const row of getSessionHighlights()) {
        if (selectedVerseObjs.some((verse) => verse.id === row.verseId)) {
          removeSessionHighlight(row.id);
        }
      }
      setLocalHighlightMap((prev) => {
        const next = new Map(prev);
        for (const v of selectedVerseObjs) next.delete(v.id);
        return next;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showStripToast("Highlight removed");
      return;
    }
    try {
      await Promise.all(
        selectedHighlightIds.map((id) => apiRequest("DELETE", `/api/highlights/${id}`)),
      );
      setLocalHighlightMap((prev) => {
        const next = new Map(prev);
        for (const v of selectedVerseObjs) next.delete(v.id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: [`/api/highlights/${userId}`] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showStripToast("Highlight removed");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showStripToast("Failed to remove");
    }
  }, [selectedVerseObjs, isAuthenticated, userId, selectedHighlightIds, showStripToast]);

  const handleStripHighlight = useCallback(async (color: HighlightColorKey) => {
    if (selectedVerseObjs.length === 0) { showStripToast("Tap a verse first"); return; }
    if (activeSheetColor === color) {
      await handleRemoveHighlight();
      return;
    }
    if (!isAuthenticated || !userId) {
      for (const v of selectedVerseObjs) {
        addSessionHighlight({
          verseId: v.id,
          color,
          startWord: null,
          endWord: null,
          bookId: Number(bookId) || null,
          chapter: chapterNum,
          verse: v.verse,
          verseText: v.text,
          bookName: bookName || null,
        });
      }
      setLocalHighlightMap((prev) => {
        const next = new Map(prev);
        for (const v of selectedVerseObjs) next.set(v.id, color);
        return next;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showStripToast("Sign in to save highlights");
      return;
    }
    try {
      if (selectedHighlightIds.length > 0) {
        await Promise.all(
          selectedHighlightIds.map((id) => apiRequest("DELETE", `/api/highlights/${id}`)),
        );
      }
      await Promise.all(
        selectedVerseObjs.map((v) => apiRequest("POST", "/api/highlights", { userId, verseId: v.id, color })),
      );
      setLocalHighlightMap((prev) => {
        const next = new Map(prev);
        for (const v of selectedVerseObjs) next.set(v.id, color);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: [`/api/highlights/${userId}`] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showStripToast("Highlighted");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showStripToast("Failed to highlight");
    }
  }, [selectedVerseObjs, isAuthenticated, userId, showStripToast, activeSheetColor, handleRemoveHighlight, selectedHighlightIds, bookId, chapterNum, bookName]);

  const selectionPayload = useMemo(
    () =>
      buildHighlightSheetPayload({
        bookName: bookName ?? "",
        chapter: chapter as string,
        translation,
        verses: selectedVerseObjs,
      }),
    [bookName, chapter, translation, selectedVerseObjs],
  );

  const handleSelectionBookmark = useCallback(async () => {
    if (!isAuthenticated) { showStripToast("Sign in to save"); return; }
    if (selectedVerseObjs.length === 0) return;
    try {
      if (selectionBookmarked) {
        await Promise.all(
          selectedBookmarkIds.map((id) => apiRequest("DELETE", `/api/bookmarks/${id}`)),
        );
        queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/${userId}`] });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setBookmarkOverride(false);
        showStripToast("Bookmark removed");
        return;
      }
      await Promise.all(
        selectedVerseObjs.map((v) =>
          apiRequest("POST", "/api/bookmarks", {
            userId,
            verseId: v.id,
            label: formatVerseRangeLabel(bookName ?? "", chapter as string, [v.verse]),
          }),
        ),
      );
      queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/${userId}`] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBookmarkOverride(true);
      showStripToast("Bookmarked");
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = err instanceof Error ? err.message : "";
      showStripToast(/401|Authentication required/i.test(message) ? "Sign in to save" : "Failed to save");
    }
  }, [isAuthenticated, selectedVerseObjs, userId, bookName, chapter, showStripToast, selectionBookmarked, selectedBookmarkIds]);

  const handleSelectionCopy = useCallback(async () => {
    await Clipboard.setStringAsync(selectionPayload.copyText);
    showStripToast("Copied");
  }, [selectionPayload.copyText, showStripToast]);

  const handleSelectionShare = useCallback(async () => {
    try {
      await Share.share({ message: selectionPayload.copyText });
    } catch {
      /* user cancelled */
    }
  }, [selectionPayload.copyText]);

  const studyVerseRef = useRef<number | null>(null);
  const handleWordRange = useCallback(async (verseId: string, start: number, end: number) => {
    if (wordStudyMode) return;
    const verse = verses.find((item) => item.id === verseId);
    if (!verse) return;
    if (!isAuthenticated || !userId) {
      addSessionHighlight({
        verseId,
        color: "yellow",
        startWord: start,
        endWord: end,
        bookId: Number(bookId) || null,
        chapter: chapterNum,
        verse: verse.verse,
        verseText: verse.text,
        bookName: bookName || null,
      });
      showStripToast("Highlighted");
      return;
    }
    try {
      await apiRequest("POST", "/api/highlights", {
        userId,
        verseId,
        color: "yellow",
        startWord: start,
        endWord: end,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/highlights/${userId}`] });
      showStripToast("Highlighted");
    } catch {
      showStripToast("Failed to highlight");
    }
  }, [wordStudyMode, verses, isAuthenticated, userId, bookId, chapterNum, bookName, showStripToast]);

  const handleStudyInKjv = useCallback(() => {
    const verse = selectedVerseObjs[0];
    if (!verse) return;
    studyVerseRef.current = verse.verse;
    setTranslation("KJV");
    setWordStudyMode(true);
    setSheetOpen(false);
    setSelectedVerseNums([]);
  }, [selectedVerseObjs, setTranslation]);

  useEffect(() => {
    if (!kjvWordStudy || studyVerseRef.current == null || verses.length === 0) return;
    const verseNum = studyVerseRef.current;
    studyVerseRef.current = null;
    const start = setTimeout(() => scrollDomToVerse(verseNum), 120);
    return () => clearTimeout(start);
  }, [kjvWordStudy, verses]);

  const getHighlightBg = useCallback((verseId: string, verseNum: number, index: number): string => {
    if (highlightedFromNav === verseNum) {
      if (navHighlightAlpha >= 1) return VERSE_SELECTION_WASH;
      return `rgba(31,26,18,${0.1 * Math.max(0, navHighlightAlpha)})`;
    }
    if (index === audio.speakingVerseIndex) {
      return "rgba(255, 241, 118, 0.28)";
    }
    const hColor =
      localHighlightMap.get(verseId) ??
      highlightColorMap.get(verseId) ??
      highlightColorMap.get(`${bookId}:${chapterNum}:${verseNum}`);
    if (hColor) {
      const c = canonHighlightBg(hColor);
      if (c) return c + "50";
      return "rgba(255, 241, 118, 0.28)";
    }
    return "transparent";
  }, [highlightedFromNav, navHighlightAlpha, audio.speakingVerseIndex, highlightColorMap, localHighlightMap, bookId, chapterNum]);

  const readerBg = RV2_SURFACE;
  const textColor = RV2_INK;
  const verseNumColor = RV2_INK_MUTED; // WCAG-safe grey — never coral, never gold
  const chapterNumColor = useNewTypography ? RV2_INK : "rgba(31,26,18,0.07)";
  const headerPillBg = RV2_PILL;
  const headerBorderColor = RV2_BORDER;

  // Android applies a nested span's lineHeight to the whole paragraph, so the
  // verse number must carry the verse's line height or every line collapses.
  const verseNumInlineScaled = {
    color: verseNumColor,
    fontSize: Math.min(11 * fontScale, 18 * fontScale * 0.62),
    lineHeight: 32 * fontScale,
  };

  const compareBar = splitMode ? (
    <View style={styles.compareBar} testID="compare-bar">
      <Text style={styles.compareBarText} numberOfLines={1} maxFontSizeMultiplier={READING_CHROME_FONT_CAP}>
        {splitLoadFailed
          ? `${splitTranslationLabel} unavailable. Compare ${translationDisplay} with`
          : `Comparing ${translationDisplay} with`}
      </Text>
      <Pressable
        testID="split-translation-pill"
        accessibilityRole="button"
        accessibilityLabel={`Second translation ${splitTranslationLabel}, change`}
        hitSlop={8}
        onPress={() => setShowSplitTranslationPicker(!showSplitTranslationPicker)}
        style={[styles.compareBarVersion, { backgroundColor: headerPillBg }]}
      >
        <Text style={styles.compareBarVersionText} numberOfLines={1} maxFontSizeMultiplier={READING_CHROME_FONT_CAP}>
          {splitTranslationLabel}
        </Text>
        <Ionicons name="chevron-down" size={12} color={RV2_INK} />
      </Pressable>
      {showSplitTranslationPicker ? (
        <View
          style={[styles.translationDropdownAbsolute, styles.compareDropdown, { backgroundColor: LIGHT_SURFACE, borderColor: "#E0E0E0" }]}
          onStartShouldSetResponder={() => true}
        >
          <TranslationPickerList
            catalog={pickerCatalog}
            selected={splitTranslation}
            exclude={translation}
            maxHeight={360}
            testID="split-translation-picker"
            onSelect={(t) => {
              handleSetSplitTranslation(t);
              setShowSplitTranslationPicker(false);
            }}
          />
        </View>
      ) : null}
    </View>
  ) : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: headerLabel,
          headerStyle: { backgroundColor: readerBg },
          headerShadowVisible: false,
          headerTintColor: textColor,
          headerLeft: () => (
            <Pressable
              onPress={handleReaderBack}
              hitSlop={12}
              style={styles.headerIconBtn}
              testID="bible-reader-back"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color={textColor} />
            </Pressable>
          ),
          headerTitle: () => (
            <Pressable
              onPress={() => setShowChapterPicker(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={headerLabel ? `${headerLabel}, open chapter selector` : "Open chapter selector"}
              style={[styles.headerTitleButton, headerTitleMaxWidth !== undefined && { maxWidth: headerTitleMaxWidth }]}
              testID="reader-header-title"
            >
              <Text
                style={[styles.headerTitleText, { color: textColor }]}
                numberOfLines={1} ellipsizeMode="tail"
                maxFontSizeMultiplier={READING_CHROME_FONT_CAP}
              >
                {headerLabel}
              </Text>
              <Ionicons name="chevron-down" size={14} color={RV2_INK_MUTED} />
            </Pressable>
          ),
          headerRight: () => (
            <View
              style={styles.headerRow}
              testID="reader-header-chips"
              onLayout={(event) => setHeaderChipsWidth(Math.ceil(event.nativeEvent.layout.width))}
            >
              <Pressable
                testID="reader-word-study-toggle"
                accessibilityRole="button"
                accessibilityState={{ selected: kjvWordStudy && wordStudyMode }}
                accessibilityLabel={
                  kjvWordStudy
                    ? wordStudyMode
                      ? "Turn off Word Study"
                      : "Turn on Word Study"
                    : "Word study is available in the KJV"
                }
                hitSlop={8}
                onPress={toggleWordStudyMode}
                style={[styles.headerToggle, kjvWordStudy && wordStudyMode && styles.headerToggleOn]}
              >
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={READING_CHROME_FONT_CAP}
                  style={[
                    styles.headerToggleText,
                    kjvWordStudy && wordStudyMode && styles.headerToggleTextOn,
                  ]}
                >
                  Word study
                </Text>
              </Pressable>
              <Pressable
                testID="split-screen-toggle"
                accessibilityRole="button"
                accessibilityState={{ selected: splitMode }}
                accessibilityLabel={splitMode ? "Turn off Compare" : "Turn on Compare"}
                hitSlop={8}
                onPress={toggleSplitMode}
                style={[styles.headerToggle, splitMode && styles.headerToggleOn]}
              >
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={READING_CHROME_FONT_CAP}
                  style={[styles.headerToggleText, splitMode && styles.headerToggleTextOn]}
                >
                  Compare
                </Text>
              </Pressable>
              <Pressable
                hitSlop={12}
                onPress={() => setShowTextSizeSheet(true)}
                accessibilityLabel="Text size"
                accessibilityRole="button"
                style={styles.headerIconBtn}
              >
                <Text
                  maxFontSizeMultiplier={READING_CHROME_FONT_CAP}
                  style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: RV2_INK, letterSpacing: -0.5 }}
                >
                  AA
                </Text>
              </Pressable>
              <View>
                <Pressable
                  hitSlop={12}
                  onPress={() => setShowTranslationPicker(!showTranslationPicker)}
                  style={[styles.headerPill, { backgroundColor: headerPillBg }]}
                  testID="reader-translation-pill"
                  accessibilityRole="button"
                  accessibilityLabel={`Translation ${translationDisplay}, change`}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="globe-outline" size={13} color={isDark ? "#AAAAAA" : RV2_INK_MUTED} />
                    <Text
                      style={[styles.translationBadgeText, { color: isDark ? "#AAAAAA" : RV2_INK_MUTED }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      maxFontSizeMultiplier={READING_CHROME_FONT_CAP}
                    >
                      {translationDisplay}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          ),
        }}
      />
      <View
        style={[styles.container, { backgroundColor: readerBg }]}
        onLayout={(event) => setReaderWidth(event.nativeEvent.layout.width)}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={RV2_INK_MUTED} />
          </View>
        ) : (translationUnavailable || error) ? (
          <View style={styles.errorContainer}>
            <Ionicons
              name={translationUnavailable ? "lock-closed-outline" : "alert-circle-outline"}
              size={40}
              color={theme.error}
            />
            <Text style={[styles.errorText, { color: textColor, fontFamily: "Lora_500Medium" }]}>
              {translationUnavailable ? `${translationDisplay} unavailable` : "Unable to load passage"}
            </Text>
            <Text style={[styles.errorSub, { color: isDark ? DARK_MUTED : "#999", fontFamily: "Inter_400Regular" }]}>
              {translationUnavailable
                ? "This translation isn't licensed or available. Choose another translation to continue reading."
                : (error as Error).message}
            </Text>
            {catalogLoaded && translationList.length > 0 && (
              <View
                style={[
                  styles.translationDropdown,
                  { marginTop: 20, alignSelf: "stretch", marginHorizontal: 24, backgroundColor: LIGHT_SURFACE, borderColor: RV2_BORDER },
                ]}
              >
                <TranslationPickerList
                  catalog={pickerCatalog}
                  selected={translation}
                  maxHeight={360}
                  onSelect={(t) => setTranslation(t)}
                />
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Close overlays — sit below the dropdowns */}
            {showTranslationPicker && (
              <Pressable
                style={[StyleSheet.absoluteFill, { zIndex: 50 }]}
                onPress={() => setShowTranslationPicker(false)}
              />
            )}
            {showSplitTranslationPicker && (
              <Pressable
                style={[StyleSheet.absoluteFill, { zIndex: 50 }]}
                onPress={() => setShowSplitTranslationPicker(false)}
              />
            )}

            {/* Translation picker — absolutely positioned ABOVE the close overlay */}
            {showTranslationPicker && (
              <View
                style={[
                  styles.translationDropdownAbsolute,
                  { backgroundColor: isDark ? "#141416" : LIGHT_SURFACE, borderColor: isDark ? "#2A2A2A" : "#E0E0E0" },
                ]}
                onStartShouldSetResponder={() => true}
              >
                <TranslationPickerList
                  catalog={pickerCatalog}
                  selected={translation}
                  testID="reader-translation-picker"
                  onSelect={(t) => {
                    if (t !== translation) setTranslation(t);
                    setShowTranslationPicker(false);
                  }}
                />
              </View>
            )}

            {compareBar}

            <View style={splitMode && isSideBySide ? styles.splitRow : { flex: 1 }}>
            <ScrollView
              style={[
                splitMode && isSideBySide ? styles.splitPanePrimary : { flex: 1 },
                listenClearance > 0 ? { marginBottom: listenClearance } : null,
              ]}
              ref={scrollViewRef}
              onScrollBeginDrag={() => {
                audio.onUserScroll();
                setShowTranslationPicker(false);
              }}
              onScroll={(e) => {
                handleReaderScroll(e);
                if (splitMode && isSideBySide) handlePrimaryScroll(e);
              }}
              onTouchStart={useNewTypography ? onPreviewChromeTouchStart : undefined}
              onTouchEnd={useNewTypography ? onPreviewChromeTouchEnd : undefined}
              scrollEventThrottle={16}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: readerScrollBottomPad },
                splitMode && isSideBySide && { paddingHorizontal: 16 },
              ]}
              showsVerticalScrollIndicator={false}
            >

              {wordStudyMode && wordStudyHintOn && wordStudyHint ? (
                <View style={styles.wordStudyHint} testID="word-study-hint">
                  <Text style={styles.wordStudyHintText}>{wordStudyHint}</Text>
                  <Pressable
                    onPress={dismissWordStudyHint}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Hide word study hint"
                    testID="word-study-hint-dismiss"
                  >
                    <Text style={styles.wordStudyHintDismiss}>×</Text>
                  </Pressable>
                </View>
              ) : null}

              <Pressable onPress={handleReaderBackgroundPress} style={styles.chapterHeader}>
                <Text style={[styles.bookNameLabel, { color: RV2_INK_MUTED }]}>
                  {bookName?.toUpperCase()}
                </Text>
                <Text style={[styles.chapterNumber, { color: chapterNumColor }]}>
                  {chapter}
                </Text>
              </Pressable>

              {showVerseTapHint && verses.length > 0 && !wordStudyMode && (
                <Pressable
                  onPress={dismissVerseTapHint}
                  style={[styles.verseTapHint, { backgroundColor: RV2_PILL }]}
                  testID="verse-tap-hint"
                >
                  <Ionicons name="hand-left-outline" size={14} color={RV2_INK_MUTED} />
                  <Text style={[styles.verseTapHintText, { color: RV2_INK_MUTED }]}>
                    Tap a verse to select. Tap more to add. Drag down to dismiss.
                  </Text>
                  <Ionicons name="close" size={12} color={RV2_INK_MUTED} />
                </Pressable>
              )}

              <View style={styles.proseContainer}>
                {useNewTypography && !splitMode ? (
                  <TypographyPreviewProse
                    verses={visibleVerses}
                    headingsByVerse={providerHeadings}
                    paragraphStarts={providerParagraphStarts}
                    fontScale={fontScale}
                    getHighlightBg={getHighlightBg}
                    onVerseTap={handleVerseTap}
                    onVerseLongPress={handleVerseLongPress}
                    selectedVerses={selectedVerseSet}
                    bookmarkedVerseIds={bookmarkedVerseIds}
                    bookId={String(bookId)}
                    chapterNum={chapterNum}
                    wordStudyMode={wordStudyMode}
                    mapsByVerseId={kjvWordStudy ? mapsByVerseId : undefined}
                    onWordActivate={
                      kjvWordStudy
                        ? (verse, surface, mapping) => handleWordActivate(surface, mapping, verse.verse, verse.text)
                        : undefined
                    }
                    onUntaggedWord={
                      kjvWordStudy
                        ? (verse) => {
                            setSheetOpen(false);
                            setOriginalWordsVerse({ id: verse.id, verse: verse.verse });
                          }
                        : undefined
                    }
                    wordRanges={wordRanges}
                    onWordRange={(verseId, start, end) => void handleWordRange(verseId, start, end)}
                    wordsOfChrist={wordsOfChrist && isKjvTranslation(translation)}
                    pulseToken={wordStudyPulse}
                  />
                ) : visibleVerses.map((v, i) => {
                  const isActive = selectedVerseSet.has(v.verse);
                  const highlightBg = getHighlightBg(v.id, v.verse, i);
                  const isBookmarked = bookmarkedVerseIds.has(v.id) || bookmarkedVerseIds.has(`${bookId}:${chapterNum}:${v.verse}`);
                  const hasHighlightBg = highlightBg !== "transparent";
                  const isSpeaking = i === audio.speakingVerseIndex && audio.isSpeaking && !audio.isPaused;

                  const verseBg = verseSurfaceStyle({
                    selected: isActive,
                    highlightBg: hasHighlightBg ? highlightBg : "transparent",
                  }).backgroundColor;

                  return (
                    <View key={v.id}>
                      {(providerHeadings.get(v.verse) ?? []).map((heading, headingIndex) => (
                        <Text
                          key={`${v.id}-heading-${headingIndex}`}
                          style={[
                            styles.providerHeading,
                            heading.kind === "qa" && styles.providerHeadingQa,
                            { color: textColor },
                          ]}
                          accessibilityRole="header"
                        >
                          {heading.text}
                        </Text>
                      ))}
                    <Pressable
                      onPress={() => handleVerseTap(v)}
                      onLongPress={() => handleVerseLongPress(v)}
                      delayLongPress={400}
                      style={[
                        styles.verseBlock,
                        {
                          backgroundColor: verseBg,
                          borderRadius: (isActive || hasHighlightBg) ? 8 : 4,
                          borderLeftWidth: isSpeaking ? 2 : 0,
                          borderLeftColor: isSpeaking ? RV2_INK_MUTED : "transparent",
                          marginTop: providerParagraphStarts.has(v.verse) && i > 0 ? 12 * fontScale : 0,
                        },
                      ]}
                    >
                      <Text allowFontScaling={false} style={[styles.verseText, { color: textColor, fontSize: 18 * fontScale, lineHeight: 32 * fontScale }]}>
                        <Text allowFontScaling={false} style={[styles.verseNumInline, verseNumInlineScaled]}>
                          {v.verse}{"\u00a0"}
                        </Text>
                        <VerseSpokenText
                          text={v.text}
                          lineHeight={32 * fontScale}
                          spokenRanges={spokenRangesForLine({
                            redLettersEnabled: wordsOfChrist,
                            readingTranslation: translation,
                            lineTranslation: translation,
                            bookId: Number(bookId),
                            chapter: chapterNum,
                            verse: v.verse,
                          })}
                        />
                        {isBookmarked && (
                          <Text style={{ color: RV2_INK_MUTED, fontSize: 10, lineHeight: 32 * fontScale }}> ◆</Text>
                        )}
                      </Text>
                    </Pressable>
                    {stackedSplit && splitVerseByNum.get(v.verse) ? (
                      <View style={styles.stackedCompanion} testID={`split-stacked-verse-${v.verse}`}>
                        <Text allowFontScaling={false} style={[styles.stackedCompanionText, { fontSize: 15 * fontScale, lineHeight: 24 * fontScale }]}>
                          <Text style={[styles.stackedCompanionLabel, { lineHeight: 24 * fontScale }]}>{splitTranslationLabel}{"\u00a0\u00a0"}</Text>
                          <VerseSpokenText
                            text={splitVerseByNum.get(v.verse)!.text}
                            lineHeight={24 * fontScale}
                            spokenRanges={spokenRangesForLine({
                              redLettersEnabled: wordsOfChrist,
                              readingTranslation: translation,
                              lineTranslation: splitTranslation,
                              bookId: Number(bookId),
                              chapter: chapterNum,
                              verse: v.verse,
                            })}
                          />
                        </Text>
                      </View>
                    ) : null}
                    </View>
                  );
                })}
              </View>

              {data?.attribution ? (
                <ChapterAttribution
                  versionLabel={translationDisplay}
                  chapter={chapterNum}
                  attribution={data.attribution}
                  footnotes={data.footnotes}
                  testID="reader-chapter-attribution"
                />
              ) : null}
              {stackedSplit && !splitLoadFailed && splitData?.attribution ? (
                <ChapterAttribution
                  versionLabel={splitTranslationLabel}
                  chapter={chapterNum}
                  attribution={splitData.attribution}
                  footnotes={undefined}
                  testID="split-chapter-attribution"
                />
              ) : null}

              <Pressable onPress={handleReaderBackgroundPress} style={styles.chapterCompleteRow}>
                <View style={[styles.chapterCompleteLine, { backgroundColor: RV2_BORDER }]} />
                <View style={[styles.chapterCompleteBadge, { backgroundColor: RV2_PILL }]}>
                  <Ionicons name="checkmark-circle" size={14} color={RV2_INK_MUTED} />
                  <Text style={[styles.chapterCompleteText, { color: RV2_INK_MUTED }]}>
                    Chapter Complete
                  </Text>
                </View>
                <View style={[styles.chapterCompleteLine, { backgroundColor: RV2_BORDER }]} />
              </Pressable>
              <View style={{ marginTop: 20, gap: 4, paddingBottom: 8 }}>
                {canGoNext && (
                  <Pressable
                    onPress={goToNext}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.quietRow, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Text style={[styles.quietRowText, { color: RV2_INK }]}>Continue Reading</Text>
                    <Text style={[styles.quietRowMeta, { color: RV2_INK_MUTED }]}>{bookName} {chapterNum + 1}</Text>
                    <Ionicons name="chevron-forward" size={16} color={RV2_INK_MUTED} />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setShowStudySheet(true)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.quietRow, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.quietRowText, { color: RV2_INK_MUTED }]}>Study this chapter</Text>
                  <Ionicons name="chevron-forward" size={16} color={RV2_INK_MUTED} />
                </Pressable>
              </View>
            </ScrollView>

            {splitMode && isSideBySide && (
              <View style={[
                styles.splitPaneSide,
                { borderColor: isDark ? DARK_BORDER : "#E8E8E8" },
              ]}>
                <View style={[styles.splitPaneHeader, { borderBottomColor: isDark ? DARK_BORDER : "#E8E8E8" }]}>
                  <Text style={[styles.translationBadgeText, { color: RV2_INK_MUTED }]}>{splitTranslationLabel}</Text>
                </View>

                <ScrollView
                  ref={splitScrollRef}
                  onScroll={handleSplitScroll}
                  scrollEventThrottle={16}
                  style={listenClearance > 0 ? { marginBottom: listenClearance } : undefined}
                  contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: readerScrollBottomPad, paddingHorizontal: 16 },
                  ]}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.proseContainer}>
                    {splitLoadFailed ? (
                      <View style={styles.errorContainer}>
                        <Ionicons name="lock-closed-outline" size={28} color={theme.error} />
                        <Text style={[styles.errorText, { color: textColor, fontFamily: "Lora_500Medium" }]}>
                          {splitTranslationLabel} unavailable
                        </Text>
                        <Text style={[styles.errorSub, { color: isDark ? DARK_MUTED : "#999", fontFamily: "Inter_400Regular" }]}>
                          {splitUnavailable
                            ? "This translation isn't licensed or available. Choose another translation."
                            : (splitError as Error)?.message || "Could not load this translation."}
                        </Text>
                      </View>
                    ) : (
                      splitVerses.slice(0, paintedCount).map((v) => (
                        <View key={v.id}>
                          <View style={[styles.verseBlock, { borderLeftWidth: 0 }]}>
                          <Text allowFontScaling={false} style={[styles.verseText, { color: textColor, fontSize: 18 * fontScale, lineHeight: 32 * fontScale }]}>
                            <Text allowFontScaling={false} style={[styles.verseNumInline, verseNumInlineScaled]}>
                              {v.verse}{"\u00a0"}
                            </Text>
                            <VerseSpokenText
                              text={v.text}
                              lineHeight={32 * fontScale}
                              spokenRanges={spokenRangesForLine({
                                redLettersEnabled: wordsOfChrist,
                                readingTranslation: translation,
                                lineTranslation: splitTranslation,
                                bookId: Number(bookId),
                                chapter: chapterNum,
                                verse: v.verse,
                              })}
                            />
                          </Text>
                          </View>
                        </View>
                      ))
                    )}
                    {!splitLoadFailed && splitData?.attribution ? (
                      <ChapterAttribution
                        versionLabel={splitTranslationLabel}
                        chapter={chapterNum}
                        attribution={splitData.attribution}
                        footnotes={undefined}
                        testID="split-chapter-attribution"
                      />
                    ) : null}
                  </View>
                </ScrollView>
              </View>
            )}
            </View>

            {sheetOpen && selectedVerseObjs.length > 0 && !wordStudyMode && (
              <Suspense fallback={null}>
              <VerseSheet
                verses={selectedVerseObjs}
                bookName={bookName ?? ""}
                bookId={String(bookId)}
                chapter={String(chapter)}
                translation={translation}
                bottomPad={bottomPad}
                maps={mapsByVerseId.get(selectedVerseObjs[0]?.id ?? "") ?? []}
                userId={userId}
                isAuthenticated={isAuthenticated}
                activeColor={activeSheetColor}
                bookmarked={selectionBookmarked}
                notice={stripToast}
                onHighlight={(color) => void handleStripHighlight(color)}
                onRemoveHighlight={() => void handleRemoveHighlight()}
                onBookmark={handleSelectionBookmark}
                onCopy={handleSelectionCopy}
                onShare={handleSelectionShare}
                onDismiss={dismissToolbar}
                onWordActivate={(surface, mapping) =>
                  handleWordActivate(
                    surface,
                    mapping,
                    selectedVerseObjs[0]?.verse,
                    selectedVerseObjs[0]?.text,
                  )
                }
                onOpenDeepDive={() =>
                  router.push({
                    pathname: "/(tabs)/study",
                    params: { bookId: String(bookId), chapter: String(chapter) },
                  } as any)
                }
                onStudyInKjv={handleStudyInKjv}
                translationChapterCount={translationChapterCount}
                onOpenBookOverview={() =>
                  router.push({
                    pathname: "/passage-context",
                    params: {
                      bookId: String(bookId),
                      bookName: bookName ?? "",
                      overview: "1",
                    },
                  } as any)
                }
              />
              </Suspense>
            )}

            {/* New chrome: one floating play + chapter pill. Legacy keeps the A.3 strip. */}
            {useNewTypography ? (
              !audio.isActive && !sheetOpen && !wordStudyTarget && (
                <Animated.View
                  testID="reader-floating-chrome"
                  style={[
                    styles.previewFloatingRow,
                    splitMode && isSideBySide && styles.previewFloatingRowPrimary,
                    {
                      bottom: chromeBottom,
                      paddingBottom: 8,
                      opacity: stripAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                      transform: [{ translateY: stripAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 72] }) }],
                    },
                  ]}
                  pointerEvents={stripHidden ? "none" : "auto"}
                >
                  <Pressable
                    onPress={audio.handlePlay}
                    accessibilityLabel="Listen to chapter"
                    accessibilityRole="button"
                    style={styles.listenBtn}
                  >
                    <Ionicons name="play" size={16} color="#fff" style={{ marginLeft: 1 }} />
                  </Pressable>
                  <View style={styles.bottomPill}>
                    <Pressable onPress={goToPrev} disabled={!canGoPrev} hitSlop={8} style={{ opacity: canGoPrev ? 1 : 0.3 }}>
                      <Ionicons name="chevron-back" size={16} color={RV2_INK} />
                    </Pressable>
                    <Text style={styles.bottomPillText}>{bookName} {chapter}</Text>
                    <Pressable onPress={goToNext} disabled={!canGoNext} hitSlop={8} style={{ opacity: canGoNext ? 1 : 0.3 }}>
                      <Ionicons name="chevron-forward" size={16} color={RV2_INK} />
                    </Pressable>
                  </View>
                </Animated.View>
              )
            ) : (
              <>
                {/* A.3: reader controls strip — hides on scroll-down, reappears on scroll-up */}
                {!audio.isActive && !sheetOpen && (
                  <Animated.View
                    style={[
                      styles.controlsStrip,
                      {
                        bottom: bottomPad + 54,
                        opacity: stripAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                        transform: [{ translateY: stripAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 70] }) }],
                      },
                    ]}
                    pointerEvents={stripHidden ? "none" : "auto"}
                  >
                    <Pressable
                      onPress={audio.handlePlay}
                      accessibilityLabel="Listen to chapter"
                      accessibilityRole="button"
                      style={styles.listenBtn}
                    >
                      <Ionicons name="play" size={18} color="#fff" style={{ marginLeft: 2 }} />
                    </Pressable>
                    <Pressable
                      onPress={handleChapterBookmark}
                      accessibilityLabel="Bookmark chapter"
                      accessibilityRole="button"
                      hitSlop={8}
                      style={styles.stripIconBtn}
                    >
                      <Ionicons name={chapterBookmarked ? "bookmark" : "bookmark-outline"} size={20} color={RV2_INK} />
                    </Pressable>
                    <View style={styles.stripDivider} />
                    {CANON_HIGHLIGHTS.map((key) => (
                      <Pressable
                        key={key}
                        onPress={() => handleStripHighlight(key)}
                        accessibilityLabel={`Highlight selected verse ${HIGHLIGHT_COLORS[key].label}`}
                        hitSlop={6}
                        style={({ pressed }) => [
                          styles.stripDot,
                          { backgroundColor: HIGHLIGHT_COLORS[key].bg, opacity: selectedVerseNums.length > 0 ? (pressed ? 0.6 : 1) : 0.35 },
                        ]}
                      />
                    ))}
                  </Animated.View>
                )}
                {stripToast && !useNewTypography && (
                  <View style={[styles.stripToast, { bottom: bottomPad + 112 }]}>
                    <Text style={styles.stripToastText}>{stripToast}</Text>
                  </View>
                )}

                {/* Chapter prev/next pill stays at the bottom, restyled light */}
                {!audio.isActive && (
                  <View style={[styles.bottomPillWrap, { paddingBottom: bottomPad + 8 }]}>
                    <View style={styles.bottomPill}>
                      <Pressable onPress={goToPrev} disabled={!canGoPrev} hitSlop={8} style={{ opacity: canGoPrev ? 1 : 0.3 }}>
                        <Ionicons name="chevron-back" size={16} color={RV2_INK} />
                      </Pressable>
                      <Text style={styles.bottomPillText}>{bookName} {chapter}</Text>
                      <Pressable onPress={goToNext} disabled={!canGoNext} hitSlop={8} style={{ opacity: canGoNext ? 1 : 0.3 }}>
                        <Ionicons name="chevron-forward" size={16} color={RV2_INK} />
                      </Pressable>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Active audio keeps the full player bar */}
            {audio.isActive && (
              <TTSPlayerBar
                theme={theme}
                isDark={isDark}
                audio={audio}
                verses={verses}
                bookName={bookName}
                chapter={chapter}
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                goToPrev={goToPrev}
                goToNext={goToNext}
                bottomPad={bottomPad}
                accentColor={RV2_CORAL}
              />
            )}
          </>
        )}

        {/* A.2: chapter selector sheet */}
        {showChapterPicker && totalChapters > 0 && (
          <>
            <Pressable style={[StyleSheet.absoluteFill, styles.modalDim]} onPress={() => setShowChapterPicker(false)} />
            <View style={[styles.lightSheet, { paddingBottom: bottomPad + 16 }]}>
              <View style={styles.sheetHandleLight} />
              <Text style={styles.lightSheetTitle}>{bookName}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Browse all Bible books"
                onPress={() => {
                  setShowChapterPicker(false);
                  audio.handleStop();
                  if (isTabReader) openBibleTabBooks(router, canPopStack);
                  else router.push("/book-picker");
                }}
                style={styles.browseBooksRow}
                testID="browse-bible-books-reader"
              >
                <Ionicons name="library-outline" size={18} color={RV2_INK_MUTED} />
                <Text style={styles.browseBooksText}>Browse all books</Text>
                <Ionicons name="chevron-forward" size={16} color={RV2_INK_MUTED} />
              </Pressable>
              <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={styles.chapterGrid} showsVerticalScrollIndicator={false}>
                {Array.from({ length: totalChapters }, (_, i) => i + 1).map((n) => {
                  const isCurrent = n === chapterNum;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => {
                        setShowChapterPicker(false);
                        if (!isCurrent) {
                          audio.handleStop();
                          router.replace(readerRoute(n));
                        }
                      }}
                      style={[styles.chapterCell, isCurrent && { backgroundColor: RV2_INK }]}
                    >
                      <Text style={[styles.chapterCellText, { color: isCurrent ? "#FFFFFF" : RV2_INK }]}>{n}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </>
        )}

        {/* A.2: AA text-size sheet (theme toggle slot arrives with dark mode) */}
        {showTextSizeSheet && (
          <>
            <Pressable style={[StyleSheet.absoluteFill, styles.modalDim]} onPress={() => setShowTextSizeSheet(false)} />
            <View style={[styles.lightSheet, { paddingBottom: bottomPad + 16 }]}>
              <View style={styles.sheetHandleLight} />
              <Text style={styles.lightSheetTitle}>Text Size</Text>
              <ReadingSizeControl scale={readingScale} onChange={applyFontScale} />
              {!isKjvTranslation(translation) ? (
                <Text style={styles.lightSheetNote} testID="red-letters-kjv-note">
                  Red letters available in KJV
                </Text>
              ) : null}
            </View>
          </>
        )}

        {/* A.6: Study this chapter sheet */}
        {showStudySheet && (
          <>
            <Pressable style={[StyleSheet.absoluteFill, styles.modalDim]} onPress={() => setShowStudySheet(false)} />
            <View style={[styles.lightSheet, { paddingBottom: bottomPad + 16 }]}>
              <View style={styles.sheetHandleLight} />
              <Text style={styles.lightSheetTitle}>Study this chapter</Text>
              {[
                { label: "Word Study", sub: "Greek & Hebrew", icon: "language-outline" as const, go: () => router.push(`/word-study?book=${bookId}&chapter=${chapter}` as any) },
                { label: "Application", sub: "Then & Now", icon: "heart-outline" as const, go: () => router.push({ pathname: "/(tabs)/study", params: { tab: "application", bookId: String(bookId), chapter: String(chapter) } } as any) },
                { label: "Deep Dive", sub: "Full chapter study", icon: "layers-outline" as const, go: () => router.push({ pathname: "/(tabs)/study", params: { bookId: String(bookId), chapter: String(chapter) } } as any) },
                {
                  label: "Guided Study",
                  sub: "Step-by-step with a tutor",
                  icon: "chatbubbles-outline" as const,
                  go: () =>
                    router.push({
                      pathname: "/study-guide",
                      params: {
                        verseReference: `${bookName} ${chapterNum}:1`,
                        bookName,
                        chapter: String(chapterNum),
                        verse: "1",
                      },
                    } as any),
                },
              ].map((row) => (
                <Pressable
                  key={row.label}
                  onPress={() => { setShowStudySheet(false); row.go(); }}
                  style={({ pressed }) => [styles.studyRow, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name={row.icon} size={20} color={RV2_INK} />
                  <Text style={styles.studyRowLabel}>{row.label}</Text>
                  <Text style={styles.studyRowSub}>{row.sub}</Text>
                  <Ionicons name="chevron-forward" size={16} color={RV2_INK_MUTED} />
                </Pressable>
              ))}
            </View>
          </>
        )}

      </View>
      <Suspense fallback={null}>
      <WordStudySheet
        target={wordStudyTarget}
        onClose={() => setWordStudyTarget(null)}
        onSeeUses={(strongId, lemma) => {
          setWordStudyTarget(null);
          router.push({
            pathname: "/strong-concordance",
            params: {
              strong: strongId,
              ...(lemma ? { lemma } : {}),
            },
          } as any);
        }}
      />
      <OriginalWordsSheet
        visible={!!originalWordsVerse}
        reference={
          originalWordsVerse
            ? formatSheetReference(bookName ?? "", String(chapterNum), [originalWordsVerse.verse])
            : ""
        }
        rows={originalWordsRows}
        maps={originalWordsMaps}
        loading={originalWordsLoading}
        onClose={() => setOriginalWordsVerse(null)}
        onWordActivate={(surface, mapping) => {
          const verse = verses.find((item) => item.id === originalWordsVerse?.id);
          handleWordActivate(surface, mapping, verse?.verse, verse?.text);
        }}
      />
      </Suspense>
      {stripToast && useNewTypography ? (
        <View
          pointerEvents="none"
          style={[
            styles.stripToastWrap,
            { bottom: bottomPad + (sheetOpen ? VERSE_SHEET_COLLAPSED_HEIGHT + 16 : 88) },
          ]}
        >
          <View style={styles.stripToast}>
            <Text style={styles.stripToastText}>{stripToast}</Text>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    maxWidth: "100%",
    gap: 6,
  },
  headerTitleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  headerIconBtn: {
    padding: 4,
  },
  headerToggle: {
    minHeight: 26,
    paddingHorizontal: 7,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    flexShrink: 1,
    minWidth: 0,
  },
  headerToggleOn: {
    backgroundColor: READER_TOGGLE_ON_TINT,
  },
  headerToggleText: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
    fontFamily: "Inter_600SemiBold",
    color: RV2_INK_MUTED,
  },
  headerToggleTextOn: {
    color: READER_TOGGLE_ON_INK,
  },
  headerPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerPillText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  headerTitleText: {
    flexShrink: 1,
    fontSize: 17,
    fontFamily: "Lora_600SemiBold",
  },
  translationBadgeText: {
    maxWidth: READER_VERSION_CHIP_MAX_WIDTH,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 20 },
  errorText: { fontSize: 17 },
  errorSub: { fontSize: 13, textAlign: "center" },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  translationDropdown: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
  },
  translationDropdownAbsolute: {
    position: "absolute",
    top: 0,
    right: 16,
    width: 300,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 200,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  translationOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  translationOptionText: { fontSize: 15 },
  translationOptionDesc: { fontSize: 12 },
  chapterHeader: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 40,
  },
  bookNameLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  chapterNumber: {
    fontSize: 64,
    lineHeight: 72,
    fontFamily: "Lora_700Bold",
  },
  verseTapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  verseTapHintText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 17,
  },
  wordStudyHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  wordStudyHintText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
    color: RV2_INK_MUTED,
  },
  wordStudyHintDismiss: {
    fontSize: 14,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
    color: RV2_INK_MUTED,
  },
  proseContainer: {
    paddingBottom: 24,
  },
  verseBlock: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 2,
    paddingLeft: 12,
  },
  verseNumInline: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 36,
  },
  verseText: {
    fontSize: 18,
    lineHeight: 36,
    fontFamily: "Lora_400Regular",
    letterSpacing: 0.2,
  },
  chapterCompleteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 8,
    gap: 12,
  },
  chapterCompleteLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  chapterCompleteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chapterCompleteText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  chapterNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  chapterNavBtn: {
    padding: 10,
  },
  chapterNavCenter: {
    flex: 1,
    alignItems: "center",
  },
  chapterNavLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  splitRow: {
    flex: 1,
    flexDirection: "row" as const,
    minWidth: 0,
  },
  splitPanePrimary: {
    flex: 1,
    minWidth: 0,
  },
  splitPaneSide: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: 1,
  },
  compareBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flexWrap: "wrap" as const,
    rowGap: 4,
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 8,
    zIndex: 60,
  },
  compareBarText: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: RV2_INK_MUTED,
  },
  compareBarVersion: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  compareBarVersionText: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: RV2_INK,
  },
  compareDropdown: {
    top: 34,
    left: 16,
    right: undefined,
  },
  stackedCompanion: {
    paddingLeft: 12,
    paddingRight: 8,
    paddingBottom: 10,
    marginTop: -4,
  },
  stackedCompanionText: {
    fontFamily: "Lora_400Regular",
    color: "#3F3A31",
  },
  stackedCompanionLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
    fontFamily: "Inter_600SemiBold",
    color: RV2_INK_MUTED,
  },
  splitPaneHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // ── reader-v2 additions ────────────────────────────────────
  controlsStrip: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(241,235,221,0.96)",
    borderRadius: 26,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E7E0D2",
    ...Platform.select({
      ios: { shadowColor: "#1A1A1A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 4 },
      web: { boxShadow: "0 2px 10px rgba(26,26,26,0.08)" },
    }),
  },
  listenBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8604C", // the ONLY coral on this screen
    alignItems: "center",
    justifyContent: "center",
  },
  stripIconBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stripDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: "#D8D0BE",
  },
  stripDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginLeft: 2,
  },
  stripToastWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 4000,
    elevation: 40,
  },
  stripToast: {
    backgroundColor: "#1F1A12",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  stripToastText: {
    color: "#FBF7EE",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  previewFloatingRow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: 8,
  },
  /** Side-by-side: keep play and the chapter pill in the reading column, clear of the gutter. */
  previewFloatingRowPrimary: {
    right: "50%",
  },
  bottomPillWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 8,
    backgroundColor: "rgba(251,247,238,0.96)",
  },
  bottomPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#F1EBDD",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  bottomPillText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#1F1A12",
  },
  modalDim: {
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 2000,
  },
  lightSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    zIndex: 2001,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 16 },
      android: { elevation: 16 },
      web: { boxShadow: "0 -4px 24px rgba(0,0,0,0.25)" },
    }),
  },
  sheetHandleLight: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8D0BE",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  lightSheetTitle: {
    fontSize: 16,
    fontFamily: "Lora_600SemiBold",
    color: "#1F1A12",
    marginBottom: 12,
  },
  lightSheetNote: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
    color: "#3F3A34",
    textAlign: "center",
  },
  browseBooksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 44,
    marginBottom: 14,
    borderRadius: 10,
    backgroundColor: "#F1EBDD",
    paddingHorizontal: 14,
  },
  browseBooksText: {
    flex: 1,
    color: "#1F1A12",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  chapterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 8,
  },
  chapterCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F1EBDD",
    alignItems: "center",
    justifyContent: "center",
  },
  chapterCellText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  fontScaleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  fontScaleTrack: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1EBDD",
    paddingHorizontal: 12,
  },
  fontScaleStop: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#D8D0BE",
  },
  fontScaleStopActive: {
    backgroundColor: "#1F1A12",
    transform: [{ scale: 1.35 }],
  },
  fontScalePreview: {
    fontFamily: "Lora_400Regular",
    color: "#1F1A12",
    paddingBottom: 8,
  },
  quietRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  providerHeading: {
    fontSize: 16,
    lineHeight: 23,
    fontFamily: "Lora_700Bold",
    marginTop: 20,
    marginBottom: 6,
  },
  providerHeadingQa: {
    fontSize: 14,
    lineHeight: 20,
  },
  quietRowText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  quietRowMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  studyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EAD9",
  },
  studyRowLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#1F1A12",
  },
  studyRowSub: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#6B6660",
    textAlign: "right",
  },
});
