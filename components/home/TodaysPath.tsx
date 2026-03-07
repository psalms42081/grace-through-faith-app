import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface PathItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  completed: boolean;
  onPress: () => void;
}

interface TodaysPathProps {
  theme: any;
  isDark: boolean;
  studyDone: boolean;
  prayerDone: boolean;
  hasRecentRead: boolean;
  hasSabbathSchool: boolean;
  hasActivePlan: boolean;
}

export default function TodaysPath({
  theme,
  isDark,
  studyDone,
  prayerDone,
  hasRecentRead,
  hasSabbathSchool,
  hasActivePlan,
}: TodaysPathProps) {
  const items: PathItem[] = [
    {
      icon: "book-outline",
      label: "Read today's passage",
      completed: hasRecentRead,
      onPress: () => router.push("/(tabs)/read"),
    },
    {
      icon: "hand-left-outline",
      label: "Pray",
      completed: prayerDone,
      onPress: () => router.push("/prayer-journal"),
    },
    {
      icon: "compass-outline",
      label: "Continue your study",
      completed: studyDone,
      onPress: () => router.push("/study-paths"),
    },
  ];

  if (hasSabbathSchool) {
    items.push({
      icon: "school-outline",
      label: "Sabbath School lesson",
      completed: false,
      onPress: () => router.push("/sabbath-school"),
    });
  }

  if (hasActivePlan) {
    items.splice(2, 0, {
      icon: "calendar-outline",
      label: "Today's devotional",
      completed: false,
      onPress: () => router.push("/(tabs)/plans"),
    });
  }

  return (
    <View style={[s.card, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
      <View style={s.header}>
        <Ionicons name="sunny-outline" size={18} color={theme.accent} />
        <Text style={[s.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Your Daily Rhythm
        </Text>
      </View>
      {items.map((item, i) => (
        <Pressable
          key={item.label}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          style={({ pressed }) => [
            s.row,
            i < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={[s.iconWrap, { backgroundColor: item.completed ? theme.accent + "20" : (isDark ? "#1A1A2E" : "#F0EBE0") }]}>
            <Ionicons
              name={item.completed ? "checkmark" : item.icon}
              size={18}
              color={item.completed ? theme.accent : theme.textMuted}
            />
          </View>
          <Text
            style={[
              s.label,
              {
                color: item.completed ? theme.textMuted : theme.text,
                fontFamily: "Inter_500Medium",
                textDecorationLine: item.completed ? "line-through" : "none",
              },
            ]}
          >
            {item.label}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 14,
  },
});
