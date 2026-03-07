import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface GrowthAnalyticsProps {
  studyMinutes: number;
  wordsLearned: number;
  totalSessions: number;
  theme: typeof Colors.dark;
  isDark: boolean;
  headerText: string;
  deepStudyLabel: string;
  greekHebrewLabel: string;
  socraticLabel: string;
}

export default function GrowthAnalytics({
  studyMinutes,
  wordsLearned,
  totalSessions,
  theme,
  isDark,
  headerText,
  deepStudyLabel,
  greekHebrewLabel,
  socraticLabel,
}: GrowthAnalyticsProps) {
  return (
    <View style={[styles.growthSection, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
      <Text style={[styles.growthHeader, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
        {headerText}
      </Text>

      <View style={styles.growthStatsRow}>
        <View style={styles.growthStatItem}>
          <View style={[styles.growthIconWrap, { backgroundColor: "rgba(139,92,246,0.12)" }]}>
            <Ionicons name="school" size={20} color="#8B5CF6" />
          </View>
          <Text style={[styles.growthStatNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {studyMinutes}
          </Text>
          <Text style={[styles.growthStatLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {deepStudyLabel}
          </Text>
        </View>

        <View style={styles.growthStatItem}>
          <View style={[styles.growthIconWrap, { backgroundColor: "rgba(201,147,58,0.12)" }]}>
            <Ionicons name="language" size={20} color="#C9933A" />
          </View>
          <Text style={[styles.growthStatNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {wordsLearned}
          </Text>
          <Text style={[styles.growthStatLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {greekHebrewLabel}
          </Text>
        </View>

        <View style={styles.growthStatItem}>
          <View style={[styles.growthIconWrap, { backgroundColor: "rgba(46,125,50,0.12)" }]}>
            <Ionicons name="book" size={20} color="#2E7D32" />
          </View>
          <Text style={[styles.growthStatNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {totalSessions}
          </Text>
          <Text style={[styles.growthStatLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {socraticLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  growthSection: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
  },
  growthHeader: { fontSize: 22, marginBottom: 18 },
  growthStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  growthStatItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  growthIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  growthStatNum: { fontSize: 22 },
  growthStatLabel: { fontSize: 11, textAlign: "center", lineHeight: 15 },
});
