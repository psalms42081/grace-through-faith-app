import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const AGE_GROUP_LABELS: Record<string, string> = {
  youth: "Teens",
  young_adult: "Young Adults",
  adult: "Adults",
  senior: "Seniors",
};

export interface TopicTrendingCardProps {
  topic: string;
  views: number;
  trend_direction: "rising" | "falling" | "stable";
  trend_percent: number;
  topic_type: string;
  completion_rate?: number;
  top_age_group?: string;
  top_age_group_count?: number;
}

function capitalize(s: string): string {
  return s
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function TopicTrendingCard({
  topic,
  views,
  trend_direction,
  trend_percent,
  completion_rate,
  top_age_group,
  top_age_group_count,
}: TopicTrendingCardProps) {
  const showAgeGroup = !!top_age_group && (top_age_group_count ?? 0) >= 10;
  const completionPct = completion_rate != null ? Math.round(completion_rate * 100) : null;

  return (
    <View style={styles.card}>
      <View style={styles.trendRow}>
        {trend_direction === "rising" && (
          <>
            <Ionicons name="arrow-up" size={13} color="#22C55E" />
            <Text style={styles.trendRising}>{trend_percent}%</Text>
          </>
        )}
        {trend_direction === "falling" && (
          <>
            <Ionicons name="arrow-down" size={13} color="#EF4444" />
            <Text style={styles.trendFalling}>{Math.abs(trend_percent)}%</Text>
          </>
        )}
        {trend_direction === "stable" && (
          <>
            <Ionicons name="arrow-forward" size={13} color="#6B7280" />
            <Text style={styles.trendStable}>Stable</Text>
          </>
        )}
      </View>

      <Text style={styles.topicName} numberOfLines={2}>
        {capitalize(topic)}
      </Text>

      {completionPct != null && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(completionPct, 100)}%` },
            ]}
          />
        </View>
      )}

      <Text style={styles.statsLine}>
        {views} view{views !== 1 ? "s" : ""}
        {completionPct != null ? ` · ${completionPct}% complete` : ""}
      </Text>

      {showAgeGroup && (
        <Text style={styles.ageGroup}>
          Top: {AGE_GROUP_LABELS[top_age_group!] ?? top_age_group}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: "#141518",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1F24",
    padding: 14,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  trendRising: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#22C55E",
  },
  trendFalling: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#EF4444",
  },
  trendStable: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#6B7280",
  },
  topicName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#F5F5F0",
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "#1E1F24",
    borderRadius: 2,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: "#C9933A",
    borderRadius: 2,
  },
  statsLine: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#6B7280",
  },
  ageGroup: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#6B7280",
    marginTop: 8,
  },
});
