import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { router, useLocalSearchParams, Stack, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as NavigationBar from "expo-navigation-bar";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/context/TranslationContext";
import RelatedContent from "@/components/reader/RelatedContent";
import TTSPlayerBar from "@/components/reader/TTSPlayerBar";
import useBibleAudio from "@/hooks/useBibleAudio";

const VERSE_TAP_HINT_KEY = "@grace-through-faith/verse-tap-hint-dismissed";
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

const HIGHLIGHT_COLORS = {
  blue: { bg: "#90CAF9", label: "Blue" },
  yellow: { bg: "#FFF176", label: "Yellow" },
  pink: { bg: "#F48FB1", label: "Pink" },
  green: { bg: "#A5D6A7", label: "Green" },
  orange: { bg: "#FFCC80", label: "Orange" },
  purple: { bg: "#CE93D8", label: "Purple" },
} as const;

type HighlightColorKey = keyof typeof HIGHLIGHT_COLORS;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SPLIT_MODE_KEY = "@grace-through-faith/split-mode";
const SPLIT_TRANSLATION_KEY = "@grace-through-faith/split-translation";

const DARK_BG = "#0A0A0A";
const DARK_SURFACE = "#1A1A1A";
const DARK_BORDER = "#1F1F1F";
const DARK_TEXT = "#F5F0E8";
const DARK_MUTED = "#666";
const GOLD = "#C9933A";
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
}

