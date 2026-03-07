import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export interface WeeklyStreakData {
  daysRead: boolean[];
  perfectWeeks: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;
}

interface WeeklyCalendarProps {
  data: WeeklyStreakData;
  theme: typeof Colors.dark;
  isDark: boolean;
}

export default function WeeklyCalendar({ data, theme, isDark }: WeeklyCalendarProps) {
  const todayIdx = new Date().getDay();
  return (
    <View style={styles.weekRow}>
      {DAY_LABELS.map((label, i) => {
        const isToday = i === todayIdx;
        const didRead = data.daysRead[i];
        return (
          <View key={i} style={styles.weekDayCol}>
            <Text style={[styles.weekLabel, { color: isToday ? theme.accent : theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              {label}
            </Text>
            <View
              style={[
                styles.weekDot,
                didRead && styles.weekDotFilled,
                isToday && !didRead && { borderColor: theme.accent, borderWidth: 2 },
                didRead && { backgroundColor: theme.accent },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  weekDayCol: {
    alignItems: "center",
    gap: 8,
  },
  weekLabel: { fontSize: 12 },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(128,128,128,0.15)",
  },
  weekDotFilled: {
    alignItems: "center",
    justifyContent: "center",
  },
});
