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
import { safeGoBack } from "@/lib/safe-back";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
  const { theme } = useTheme();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();

  const canonicalVerseId = verseId || `${bookId}_${chapter}_${verse}`;
  const reference = `${bookName} ${chapter}:${verse}`;
  const txLabel = translation || "KJV";

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(`${text}\n\u2014 ${reference} (${txLabel})`);
    safeGoBack(router);
  }, [text, reference, txLabel]);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleHighlight = useCallback(async () => {
    if (!userId) {
      setFeedbackMsg("Sign in to save highlights");
      setTimeout(() => setFeedbackMsg(null), 2500);
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
      setTimeout(() => safeGoBack(router), 600);
    } catch (err: any) {
      console.error("Highlight failed:", err);
      const isAuth = !userId || err?.message?.includes("401") || err?.message?.includes("Unauthorized");
      setFeedbackMsg(isAuth ? "Sign in to save highlights" : "Could not save highlight. Please try again.");
      setTimeout(() => setFeedbackMsg(null), 2500);
    }
  }, [userId, canonicalVerseId]);

  const handleBookmark = useCallback(async () => {
    if (!userId) {
      setFeedbackMsg("Sign in to save bookmarks");
      setTimeout(() => setFeedbackMsg(null), 2500);
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
      setTimeout(() => safeGoBack(router), 600);
    } catch (err: any) {
      console.error("Bookmark failed:", err);
      const isAuth = !userId || err?.message?.includes("401") || err?.message?.includes("Unauthorized");
      setFeedbackMsg(isAuth ? "Sign in to save bookmarks" : "Could not save bookmark. Please try again.");
      setTimeout(() => setFeedbackMsg(null), 2500);
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
            backgroundColor: (feedbackMsg.startsWith("Sign in") || feedbackMsg.startsWith("Could not")) ? theme.error + "20" : theme.success + "20",
            borderColor: (feedbackMsg.startsWith("Sign in") || feedbackMsg.startsWith("Could not")) ? theme.error + "40" : theme.success + "40",
          }]}>
            <Ionicons
              name={(feedbackMsg.startsWith("Sign in") || feedbackMsg.startsWith("Could not")) ? "alert-circle" : "checkmark-circle"}
              size={18}
              color={(feedbackMsg.startsWith("Sign in") || feedbackMsg.startsWith("Could not")) ? theme.error : theme.success}
            />
            <Text style={[styles.feedbackText, {
              color: (feedbackMsg.startsWith("Sign in") || feedbackMsg.startsWith("Could not")) ? theme.error : theme.success,
              fontFamily: "Inter_600SemiBold",
            }]}>
              {feedbackMsg}
            </Text>
          </View>
        )}

        <View style={styles.quickRow}>
          <QuickAction icon="copy-outline" label="Copy" theme={theme} onPress={handleCopy} />
          <QuickAction icon="color-fill-outline" label="Highlight" theme={theme} onPress={handleHighlight} color={theme.highlightYellow.replace("0.35", "1")} />
          <QuickAction icon="bookmark-outline" label="Bookmark" theme={theme} onPress={handleBookmark} color={theme.bookmarkBlue} />
        </View>

        <Text style={[styles.studySectionLabel, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
          STUDY DEEPER
        </Text>

        <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", paddingHorizontal: 20, paddingBottom: 12, lineHeight: 18 }}>
          Finish the chapter to access study tools — Context, Insight, Word Study, and more.
        </Text>
      </ScrollView>
    </>
  );
}

function QuickAction({
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
        styles.quickBtn,
        {
          backgroundColor: theme.backgroundCard,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text style={[styles.quickLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
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
  quickRow: {
    flexDirection: "row" as const,
    gap: 10,
    marginBottom: 20,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  quickLabel: { fontSize: 13 },
  studySectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 12,
  },
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