function BottomSheetToolbar({
  verse,
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
  verse: Verse;
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
  const [underlineActive, setUnderlineActive] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const noteInputRef = useRef<TextInput>(null);

  const reference = `${bookName} ${chapter}:${verse.verse}`;
  const fullText = `${verse.text}\n\u2014 ${reference} (${translation})`;

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
  }, []);

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
  }, [onDismiss]);

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

  const showFeedback = (msg: string, isError = false) => {
    setFeedback({ message: msg, isError });
    Haptics.notificationAsync(
      isError ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success
    );
    setTimeout(() => {
      setFeedback(null);
      dismissSheet();
    }, 800);
  };

  const handleHighlight = async (color: HighlightColorKey) => {
    if (!userId) { showFeedback("Sign in to highlight"); return; }
    setActiveColor(color);
    try {
      await apiRequest("POST", "/api/highlights", { userId, verseId: verse.id, color });
      queryClient.invalidateQueries({ queryKey: [`/api/highlights/${userId}`] });
      showFeedback("Highlighted!");
    } catch {
      showFeedback("Failed to highlight", true);
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
    try {
      await apiRequest("POST", "/api/bookmarks", { userId, verseId: verse.id, label: reference });
      queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/${userId}`] });
      showFeedback("Saved!");
    } catch {
      showFeedback("Failed to save", true);
    }
  };

  const handleSaveNote = async () => {
    if (!isAuthenticated) { showFeedback("Sign in to add notes"); return; }
    if (!noteText.trim()) return;
    try {
      await apiRequest("POST", "/api/notes", { userId, verseId: verse.id, content: noteText.trim() });
      queryClient.invalidateQueries({ queryKey: [`/api/notes/${userId}`] });
      showFeedback("Note saved!");
    } catch {
      showFeedback("Failed to save note", true);
    }
  };

  const handleExplain = () => {
    if (!bookName || !chapter || verse.verse === undefined) {
      console.warn("[BottomSheetToolbar] Missing verse data for Explain:", { bookName, bookId, chapter, verse });
      return;
    }
    dismissSheet();
    router.push({ pathname: "/verse-explain" as any, params: { bookId, bookName, chapter, verse: String(verse.verse), verseId: String(verse.id), text: verse.text, translation } });
  };

  const handleCompare = () => {
    if (!bookName || !chapter || verse.verse === undefined) {
      console.warn("[BottomSheetToolbar] Missing verse data for Compare:", { bookName, bookId, chapter, verse });
      return;
    }
    dismissSheet();
    router.push({ pathname: "/verse-actions" as any, params: { bookId, bookName, chapter, verse: String(verse.verse), verseId: String(verse.id), text: verse.text, translation, tab: "compare" } });
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
          <Text style={[sheetStyles.selectedRef, { color: GOLD }]} numberOfLines={1}>
            {reference}
          </Text>
          <Text style={[sheetStyles.selectedText, { color: isDark ? DARK_TEXT : LIGHT_TEXT }]} numberOfLines={2}>
            {verse.text}
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
                onPress={() => setUnderlineActive(!underlineActive)}
                style={[sheetStyles.underlineBtn, underlineActive && { backgroundColor: (isDark ? "#333" : "#EEE") }]}
              >
                <Ionicons name="remove-outline" size={20} color={underlineActive ? GOLD : (isDark ? "#888" : "#999")} />
              </Pressable>
              <View style={sheetStyles.colorDots}>
                {(Object.keys(HIGHLIGHT_COLORS) as HighlightColorKey[]).map((key) => (
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
  noteSaveBtn: { backgroundColor: GOLD, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  noteSaveText: { fontSize: 14, color: "#fff", fontFamily: "Inter_600SemiBold" },
});

export default function VerseReaderScreen() {
  const { bookId, chapter, translation: txParam, verse: verseParam } = useLocalSearchParams<{ bookId: string; chapter: string; translation?: string; verse?: string }>();
  const { theme, isDark } = useTheme();
  const { userId, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { translation: globalTranslation, setTranslation: setGlobalTranslation } = useTranslation();
  const { data: availableTranslations } = useQuery<{ id: string; abbreviation: string; name: string; language: string }[]>({
    queryKey: ["/api/translations"],
  });
  const translationList = availableTranslations
    ? availableTranslations.map((t) => t.abbreviation)
    : DEFAULT_TRANSLATIONS;

  const resolvedTx = translationList.includes(txParam as string) ? (txParam as string) : (translationList.includes(globalTranslation) ? globalTranslation : "KJV");
  const [translation, setTranslationLocal] = useState<Translation>(resolvedTx);

  useEffect(() => {
    if (txParam && translationList.includes(txParam) && txParam !== translation) {
      setTranslationLocal(txParam);
    } else if (!txParam && translationList.includes(globalTranslation) && globalTranslation !== translation) {
      setTranslationLocal(globalTranslation);
    }
  }, [txParam, globalTranslation, translationList]);

  const setTranslation = useCallback((t: Translation) => {
    setTranslationLocal(t);
    setGlobalTranslation(t);
  }, [setGlobalTranslation]);

  const [splitMode, setSplitMode] = useState(false);
  const [splitTranslation, setSplitTranslation] = useState("ASV");
  const [showSplitTranslationPicker, setShowSplitTranslationPicker] = useState(false);
  const splitScrollRef = useRef<ScrollView>(null);
  const isSyncingScroll = useRef(false);
  const [windowWidth, setWindowWidth] = useState(Dimensions.get("window").width);

  useEffect(() => {
    AsyncStorage.getItem(SPLIT_MODE_KEY).then((val) => {
      if (val === "1") setSplitMode(true);
    });
    AsyncStorage.getItem(SPLIT_TRANSLATION_KEY).then((val) => {
      if (val) setSplitTranslation(val);
    });
  }, []);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setWindowWidth(window.width);
    });
    return () => sub?.remove();
  }, []);

  const toggleSplitMode = useCallback(() => {
    setSplitMode((prev) => {
      const next = !prev;
      AsyncStorage.setItem(SPLIT_MODE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const handleSetSplitTranslation = useCallback((t: string) => {
    setSplitTranslation(t);
    AsyncStorage.setItem(SPLIT_TRANSLATION_KEY, t);
  }, []);

  const isSideBySide = windowWidth >= 600;

  const { data: splitData } = useQuery<PassageResponse>({
    queryKey: [`/api/passage?book=${bookId}&chapter=${chapter}&translation=${splitTranslation}`],
    enabled: splitMode,
  });

  const splitVerses = splitData?.verses ?? [];

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

  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [toolbarVerse, setToolbarVerse] = useState<Verse | null>(null);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [highlightedFromNav, setHighlightedFromNav] = useState<number | null>(null);
  const [navHighlightAlpha, setNavHighlightAlpha] = useState(0);
  const verseTapFadeAnim = useRef(new Animated.Value(0)).current;



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

  useEffect(() => {
    if (!verseParam) return;
    const vNum = parseInt(verseParam, 10);
    if (isNaN(vNum)) return;

    setHighlightedFromNav(vNum);
    setNavHighlightAlpha(0.35);

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    const fadeStart = setTimeout(() => {
      if (!mounted) return;
      const steps = 10;
      let step = 0;
      intervalId = setInterval(() => {
        step++;
        if (!mounted) {
          if (intervalId) clearInterval(intervalId);
          return;
        }
        setNavHighlightAlpha(0.35 * (1 - step / steps));
        if (step >= steps) {
          if (intervalId) clearInterval(intervalId);
          setHighlightedFromNav(null);
        }
      }, 100);
    }, 500);

    const scrollTimer = setTimeout(() => {
      if (!mounted || !scrollViewRef.current) return;
      const estimatedOffset = Math.max(0, (vNum - 1) * 36);
      scrollViewRef.current.scrollTo({ y: estimatedOffset, animated: true });
    }, 300);

    return () => {
      mounted = false;
      clearTimeout(fadeStart);
      clearTimeout(scrollTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [verseParam]);

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: [`/api/highlights/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/${userId}`] });
    }, [userId])
  );

  // Hide Android nav bar while reading (immersive mode); restore on leave
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      NavigationBar.setVisibilityAsync("hidden");
      NavigationBar.setBehaviorAsync("overlay-swipe");
      return () => {
        NavigationBar.setVisibilityAsync("visible");
      };
    }, [])
  );

  const { data, isLoading, error } = useQuery<PassageResponse>({
    queryKey: [`/api/passage?book=${bookId}&chapter=${chapter}&translation=${translation}`],
  });

  const { data: highlightsData } = useQuery<{ id: string; verseId: string; color: string }[]>({
    queryKey: [`/api/highlights/${userId}`],
  });

  const { data: bookmarksData } = useQuery<{ id: string; verseId: string; label: string }[]>({
    queryKey: [`/api/bookmarks/${userId}`],
  });

  const highlightColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (highlightsData) {
      for (const h of highlightsData) map.set(h.verseId, h.color);
    }
    return map;
  }, [highlightsData]);

  const bookmarkedVerseIds = useMemo(() => {
    const set = new Set<string>();
    if (bookmarksData) {
      for (const b of bookmarksData) set.add(b.verseId);
    }
    return set;
  }, [bookmarksData]);

  const bookName = data?.book?.name ?? "";
  const totalChapters = data?.book?.chapterCount ?? 0;
  const chapterNum = Number(chapter);

  const canGoPrev = chapterNum > 1;
  const canGoNext = chapterNum < totalChapters;

  const verses = data?.verses ?? [];

  const audio = useBibleAudio(verses, bookId, chapter, translation, scrollViewRef, bookName);

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
      apiRequest("POST", "/api/reading-history", {
        userId,
        bookId: bookIdNum,
        bookName: bookNameSnapshot,
        chapter: chapterNum,
        translation,
      })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/reading-history/recent?userId=${userId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/reading-streaks?userId=${userId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/spiritual-rings?userId=${userId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/reading-streaks/weekly?userId=${userId}`] });
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
    const prefetchKey = `${bookId}-${chapter}`;
    if (prefetchedRef.current === prefetchKey) return;
    prefetchedRef.current = prefetchKey;

    const bId = Number(bookId);
    const ch = Number(chapter);
    const vrs = data.verses;

    queryClient.prefetchQuery({ queryKey: [`/api/chapter-context/${bId}/${ch}`] });

    const prefetchCount = Math.min(5, vrs.length);
    for (let i = 0; i < prefetchCount; i++) {
      const v = vrs[i];
      queryClient.prefetchQuery({ queryKey: [`/api/verse-map/${v.id}`] });
      queryClient.prefetchQuery({ queryKey: [`/api/strong/verse/${v.id}`] });
    }
  }, [data?.verses, bookId, chapter]);

  const goToPrev = useCallback(() => {
    if (canGoPrev) {
      audio.handleStop();
      router.replace(`/read/${bookId}/${chapterNum - 1}?translation=${translation}`);
    }
  }, [bookId, chapterNum, canGoPrev, translation, audio.handleStop]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      audio.handleStop();
      router.replace(`/read/${bookId}/${chapterNum + 1}?translation=${translation}`);
    }
  }, [bookId, chapterNum, canGoNext, translation, audio.handleStop]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleVerseTap = useCallback((item: Verse) => {
    if (showVerseTapHint) dismissVerseTapHint();
    Haptics.selectionAsync();
    setToolbarVerse(null);
    setActiveVerse((prev) => (prev === item.verse ? null : item.verse));
  }, [showVerseTapHint, dismissVerseTapHint]);

  const handleVerseLongPress = useCallback((item: Verse) => {
    if (showVerseTapHint) dismissVerseTapHint();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveVerse(item.verse);
    setToolbarVerse(item);
  }, [showVerseTapHint, dismissVerseTapHint]);

  const dismissToolbar = useCallback(() => {
    setToolbarVerse(null);
    setActiveVerse(null);
  }, []);

  const getHighlightBg = useCallback((verseId: string, verseNum: number, index: number): string => {
    if (highlightedFromNav === verseNum) {
      return `rgba(201, 147, 58, ${navHighlightAlpha})`;
    }
    if (index === audio.speakingVerseIndex) {
      return isDark ? "rgba(201, 147, 58, 0.15)" : "rgba(255, 215, 0, 0.2)";
    }
    const hColor = highlightColorMap.get(verseId);
    if (hColor && HIGHLIGHT_COLORS[hColor as HighlightColorKey]) {
      const c = HIGHLIGHT_COLORS[hColor as HighlightColorKey].bg;
      return isDark ? c + "30" : c + "50";
    }
    if (hColor) {
      return isDark ? "rgba(201, 147, 58, 0.15)" : "rgba(255, 215, 0, 0.2)";
    }
    return "transparent";
  }, [highlightedFromNav, navHighlightAlpha, audio.speakingVerseIndex, highlightColorMap, isDark]);

  const readerBg = isDark ? DARK_BG : LIGHT_BG;
  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
  const verseNumColor = isDark ? "rgba(245,240,232,0.40)" : "rgba(26,26,26,0.40)";
  const chapterNumColor = isDark ? "rgba(245,240,232,0.10)" : "rgba(26,26,26,0.06)";
  const headerPillBg = isDark ? DARK_SURFACE : LIGHT_SURFACE;
  const headerBorderColor = isDark ? "#2A2A2A" : "#E8E8E8";

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerStyle: { backgroundColor: readerBg },
          headerShadowVisible: false,
          headerTintColor: textColor,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerIconBtn}>
              <Ionicons name="chevron-back" size={22} color={textColor} />
            </Pressable>
          ),
          headerTitle: () => (
            <Pressable style={[styles.headerPill, { backgroundColor: headerPillBg }]}>
              <Text style={[styles.headerPillText, { color: textColor }]} numberOfLines={1}>
                {bookName} {chapter}
              </Text>
            </Pressable>
          ),
          headerRight: () => (
            <View style={styles.headerRow}>
              <Pressable
                testID="split-screen-toggle"
                accessibilityLabel="Toggle split screen"
                hitSlop={12}
                onPress={toggleSplitMode}
                style={styles.headerIconBtn}
              >
                <Ionicons name="tablet-landscape-outline" size={18} color={splitMode ? GOLD : (isDark ? DARK_MUTED : "#999")} />
              </Pressable>
              <View>
                <Pressable
                  hitSlop={12}
                  onPress={() => setShowTranslationPicker(!showTranslationPicker)}
                  style={[styles.headerPill, { backgroundColor: headerPillBg }]}
                >
                  <Text style={[styles.translationBadgeText, { color: isDark ? "#AAAAAA" : "#777" }]}>
                    {translation}
                  </Text>
                </Pressable>
              </View>
            </View>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: readerBg }]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GOLD} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={40} color={theme.error} />
            <Text style={[styles.errorText, { color: textColor, fontFamily: "Lora_500Medium" }]}>
              Unable to load passage
            </Text>
            <Text style={[styles.errorSub, { color: isDark ? DARK_MUTED : "#999", fontFamily: "Inter_400Regular" }]}>
              {(error as Error).message}
            </Text>
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
                <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }} nestedScrollEnabled>
                  {translationList.map((t) => {
                    const isActiveT = translation === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => {
                          if (!isActiveT) setTranslation(t);
                          setShowTranslationPicker(false);
                        }}
                        style={[
                          styles.translationOption,
                          isActiveT && { backgroundColor: GOLD + "12" },
                        ]}
                      >
                        <Text style={[
                          styles.translationOptionText,
                          {
                            color: isActiveT ? GOLD : textColor,
                            fontFamily: isActiveT ? "Inter_700Bold" : "Inter_500Medium",
                          },
                        ]}>
                          {t}
                        </Text>
                        <Text style={[styles.translationOptionDesc, { color: isDark ? "#555" : "#999", fontFamily: "Inter_400Regular" }]}>
                          {TRANSLATION_LABELS[t] || t}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={splitMode && isSideBySide ? styles.splitRow : splitMode ? styles.splitColumn : { flex: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              onScrollBeginDrag={() => {
                audio.onUserScroll();
                if (toolbarVerse) dismissToolbar();
                setShowTranslationPicker(false);
              }}
              onScroll={splitMode ? handlePrimaryScroll : undefined}
              scrollEventThrottle={16}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: 120 + bottomPad },
                splitMode && isSideBySide && { paddingHorizontal: 16 },
              ]}
              showsVerticalScrollIndicator={false}
            >

              <View style={styles.chapterHeader}>
                <Text style={[styles.bookNameLabel, { color: isDark ? "#555" : "#AAA" }]}>
                  {bookName?.toUpperCase()}
                </Text>
                <Text style={[styles.chapterNumber, { color: chapterNumColor }]}>
                  {chapter}
                </Text>
              </View>

              {showVerseTapHint && verses.length > 0 && (
                <Pressable
                  onPress={dismissVerseTapHint}
                  style={[styles.verseTapHint, { backgroundColor: isDark ? "rgba(201,147,58,0.06)" : "rgba(201,147,58,0.05)" }]}
                  testID="verse-tap-hint"
                >
                  <Ionicons name="hand-left-outline" size={14} color={GOLD} />
                  <Text style={[styles.verseTapHintText, { color: GOLD }]}>
                    Tap a verse to select. Long press for actions.
                  </Text>
                  <Ionicons name="close" size={12} color={isDark ? "#444" : "#CCC"} />
                </Pressable>
              )}

              <View style={styles.proseContainer}>
                {verses.map((v, i) => {
                  const isActive = activeVerse === v.verse;
                  const highlightBg = getHighlightBg(v.id, v.verse, i);
                  const isBookmarked = bookmarkedVerseIds.has(v.id);
                  const hasHighlightBg = highlightBg !== "transparent";
                  const isSpeaking = i === audio.speakingVerseIndex && audio.isSpeaking && !audio.isPaused;

                  const verseBg = isActive
                    ? `rgba(201, 147, 58, 0.10)`
                    : hasHighlightBg
                      ? highlightBg
                      : "transparent";

                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => handleVerseTap(v)}
                      onLongPress={() => handleVerseLongPress(v)}
                      delayLongPress={400}
                      style={[
                        styles.verseBlock,
                        {
                          backgroundColor: verseBg,
                          borderRadius: (isActive || hasHighlightBg) ? 8 : 4,
                          borderLeftWidth: isSpeaking ? 2 : 0,
                          borderLeftColor: isSpeaking ? GOLD : "transparent",
                        },
                      ]}
                    >
                      <Text style={[styles.verseText, { color: textColor }]}>
                        <Text style={[styles.verseNumInline, { color: verseNumColor }]}>
                          {v.verse}{" "}
                        </Text>
                        {v.text}
                        {isBookmarked && (
                          <Text style={{ color: GOLD, fontSize: 10 }}> ◆</Text>
                        )}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.chapterCompleteRow}>
                <View style={[styles.chapterCompleteLine, { backgroundColor: isDark ? "#1F1F1F" : "#E5E5E5" }]} />
                <View style={[styles.chapterCompleteBadge, { backgroundColor: isDark ? "#111" : "#F5F0E6" }]}>
                  <Ionicons name="checkmark-circle" size={14} color={GOLD} />
                  <Text style={[styles.chapterCompleteText, { color: GOLD }]}>
                    Chapter Complete
                  </Text>
                </View>
                <View style={[styles.chapterCompleteLine, { backgroundColor: isDark ? "#1F1F1F" : "#E5E5E5" }]} />
              </View>

              <RelatedContent
                bookId={Number(bookId)}
                bookName={bookName}
                chapter={chapterNum}
                totalChapters={totalChapters}
                translation={translation}
                theme={theme}
                isDark={isDark}
              />
            </ScrollView>

            {splitMode && (
              <View style={[
                isSideBySide ? styles.splitPaneSide : styles.splitPaneStacked,
                { borderColor: isDark ? DARK_BORDER : "#E8E8E8" },
              ]}>
                <View style={[styles.splitPaneHeader, { borderBottomColor: isDark ? DARK_BORDER : "#E8E8E8" }]}>
                  <Pressable
                    onPress={() => setShowSplitTranslationPicker(!showSplitTranslationPicker)}
                    style={[styles.headerPill, { backgroundColor: headerPillBg }]}
                  >
                    <Text style={[styles.translationBadgeText, { color: isDark ? "#AAAAAA" : "#777" }]}>
                      {splitTranslation}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color={isDark ? "#666" : "#999"} style={{ marginLeft: 4 }} />
                  </Pressable>
                </View>

                {showSplitTranslationPicker && (
                  <View
                    style={[styles.translationDropdown, { backgroundColor: isDark ? "#141416" : LIGHT_SURFACE, borderColor: isDark ? "#2A2A2A" : "#E0E0E0", position: "absolute", top: 44, left: 8, right: 8, zIndex: 100 }]}
                    onStartShouldSetResponder={() => true}
                  >
                    <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }} nestedScrollEnabled>
                      {translationList.filter((t) => t !== translation).map((t) => {
                        const isActiveT = splitTranslation === t;
                        return (
                          <Pressable
                            key={t}
                            onPress={() => {
                              handleSetSplitTranslation(t);
                              setShowSplitTranslationPicker(false);
                            }}
                            style={[
                              styles.translationOption,
                              isActiveT && { backgroundColor: GOLD + "12" },
                            ]}
                          >
                            <Text style={[
                              styles.translationOptionText,
                              {
                                color: isActiveT ? GOLD : textColor,
                                fontFamily: isActiveT ? "Inter_700Bold" : "Inter_500Medium",
                              },
                            ]}>
                              {t}
                            </Text>
                            <Text style={[styles.translationOptionDesc, { color: isDark ? "#555" : "#999", fontFamily: "Inter_400Regular" }]}>
                              {TRANSLATION_LABELS[t] || t}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <ScrollView
                  ref={splitScrollRef}
                  onScroll={handleSplitScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: 120 + bottomPad, paddingHorizontal: 16 },
                  ]}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.proseContainer}>
                    {splitVerses.map((v) => (
                      <View key={v.id} style={[styles.verseBlock, { borderLeftWidth: 0 }]}>
                        <Text style={[styles.verseText, { color: textColor }]}>
                          <Text style={[styles.verseNumInline, { color: verseNumColor }]}>
                            {v.verse}{" "}
                          </Text>
                          {v.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
            </View>

            <View style={[styles.chapterNav, { backgroundColor: readerBg, borderTopColor: isDark ? DARK_BORDER : "#F0F0F0", paddingBottom: bottomPad + 4 }]}>
              <Pressable
                onPress={goToPrev}
                hitSlop={12}
                style={[styles.chapterNavBtn, { opacity: canGoPrev ? 1 : 0.25 }]}
                disabled={!canGoPrev}
              >
                <Ionicons name="chevron-back" size={20} color={isDark ? "#888" : "#999"} />
              </Pressable>
              <Pressable style={styles.chapterNavCenter} hitSlop={8}>
                <Text style={[styles.chapterNavLabel, { color: isDark ? "#AAA" : "#666" }]}>
                  {bookName} {chapter}
                </Text>
              </Pressable>
              <Pressable
                onPress={goToNext}
                hitSlop={12}
                style={[styles.chapterNavBtn, { opacity: canGoNext ? 1 : 0.25 }]}
                disabled={!canGoNext}
              >
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#888" : "#999"} />
              </Pressable>
            </View>

            {toolbarVerse && (
              <BottomSheetToolbar
                verse={toolbarVerse}
                bookName={bookName}
                bookId={bookId as string}
                chapter={chapter as string}
                translation={translation}
                userId={userId}
                isAuthenticated={isAuthenticated}
                onDismiss={dismissToolbar}
                isDark={isDark}
                bottomPad={bottomPad}
              />
            )}

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
            />
          </>
        )}

      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    padding: 4,
  },
  headerPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerPillText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  translationBadgeText: {
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
    width: 260,
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
  },
  splitColumn: {
    flex: 1,
  },
  splitPaneSide: {
    flex: 1,
    borderLeftWidth: 1,
  },
  splitPaneStacked: {
    flex: 1,
    borderTopWidth: 1,
  },
  splitPaneHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
