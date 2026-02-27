import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import * as Clipboard from "expo-clipboard";

export default function VerseActionsSheet() {
  const { bookId, chapter, verse, text, bookName } =
    useLocalSearchParams<{
      bookId: string;
      chapter: string;
      verse: string;
      text: string;
      bookName: string;
    }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const reference = `${bookName} ${chapter}:${verse}`;

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(`${text}\n— ${reference} (KJV)`);
    router.back();
  }, [text, reference]);

  const handleStudy = useCallback(() => {
    router.back();
    setTimeout(() => {
      router.push(`/passage-context?bookId=${bookId}&chapter=${chapter}&bookName=${encodeURIComponent(bookName || "")}`);
    }, 300);
  }, [bookId, chapter, bookName]);

  const handleHighlight = useCallback(() => {
    router.back();
  }, []);

  const handleBookmark = useCallback(() => {
    router.back();
  }, []);

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
              KJV
            </Text>
          </View>
        </View>

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
            icon="library-outline"
            label="Study"
            theme={theme}
            onPress={handleStudy}
            color={theme.accent}
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
});
