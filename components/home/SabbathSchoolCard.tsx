import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

interface SabbathSchoolCardProps {
  ssData: {
    currentLesson: { title: string; lessonNumber: number } | null;
    completedDays: number;
  };
  theme: typeof Colors.dark;
  isDark: boolean;
}

export default function SabbathSchoolCard({ ssData, theme, isDark }: SabbathSchoolCardProps) {
  if (!ssData.currentLesson) return null;

  return (
    <Pressable
      onPress={() => router.push("/sabbath-school" as any)}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <LinearGradient
        colors={isDark ? ["#0D1A2E", "#0A1322"] : ["#1A2E46", "#152640"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.guidedCard, { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 }]}
      >
        <View style={[styles.guidedIconWrap, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
          <Ionicons name="book" size={20} color="#3B82F6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.guidedTitle, { fontFamily: "Inter_600SemiBold", textAlign: "left" }]}>
            This Week's Lesson
          </Text>
          <Text style={[styles.guidedSub, { fontFamily: "Inter_400Regular", textAlign: "left" }]} numberOfLines={1}>
            {ssData.currentLesson.title}
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: "#3B82F6" }}>
            {ssData.completedDays || 0}/7
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  guidedCard: {
    borderRadius: 18,
    padding: 20,
    gap: 8,
  },
  guidedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(201,147,58,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  guidedTitle: { color: "#fff", fontSize: 15 },
  guidedSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, lineHeight: 18 },
});
