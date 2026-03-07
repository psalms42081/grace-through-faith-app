import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

interface GuidedToolsRowProps {
  theme: typeof Colors.dark;
  isDark: boolean;
}

export default function GuidedToolsRow({ theme, isDark }: GuidedToolsRowProps) {
  return (
    <View style={styles.guidedRow}>
      <Pressable
        onPress={() => router.push({ pathname: "/(tabs)/study", params: { showIntro: "true" } })}
        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}
      >
        <LinearGradient
          colors={isDark ? ["#14172E", "#0D1028"] : ["#1A1F3C", "#141833"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.guidedCard}
        >
          <View style={styles.guidedIconWrap}>
            <Ionicons name="layers" size={20} color={theme.accent} />
          </View>
          <Text style={[styles.guidedTitle, { fontFamily: "Inter_600SemiBold" }]}>4-Layer Study</Text>
          <Text style={[styles.guidedSub, { fontFamily: "Inter_400Regular" }]}>Deep Bible analysis</Text>
        </LinearGradient>
      </Pressable>

      <Pressable
        onPress={() => router.push("/prayer-journal")}
        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}
      >
        <LinearGradient
          colors={isDark ? ["#1A1610", "#15120D"] : ["#2E3D1F", "#1B2A12"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.guidedCard}
        >
          <View style={[styles.guidedIconWrap, { backgroundColor: "rgba(102,187,106,0.15)" }]}>
            <Ionicons name="journal" size={20} color="#66BB6A" />
          </View>
          <Text style={[styles.guidedTitle, { fontFamily: "Inter_600SemiBold" }]}>Prayer Journal</Text>
          <Text style={[styles.guidedSub, { fontFamily: "Inter_400Regular" }]}>Your prayer life</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  guidedRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
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
