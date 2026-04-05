import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import TopicTrendingCard, {
  type TopicTrendingCardProps,
} from "./TopicTrendingCard";

interface TopicTrendingRowProps {
  topics: TopicTrendingCardProps[];
  heading?: string;
}

export default function TopicTrendingRow({
  topics,
  heading = "What Your Church Is Watching",
}: TopicTrendingRowProps) {
  if (topics.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headingWrapper}>
          <Text style={styles.heading}>{heading}</Text>
          <View style={styles.headingUnderline} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No topic data for this period
          </Text>
        </View>
      </View>
    );
  }

  const sorted = [...topics].sort(
    (a, b) => Math.abs(b.trend_percent) - Math.abs(a.trend_percent),
  );

  return (
    <View style={styles.container}>
      <View style={styles.headingWrapper}>
        <Text style={styles.heading}>{heading}</Text>
        <View style={styles.headingUnderline} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sorted.map((item, index) => (
          <View key={`trend-${index}`} style={index < sorted.length - 1 ? styles.cardGap : undefined}>
            <TopicTrendingCard {...item} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headingWrapper: {
    paddingHorizontal: 16,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  heading: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#F5F5F0",
    marginBottom: 4,
  },
  headingUnderline: {
    height: 2,
    backgroundColor: "#C9933A",
    borderRadius: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  cardGap: {
    marginRight: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
