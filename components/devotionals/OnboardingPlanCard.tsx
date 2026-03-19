import React from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface OnboardingPlanCardProps {
  title: string;
  description: string | null;
  totalDays: number;
  theme: typeof Colors.dark;
  enrolling: boolean;
  onEnroll: () => void;
}

export default function OnboardingPlanCard({
  title,
  description,
  totalDays,
  theme,
  enrolling,
  onEnroll,
}: OnboardingPlanCardProps) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundCard, borderColor: theme.border },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: theme.accent + "15" }]}>
          <Ionicons name="book-outline" size={18} color={theme.accent} />
        </View>
        <View style={styles.metaWrap}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.days, { color: theme.textMuted }]}>
            {totalDays} days
          </Text>
        </View>
      </View>
      {description && (
        <Text style={[styles.desc, { color: theme.textSecondary }]} numberOfLines={2}>
          {description}
        </Text>
      )}
      <Pressable
        onPress={onEnroll}
        disabled={enrolling}
        style={({ pressed }) => [
          styles.enrollBtn,
          { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
        ]}
        testID={`onboarding-enroll-${title.replace(/\s+/g, "-").toLowerCase()}`}
      >
        {enrolling ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.enrollText}>Start this plan</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metaWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: "Lora_600SemiBold",
  },
  days: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  desc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  enrollBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  enrollText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
