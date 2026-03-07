import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

interface DevotionalCardProps {
  hasActivePlan: boolean;
  progress: number;
  total: number;
  enrollmentPlanId?: string;
  theme: typeof Colors.dark;
  isDark: boolean;
}

export default function DevotionalCard({ hasActivePlan, progress, total, enrollmentPlanId, theme, isDark }: DevotionalCardProps) {
  return (
    <Pressable
      onPress={() => {
        if (hasActivePlan && enrollmentPlanId) {
          router.push(`/devotional-day?planId=${enrollmentPlanId}`);
        } else if (hasActivePlan) {
          router.push("/devotional-day");
        } else {
          router.push("/devotionals");
        }
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={hasActivePlan ? "Continue your devotional plan" : "Browse devotional plans"}
    >
      <LinearGradient
        colors={isDark ? ["#1A1610", "#15120D"] : ["#FFF8EC", "#FFFDF6"]}
        style={styles.devotionalCard}
      >
        <View style={styles.devotionalLeft}>
          <View style={[styles.devotionalIconWrap, { backgroundColor: theme.accent + "20" }]}>
            <Ionicons name="flame" size={20} color={theme.accent} />
          </View>
          <View style={styles.devotionalInfo}>
            <Text style={[styles.devotionalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {hasActivePlan ? "Continue Your Plan" : "Devotional Plans"}
            </Text>
            <Text style={[styles.devotionalSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {hasActivePlan
                ? `Day ${progress} of ${total}`
                : "Guided daily reading"}
            </Text>
          </View>
        </View>
        {hasActivePlan && (
          <View style={styles.devotionalProgress}>
            <View style={[styles.devotionalProgressTrack, { backgroundColor: isDark ? "#2A2520" : theme.border }]}>
              <LinearGradient
                colors={[theme.accent, theme.accentDark]}
                style={[styles.devotionalProgressFill, { width: `${Math.min((progress / total) * 100, 100)}%` as any }]}
              />
            </View>
          </View>
        )}
        {!hasActivePlan && (
          <Ionicons name="chevron-forward" size={20} color={theme.accent} />
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  devotionalCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  devotionalLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  devotionalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  devotionalInfo: { flex: 1 },
  devotionalTitle: { fontSize: 16, marginBottom: 2 },
  devotionalSub: { fontSize: 13, lineHeight: 19 },
  devotionalProgress: { width: 56, marginLeft: 12 },
  devotionalProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  devotionalProgressFill: {
    height: 6,
    borderRadius: 3,
  },
});
