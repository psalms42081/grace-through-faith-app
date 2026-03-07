import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const BADGES = [
  { id: "first-read", title: "First Read", icon: "book" as const, color: "#C9933A", requirement: "Read your first chapter" },
  { id: "week-streak", title: "Week Warrior", icon: "flame" as const, color: "#FF6B35", requirement: "7-day reading streak" },
  { id: "plan-starter", title: "Plan Starter", icon: "flag" as const, color: "#3B6CB5", requirement: "Start a devotional plan" },
  { id: "prayer-warrior", title: "Prayer Warrior", icon: "hand-left" as const, color: "#8B5CF6", requirement: "Add 5 prayer requests" },
  { id: "deep-diver", title: "Deep Diver", icon: "layers" as const, color: "#2E7D32", requirement: "Use all 4 study layers" },
  { id: "perfect-week", title: "Perfect Week", icon: "trophy" as const, color: "#E8456B", requirement: "Read every day for a week" },
];

interface BadgesGridProps {
  earnedBadges: Set<string>;
  theme: typeof Colors.dark;
  isDark: boolean;
  sectionTitle: string;
}

export default function BadgesGrid({ earnedBadges, theme, isDark, sectionTitle }: BadgesGridProps) {
  return (
    <View style={styles.sectionPad}>
      <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
        {sectionTitle}
      </Text>
      <View style={styles.badgeGrid}>
        {BADGES.map((badge) => {
          const earned = earnedBadges.has(badge.id);
          return (
            <View
              key={badge.id}
              style={[
                styles.badgeCard,
                { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" },
                !earned && { opacity: 0.45 },
              ]}
            >
              <View style={[styles.badgeIcon, { backgroundColor: badge.color + (earned ? "20" : "10") }]}>
                <Ionicons name={badge.icon} size={22} color={earned ? badge.color : theme.textMuted} />
              </View>
              <Text
                style={[styles.badgeTitle, { color: earned ? theme.text : theme.textMuted, fontFamily: "Inter_600SemiBold" }]}
                numberOfLines={1}
              >
                {badge.title}
              </Text>
              <Text style={[styles.badgeReq, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                {badge.requirement}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionPad: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 22, marginBottom: 14 },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badgeCard: {
    width: "31%" as any,
    flexGrow: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTitle: { fontSize: 12, textAlign: "center" },
  badgeReq: { fontSize: 10, textAlign: "center", lineHeight: 16 },
});
