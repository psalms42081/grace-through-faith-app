import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

interface ContinueReadingCardProps {
  lastRead: {
    bookId: number;
    bookName: string;
    chapter: number;
    translation: string;
  };
  theme: typeof Colors.dark;
  isDark: boolean;
}

export default function ContinueReadingCard({ lastRead, theme, isDark }: ContinueReadingCardProps) {
  return (
    <Pressable
      onPress={() => router.push(`/read/${lastRead.bookId}/${lastRead.chapter}?translation=${lastRead.translation || "KJV"}`)}
      style={({ pressed }) => [
        styles.continueCard,
        { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
      ]}
      testID="home-continue-reading"
    >
      <View style={styles.continueTop}>
        <LinearGradient
          colors={[theme.accent, theme.accentDark]}
          style={styles.continueIcon}
        >
          <Ionicons name="book" size={20} color="#fff" />
        </LinearGradient>
        <View style={styles.continueInfo}>
          <Text style={[styles.continueLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Continue Reading
          </Text>
          <Text style={[styles.continueTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]} numberOfLines={1}>
            {lastRead.bookName} {lastRead.chapter}
          </Text>
        </View>
      </View>
      <View style={styles.continueBottom}>
        <Text style={[styles.continueHint, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Pick up where you left off
        </Text>
        <Ionicons name="play-circle" size={36} color={theme.accent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  continueCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
  },
  continueTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  continueIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  continueInfo: { flex: 1 },
  continueLabel: { fontSize: 12, marginBottom: 3 },
  continueTitle: { fontSize: 19 },
  continueBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(201,147,58,0.15)",
  },
  continueHint: { fontSize: 13, lineHeight: 19 },
});
