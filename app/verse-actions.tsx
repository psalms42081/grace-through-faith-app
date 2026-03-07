import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import * as Clipboard from "expo-clipboard";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { theme, isDark } = useTheme();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();

  const canonicalVerseId = verseId || `${bookId}_${chapter}_${verse}`;
  const reference = `${bookName} ${chapter}:${verse}`;
  const txLabel = translation || "KJV";

  const navigateTo = useCallback((pathname: string, params?: Record<string, string>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
    setTimeout(() => {
      if (params) {
        router.push({ pathname: pathname as any, params });
      } else {
        router.push(pathname as any);
      }
    }, 300);
  }, []);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(`${text}\n\u2014 ${reference} (${txLabel})`);
    router.back();
  }, [text, reference, txLabel]);

  const handleStudy = useCallback(() => {
    navigateTo("/passage-context", {
      bookId: bookId || "",
      chapter: chapter || "",
      bookName: bookName || "",
    });
  }, [bookId, chapter, bookName, navigateTo]);

  const handleWordStudy = useCallback(() => {
    navigateTo("/word-study", {
      bookId: bookId || "",
      chapter: chapter || "",
      verse: verse || "",
      verseId: canonicalVerseId,
      verseText: text || "",
      bookName: bookName || "",
    });
  }, [canonicalVerseId, bookName, chapter, verse, text, bookId, navigateTo]);

  const handleHistoricVoices = useCallback(() => {
    navigateTo("/historic-voices", {
      bookId: bookId || "",
      chapter: chapter || "",
      bookName: bookName || "",
    });
  }, [bookId, chapter, bookName, navigateTo]);

  const handleVerseMap = useCallback(() => {
    navigateTo("/verse-map", {
      verseId: canonicalVerseId,
      verseText: text || "",
      verseReference: reference,
      bookName: bookName || "",
      bookId: bookId || "",
      chapter: chapter || "",
      verse: verse || "",
    });
  }, [canonicalVerseId, text, reference, bookName, bookId, chapter, verse, navigateTo]);

  const handleSocraticStudy = useCallback(() => {
    navigateTo("/study-guide", {
      verseReference: reference,
      verseText: text || "",
      bookName: bookName || "",
      chapter: chapter || "",
      verse: verse || "",
    });
  }, [reference, text, bookName, chapter, verse, navigateTo]);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleHighlight = useCallback(async () => {
    if (!userId) {
      setFeedbackMsg("Sign in to highlight");
      setTimeout(() => setFeedbackMsg(null), 1500);
      return;
    }
    try {
      await apiRequest("POST", "/api/highlights", {
        userId,
        verseId: canonicalVerseId,
        color: "yellow",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/highlights/${userId}`] });
      setFeedbackMsg("Highlighted!");
      setTimeout(() => router.back(), 600);
    } catch (err) {
      console.error("Highlight failed:", err);
      setFeedbackMsg("Failed to highlight");
      setTimeout(() => setFeedbackMsg(null), 1500);
    }
  }, [userId, canonicalVerseId]);

  const handleBookmark = useCallback(async () => {
    if (!userId) {
      setFeedbackMsg("Sign in to bookmark");
      setTimeout(() => setFeedbackMsg(null), 1500);
      return;
    }
    try {
      await apiRequest("POST", "/api/bookmarks", {
        userId,
        verseId: canonicalVerseId,
        label: reference,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/${userId}`] });
      setFeedbackMsg("Bookmarked!");
      setTimeout(() => router.back(), 600);
    } catch (err) {
      console.error("Bookmark failed:", err);
      setFeedbackMsg("Failed to bookmark");
      setTimeout(() => setFeedbackMsg(null), 1500);
    }
  }, [userId, canonicalVerseId, reference]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen
        options={{
          title: reference,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
      >
        <View style={[styles.verseCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Text style={[styles.verseRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            {reference}
          </Text>
          <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
            {text}
          </Text>
          <View style={[styles.translationTag, { backgroundColor: theme.accent + "18" }]}>
            <Text style={[styles.translationText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {txLabel}
            </Text>
          </View>
        </View>

        {feedbackMsg && (
          <View style={[styles.feedbackBanner, {
            backgroundColor: feedbackMsg.startsWith("Failed") ? theme.error + "20" : theme.success + "20",
            borderColor: feedbackMsg.startsWith("Failed") ? theme.error + "40" : theme.success + "40",
          }]}>
            <Ionicons
              name={feedbackMsg.startsWith("Failed") ? "alert-circle" : "checkmark-circle"}
              size={18}
              color={feedbackMsg.startsWith("Failed") ? theme.error : theme.success}
            />
            <Text style={[styles.feedbackText, {
              color: feedbackMsg.startsWith("Failed") ? theme.error : theme.success,
              fontFamily: "Inter_600SemiBold",
            }]}>
              {feedbackMsg}
            </Text>
          </View>
        )}

        <View style={styles.actionsGrid}>
          <ActionButton
            icon="copy-outline"
            label="Copy"
            theme={theme}
            onPress={handleCopy}
          />
          <ActionButton
            icon="color-fill-outline"
            label="Highlight"
            theme={theme}
            onPress={handleHighlight}
            color={theme.highlightYellow.replace("0.35", "1")}
          />
          <ActionButton
            icon="bookmark-outline"
            label="Bookmark"
            theme={theme}
            onPress={handleBookmark}
            color={theme.bookmarkBlue}
          />
          <ActionButton
            icon="language-outline"
            label="Words"
            theme={theme}
            onPress={handleWordStudy}
            color="#3B5998"
          />
          <ActionButton
            icon="time-outline"
            label="Context"
            theme={theme}
            onPress={handleStudy}
            color="#2E7D32"
          />
          <ActionButton
            icon="chatbubble-ellipses-outline"
            label="Insight"
            theme={theme}
            onPress={handleHistoricVoices}
            color="#3B6CB5"
          />
          <ActionButton
            icon="map-outline"
            label="Verse Map"
            theme={theme}
            onPress={handleVerseMap}
            color="#8B5CF6"
          />
          <ActionButton
            icon="school-outline"
            label="Guided Study"
            theme={theme}
            onPress={handleSocraticStudy}
            color="#C9933A"
          />
        </View>
      </ScrollView>
    </>
  );
}

function ActionButton({
  icon,
  label,
  theme,
  onPress,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  theme: typeof Colors.light;
  onPress: () => void;
  color?: string;
}) {
  const iconColor = color ?? theme.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          backgroundColor: theme.backgroundCard,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: (color ?? theme.textMuted) + "18" }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={[styles.actionLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  verseCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  verseRef: { fontSize: 13, marginBottom: 10 },
  verseText: { fontSize: 17, lineHeight: 28 },
  translationTag: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 12,
  },
  translationText: { fontSize: 10, letterSpacing: 0.5 },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionBtn: {
    width: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center" as const,
    gap: 8,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  actionLabel: { fontSize: 13 },
  feedbackBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  feedbackText: {
    fontSize: 14,
  },
});
