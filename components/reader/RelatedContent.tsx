import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface RelatedContentProps {
  bookId: number;
  bookName: string;
  chapter: number;
  totalChapters: number;
  translation: string;
  theme: typeof Colors.dark;
  isDark: boolean;
}

export default function RelatedContent({
  bookId,
  bookName,
  chapter,
  totalChapters,
  translation,
  theme,
  isDark,
}: RelatedContentProps) {
  const canGoNext = chapter < totalChapters;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.toolsRow}>
        <Pressable
          onPress={() =>
            router.push(
              `/word-study?book=${bookId}&chapter=${chapter}` as any,
            )
          }
          style={({ pressed }) => [
            styles.toolCard,
            {
              backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6",
              borderColor: theme.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={[styles.toolIcon, { backgroundColor: "#C9933A18" }]}>
            <Ionicons name="language-outline" size={20} color="#C9933A" />
          </View>
          <Text
            style={[
              styles.toolTitle,
              { color: theme.text, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Word Study
          </Text>
          <Text
            style={[
              styles.toolSub,
              { color: theme.textMuted, fontFamily: "Inter_400Regular" },
            ]}
          >
            Greek & Hebrew
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(tabs)/study",
              params: {
                tab: "application",
                bookId: String(bookId),
                chapter: String(chapter),
              },
            } as any)
          }
          style={({ pressed }) => [
            styles.toolCard,
            {
              backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6",
              borderColor: theme.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={[styles.toolIcon, { backgroundColor: "#E8456B18" }]}>
            <Ionicons name="heart-outline" size={20} color="#E8456B" />
          </View>
          <Text
            style={[
              styles.toolTitle,
              { color: theme.text, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Application
          </Text>
          <Text
            style={[
              styles.toolSub,
              { color: theme.textMuted, fontFamily: "Inter_400Regular" },
            ]}
          >
            Then & Now
          </Text>
        </Pressable>
      </View>

      <View style={styles.actionsCol}>
        {canGoNext && (
          <Pressable
            onPress={() =>
              router.replace(
                `/read/${bookId}/${chapter + 1}?translation=${translation}`,
              )
            }
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6",
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons
              name="arrow-forward-outline"
              size={18}
              color={theme.accent}
            />
            <Text
              style={[
                styles.actionText,
                { color: theme.text, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Continue Reading
            </Text>
            <Text
              style={[
                styles.actionMeta,
                { color: theme.textMuted, fontFamily: "Inter_400Regular" },
              ]}
            >
              {bookName} {chapter + 1}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.textMuted}
            />
          </Pressable>
        )}

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(tabs)/study",
              params: {
                bookId: String(bookId),
                chapter: String(chapter),
              },
            } as any)
          }
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6",
              borderColor: theme.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="layers-outline" size={18} color={theme.accent} />
          <Text
            style={[
              styles.actionText,
              { color: theme.text, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Study This Chapter
          </Text>
          <Text
            style={[
              styles.actionMeta,
              { color: theme.textMuted, fontFamily: "Inter_400Regular" },
            ]}
          >
            Deep Dive
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 28,
    paddingBottom: 20,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  toolsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  toolCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  toolTitle: {
    fontSize: 14,
  },
  toolSub: {
    fontSize: 11,
  },
  actionsCol: {
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
  },
  actionMeta: {
    fontSize: 12,
  },
});
