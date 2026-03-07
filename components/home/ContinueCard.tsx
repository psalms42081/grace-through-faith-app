import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

type ActivityType = "reading" | "sabbath-school" | "study-path" | "devotional";

interface ContinueCardProps {
  lastRead?: {
    bookId: number;
    bookName: string;
    chapter: number;
    translation: string;
  } | null;
  ssData?: {
    currentLesson: { title: string; lessonNumber: number } | null;
    completedDays: number;
  } | null;
  hasActivePlan?: boolean;
  enrollmentPlanId?: string;
  theme: typeof Colors.dark;
  isDark: boolean;
}

const ACTIVITY_CONFIG: Record<ActivityType, {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  gradientColors: [string, string];
}> = {
  reading: {
    icon: "book",
    label: "Continue Your Journey",
    gradientColors: ["#C9933A", "#A67B2E"],
  },
  "sabbath-school": {
    icon: "school",
    label: "Continue Your Journey",
    gradientColors: ["#5B8DEF", "#3A6DD0"],
  },
  "study-path": {
    icon: "compass",
    label: "Continue Your Journey",
    gradientColors: ["#4ECCA3", "#2EAD84"],
  },
  devotional: {
    icon: "sunny",
    label: "Continue Your Journey",
    gradientColors: ["#E8A838", "#C98A20"],
  },
};

export default function ContinueCard({
  lastRead,
  ssData,
  hasActivePlan,
  enrollmentPlanId,
  theme,
  isDark,
}: ContinueCardProps) {
  let activityType: ActivityType = "reading";
  let title = "";
  let subtitle = "Pick up where you left off";
  let onPress: () => void = () => {};

  if (lastRead) {
    activityType = "reading";
    title = `${lastRead.bookName} ${lastRead.chapter}`;
    onPress = () => router.push(`/read/${lastRead.bookId}/${lastRead.chapter}?translation=${lastRead.translation || "KJV"}`);
  } else if (ssData?.currentLesson) {
    activityType = "sabbath-school";
    title = ssData.currentLesson.title;
    subtitle = `Lesson ${ssData.currentLesson.lessonNumber} - ${ssData.completedDays}/7 days`;
    onPress = () => router.push("/sabbath-school");
  } else if (hasActivePlan && enrollmentPlanId) {
    activityType = "devotional";
    title = "Today's Devotional";
    subtitle = "Continue your daily reading plan";
    onPress = () => router.push("/(tabs)/plans");
  } else {
    return null;
  }

  const config = ACTIVITY_CONFIG[activityType];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
      ]}
      testID="home-continue-card"
    >
      <View style={s.top}>
        <LinearGradient
          colors={config.gradientColors}
          style={s.iconWrap}
        >
          <Ionicons name={config.icon} size={20} color="#fff" />
        </LinearGradient>
        <View style={s.info}>
          <Text style={[s.label, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {config.label}
          </Text>
          <Text style={[s.title, { color: theme.text, fontFamily: "Lora_600SemiBold" }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>
      <View style={s.bottom}>
        <Text style={[s.hint, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {subtitle}
        </Text>
        <Ionicons name="play-circle" size={36} color={theme.accent} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  label: { fontSize: 12, marginBottom: 3 },
  title: { fontSize: 19 },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(201,147,58,0.15)",
  },
  hint: { fontSize: 13, lineHeight: 19 },
});
