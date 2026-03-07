import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyDepth } from "@/contexts/StudyDepthContext";
import StudyDepthSelector from "@/components/StudyDepthSelector";
import SDAVerifiedBadge from "@/components/SDAVerifiedBadge";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sabbath"];

interface DayData {
  id: string;
  dayNumber: number;
  title: string | null;
  date: string | null;
  completed: boolean;
  contentMarkdown: string | null;
}

interface LessonData {
  id: string;
  lessonNumber: number;
  title: string;
  startDate: string | null;
  endDate: string | null;
  days: DayData[];
}

interface QuarterlyData {
  id: string;
  title: string;
  humanDate: string | null;
  colorPrimary: string | null;
}

export default function SabbathSchoolScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { depth } = useStudyDepth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data, isLoading, error } = useQuery<{
    quarterly: QuarterlyData | null;
    currentLesson: LessonData | null;
    currentLessonNumber: number;
    totalLessons: number;
    completedDays: number;
  }>({
    queryKey: [`/api/sabbath-school/current?userId=${userId}`],
  });

  const quarterly = data?.quarterly;
  const lesson = data?.currentLesson;
  const days = lesson?.days || [];
  const completedCount = data?.completedDays || 0;

  const todayDayOfWeek = new Date().getDay();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Sabbath School
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Loading this week's lesson...
          </Text>
        </View>
      ) : !quarterly || !lesson ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Sabbath School content is being synced. Please check back shortly.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.quarterlyCard, { backgroundColor: quarterly.colorPrimary || "#2E4161" }]}>
            <Text style={styles.quarterlyLabel}>CURRENT QUARTER</Text>
            <Text style={styles.quarterlyTitle}>{quarterly.title}</Text>
            {quarterly.humanDate && (
              <Text style={styles.quarterlyDate}>{quarterly.humanDate}</Text>
            )}
          </View>

          <View style={styles.lessonHeader}>
            <View style={styles.lessonBadge}>
              <Text style={[styles.lessonBadgeText, { color: theme.accent }]}>
                LESSON {data?.currentLessonNumber || lesson.lessonNumber}
              </Text>
            </View>
            <Text style={[styles.lessonTitle, { color: theme.text }]}>
              {lesson.title}
            </Text>
            {lesson.startDate && lesson.endDate && (
              <Text style={[styles.lessonDates, { color: theme.textMuted }]}>
                {lesson.startDate} — {lesson.endDate}
              </Text>
            )}
          </View>

          <StudyDepthSelector compact />

          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.accent,
                    width: `${(completedCount / Math.max(days.length, 1)) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textMuted }]}>
              {completedCount} of {days.length} days completed
            </Text>
          </View>

          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              const isToday = index === todayDayOfWeek;
              const dayLabel = DAY_LABELS[index] || `Day ${day.dayNumber}`;

              return (
                <Pressable
                  key={day.id}
                  onPress={() =>
                    router.push(
                      `/sabbath-school-day?lessonNumber=${lesson.lessonNumber}&dayNumber=${day.dayNumber}` as any
                    )
                  }
                  style={({ pressed }) => [
                    styles.dayCard,
                    {
                      backgroundColor: isToday
                        ? "rgba(201, 147, 58, 0.12)"
                        : theme.backgroundCard,
                      borderColor: isToday
                        ? "rgba(201, 147, 58, 0.3)"
                        : theme.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={styles.dayCardTop}>
                    <View style={styles.dayLabelRow}>
                      <Text
                        style={[
                          styles.dayLabel,
                          {
                            color: isToday ? theme.accent : theme.textMuted,
                            fontFamily: isToday ? "Inter_700Bold" : "Inter_600SemiBold",
                          },
                        ]}
                      >
                        {dayLabel}
                      </Text>
                      {isToday && (
                        <View style={[styles.todayDot, { backgroundColor: theme.accent }]} />
                      )}
                    </View>
                    {day.completed ? (
                      <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color={theme.border} />
                    )}
                  </View>
                  <Text
                    style={[styles.dayTitle, { color: theme.text }]}
                    numberOfLines={2}
                  >
                    {day.title || `Day ${day.dayNumber}`}
                  </Text>
                  {day.date && (
                    <Text style={[styles.dayDate, { color: theme.textMuted }]}>
                      {day.date}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() =>
              router.push(
                `/sabbath-school-discussion?lessonId=${lesson.id}&lessonTitle=${encodeURIComponent(lesson.title)}` as any
              )
            }
            style={({ pressed }) => [
              styles.discussionBtn,
              {
                backgroundColor: theme.accent,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="chatbubbles" size={22} color="#050507" />
            <View style={{ flex: 1 }}>
              <Text style={styles.discussionBtnTitle}>Discussion Mode</Text>
              <Text style={styles.discussionBtnSub}>
                Sabbath morning companion
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#050507" />
          </Pressable>

          <View style={styles.sourceFooter}>
            <Ionicons name="library-outline" size={12} color={theme.textMuted} />
            <Text style={[styles.sourceFooterText, { color: theme.textMuted }]}>
              Lesson content from Adventech (sabbath-school.adventech.io). Discussion prep is AI-generated.
            </Text>
          </View>

          <SDAVerifiedBadge />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  quarterlyCard: {
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  quarterlyLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.5,
  },
  quarterlyTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 20,
    color: "#fff",
    lineHeight: 28,
  },
  quarterlyDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  lessonHeader: { gap: 4 },
  lessonBadge: { marginBottom: 4 },
  lessonBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
  lessonTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 20,
    lineHeight: 28,
  },
  lessonDates: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  progressSection: { gap: 6 },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(201, 147, 58, 0.15)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  daysGrid: { gap: 8 },
  dayCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  dayCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dayLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  dayDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  discussionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 4,
  },
  discussionBtnTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#050507",
  },
  discussionBtnSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(5, 5, 7, 0.6)",
    marginTop: 1,
  },
  sourceFooter: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  sourceFooterText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
