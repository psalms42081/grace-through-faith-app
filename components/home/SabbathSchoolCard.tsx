import React from "react";
import { View, Text, StyleSheet, Pressable, ImageBackground } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";

type SabbathSchoolCurrentResponse = {
  quarterly: {
    coverUrl: string | null;
    title: string;
  } | null;
  currentLesson: {
    title: string;
    lessonNumber: number;
    days?: Array<{
      id: string;
      dayNumber: number;
      title: string | null;
      completed: boolean;
    }>;
  } | null;
  completedDays: number;
  todayDayNumber: number | null;
};

const CARD_BG_IMAGE = require("@/assets/home-cards/sabbath-school.png");

export default function SabbathSchoolCard() {
  const { theme } = useTheme();
  const { userId } = useAuth();

  const { data, isLoading, isError } = useQuery<SabbathSchoolCurrentResponse>({
    queryKey: [`/api/sabbath-school/current?userId=${userId}`],
  });

  const isSaturday = new Date().getDay() === 6;

  if (isLoading) {
    return <View style={styles.skeletonCard} />;
  }

  if (isError || !data?.currentLesson) {
    return null;
  }

  const lesson = data.currentLesson;
  const totalDays = lesson.days?.length || 7;
  const completedDays = Math.min(data.completedDays || 0, totalDays);
  const progressPct = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
  const todayDay = lesson.days?.find(
    (d) => d.dayNumber === data.todayDayNumber
  );
  const todayLabel = todayDay?.title
    ? `Day ${todayDay.dayNumber} · ${todayDay.title}`
    : `${completedDays} of ${totalDays} days completed`;
  const coverUri = data.quarterly?.coverUrl || null;

  return (
    <Pressable
      onPress={() => router.push("/sabbath-school" as any)}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
      testID="home-sabbath-school-card"
    >
      <View style={styles.contentWrap}>
        <ImageBackground
          source={coverUri ? { uri: coverUri } : CARD_BG_IMAGE}
          style={styles.bgImage}
          resizeMode="cover"
        >
          <View style={styles.bgOverlay} />
          <View style={styles.content}>
            <View style={styles.topRow}>
              <View style={styles.labelRow}>
                <Ionicons name="book-outline" size={14} color="#C9933A" />
                <Text style={styles.label}>SABBATH SCHOOL</Text>
              </View>

              {isSaturday && (
                <View style={styles.badge}>
                  <Ionicons name="chatbubble-ellipses-outline" size={12} color="#050507" />
                  <Text style={styles.badgeText}>Discussion Guide Ready</Text>
                </View>
              )}
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {lesson.title}
            </Text>

            <Text style={[styles.progressText, { color: theme.textMuted }]} numberOfLines={1}>
              {`Lesson ${lesson.lessonNumber} · ${todayLabel}`}
            </Text>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Pressable
              style={styles.ctaButton}
              onPress={() => router.push("/sabbath-school" as any)}
            >
              <Text style={styles.ctaText}>Open Today's Lesson →</Text>
            </Pressable>
          </View>
        </ImageBackground>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    minHeight: 220,
    marginBottom: 16,
  },
  skeletonCard: {
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minHeight: 136,
    marginBottom: 16,
  },
  contentWrap: {
    flex: 1,
  },
  bgImage: {
    flex: 1,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 10,
    justifyContent: "flex-end",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    color: "#C9933A",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: "#FFFFFF",
    fontFamily: "Lora_700Bold",
    fontSize: 26,
    lineHeight: 32,
  },
  progressText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  progressBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(201, 147, 58, 0.15)",
    overflow: "hidden",
    marginTop: 2,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#C9933A",
  },
  ctaButton: {
    backgroundColor: "#C9933A",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  ctaText: {
    color: "#050507",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#C9933A",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#050507",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
});
