import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/components/ScreenHeader";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyDepth } from "@/contexts/StudyDepthContext";
import StudyDepthSelector from "@/components/StudyDepthSelector";
import SDAVerifiedBadge from "@/components/SDAVerifiedBadge";
import { useTranslation } from "react-i18next";
import { useEllenWhite } from "@/contexts/PioneerContext";
import { FEATURE_GUIDES } from "@/constants/ellenWhiteSteps";

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
  videoByArtist?: Array<{artist: string, clips: Array<{src: string, title: string, thumbnail: string, target: string}>}> | null;
}

interface CompanionData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
}

interface QuarterlyData {
  id: string;
  title: string;
  humanDate: string | null;
  colorPrimary: string | null;
  quarterCode?: string;
}

type UserPreferencesResponse = {
  preferredCurriculum?: "adult" | "inverse" | string | null;
};

export default function SabbathSchoolScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { depth } = useStudyDepth();
  const { t } = useTranslation();
  const { tryAutoGuide } = useEllenWhite();
  const [showArchive, setShowArchive] = useState(false);
  const [activeVideo, setActiveVideo] = useState<{src: string, title: string, artist: string} | null>(null);
  const videoRef = React.useRef<Video | null>(null);

  const closeVideoModal = async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.stopAsync();
        await videoRef.current.unloadAsync();
      }
    } catch {}
    setActiveVideo(null);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (FEATURE_GUIDES["sabbath-school"]) {
        tryAutoGuide("sabbath-school", FEATURE_GUIDES["sabbath-school"]);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: userPrefs } = useQuery<UserPreferencesResponse>({
    queryKey: ["/api/user/preferences"],
  });
  const selectedCurriculum = userPrefs?.preferredCurriculum === "inverse" ? "inverse" : "adult";

  const { data, isLoading, error } = useQuery<{
    quarterly: QuarterlyData | null;
    currentLesson: LessonData | null;
    currentLessonNumber: number;
    totalLessons: number;
    completedDays: number;
    todayDayNumber: number | null;
    companion: CompanionData | null;
  }>({
    queryKey: [`/api/sabbath-school/current?userId=${userId}&curriculum=${selectedCurriculum}`],
  });

  const { data: archiveData } = useQuery<{ quarters: QuarterlyData[] }>({
    queryKey: ["/api/sabbath-school/quarters"],
    enabled: showArchive,
  });

  const quarterly = data?.quarterly;
  const lesson = data?.currentLesson;
  const days = lesson?.days || [];
  const completedCount = data?.completedDays || 0;
  const todayDayNumber = data?.todayDayNumber || null;
  const companion = data?.companion || null;
  const lessonVideoClips = (lesson?.videoByArtist ?? [])
    .flatMap((group) =>
      (group?.clips ?? []).map((clip) => ({
        ...clip,
        artist: group.artist,
      }))
    )
    .filter((clip) => !!clip.src)
    .slice(0, 5);

  const pastQuarters = (archiveData?.quarters || []).filter(
    (q) => quarterly && q.id !== quarterly.id
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title={t("sabbathSchool.title")} />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            {t("sabbathSchool.loading")}
          </Text>
        </View>
      ) : !quarterly || !lesson ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            {t("sabbathSchool.syncing")}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.quarterlyCard, { backgroundColor: quarterly.colorPrimary || "#2E4161" }]}>
            <Text style={styles.quarterlyLabel}>{t("sabbathSchool.currentQuarter")}</Text>
            <Text style={styles.quarterlyTitle}>{quarterly.title}</Text>
            {quarterly.humanDate && (
              <Text style={styles.quarterlyDate}>{quarterly.humanDate}</Text>
            )}
          </View>

          <View style={styles.lessonHeader}>
            <View style={styles.lessonBadge}>
              <Text style={[styles.lessonBadgeText, { color: theme.accent }]}>
                {t("sabbathSchool.lesson")} {data?.currentLessonNumber || lesson.lessonNumber}
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
              {t("sabbathSchool.daysCompleted", { completed: completedCount, total: days.length })}
            </Text>
          </View>

          <View style={styles.dailyStudyHeader}>
            <Text style={[styles.dailyStudyLabel, { color: theme.textSecondary }]}>
              {t("sabbathSchool.dailyStudy", { defaultValue: "Daily Study Guide" })}
            </Text>
          </View>

          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              const isToday = todayDayNumber === day.dayNumber;
              const dayLabel = DAY_LABELS[index] || `Day ${day.dayNumber}`;
              const isCompleted = day.completed;
              const isPast = todayDayNumber !== null && day.dayNumber < todayDayNumber && !isCompleted;

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
                        ? "rgba(201, 147, 58, 0.15)"
                        : isCompleted
                          ? "rgba(34, 197, 94, 0.06)"
                          : theme.backgroundCard,
                      borderColor: isToday
                        ? "rgba(201, 147, 58, 0.5)"
                        : isCompleted
                          ? "rgba(34, 197, 94, 0.2)"
                          : theme.border,
                      borderWidth: isToday ? 1.5 : 1,
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
                            color: isToday ? theme.accent : isCompleted ? "#22C55E" : theme.textMuted,
                            fontFamily: isToday ? "Inter_700Bold" : "Inter_600SemiBold",
                          },
                        ]}
                      >
                        {dayLabel}
                      </Text>
                      {isToday && (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>Today</Text>
                        </View>
                      )}
                    </View>
                    {isCompleted ? (
                      <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                    ) : isToday ? (
                      <Ionicons name="arrow-forward-circle" size={20} color={theme.accent} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color={theme.border} />
                    )}
                  </View>
                  <Text
                    style={[styles.dayTitle, { color: isCompleted ? theme.textSecondary : theme.text }]}
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

          {companion && (
            <Pressable
              onPress={() => router.push(`/resource-detail?slug=${companion.slug}` as any)}
              style={({ pressed }) => [
                styles.companionCard,
                {
                  backgroundColor: isDark ? "rgba(139, 92, 246, 0.1)" : "rgba(139, 92, 246, 0.06)",
                  borderColor: isDark ? "rgba(139, 92, 246, 0.25)" : "rgba(139, 92, 246, 0.15)",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.companionCardHeader}>
                <View style={styles.companionCardIcon}>
                  <Ionicons name="book" size={18} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.companionCardLabel, { color: "#8B5CF6" }]}>
                    Lesson Companion
                  </Text>
                  <Text style={[styles.companionCardTitle, { color: theme.text }]} numberOfLines={2}>
                    {companion.title.replace(/^Companion:\s*/i, "")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </View>
              <Text style={[styles.companionCardSub, { color: theme.textSecondary }]}>
                A practical companion for deeper weekly study
              </Text>
            </Pressable>
          )}

          {lessonVideoClips.length > 0 && (
            <View style={styles.videoSection}>
              <Text style={styles.videoSectionTitle}>Watch This Lesson</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.videoRow}
              >
                {lessonVideoClips.map((clip, index) => {
                  const isActive = activeVideo?.src === clip.src;
                  return (
                    <Pressable
                      key={`${clip.src}-${index}`}
                      onPress={() =>
                        isActive
                          ? closeVideoModal()
                          : setActiveVideo({
                              src: clip.src,
                              title: clip.title || "Lesson Clip",
                              artist: clip.artist,
                            })
                      }
                      style={({ pressed }) => [styles.videoCard, { opacity: pressed ? 0.8 : 1 }]}
                    >
                      {isActive ? (
                        <Video
                          ref={videoRef}
                          source={{ uri: clip.src }}
                          style={styles.videoThumb}
                          resizeMode={ResizeMode.CONTAIN}
                          shouldPlay
                          useNativeControls
                        />
                      ) : clip.thumbnail ? (
                        <Image source={{ uri: clip.thumbnail }} style={styles.videoThumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.videoThumb, { backgroundColor: "rgba(255,255,255,0.08)" }]} />
                      )}
                      <Text style={styles.videoTitle} numberOfLines={isActive ? 1 : 2}>
                        {clip.title || "Lesson Clip"}
                      </Text>
                      <Text style={styles.videoArtist} numberOfLines={1}>
                        {clip.artist}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

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
              <Text style={styles.discussionBtnTitle}>Lesson Discussion Guide</Text>
              <Text style={styles.discussionBtnSub}>
                Discussion questions, key themes, and talk prompts
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#050507" />
          </Pressable>

          <Pressable
            onPress={() => setShowArchive(!showArchive)}
            style={({ pressed }) => [
              styles.archiveToggle,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="library-outline" size={18} color={theme.textSecondary} />
            <Text style={[styles.archiveToggleText, { color: theme.text }]}>
              {t("sabbathSchool.viewArchive")}
            </Text>
            <Ionicons
              name={showArchive ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.textMuted}
            />
          </Pressable>

          {showArchive && (
            <View style={styles.archiveSection}>
              {pastQuarters.length === 0 ? (
                <Text style={[styles.archiveEmpty, { color: theme.textMuted }]}>
                  {t("sabbathSchool.noArchive")}
                </Text>
              ) : (
                pastQuarters.map((q) => (
                  <Pressable
                    key={q.id}
                    onPress={() =>
                      router.push(
                        `/sabbath-school-quarter?quarterCode=${(q as any).quarterCode}&title=${encodeURIComponent(q.title)}` as any
                      )
                    }
                    style={({ pressed }) => [
                      styles.archiveCard,
                      {
                        backgroundColor: q.colorPrimary || "#2E4161",
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.archiveCardTitle}>{q.title}</Text>
                    {q.humanDate && (
                      <Text style={styles.archiveCardDate}>{q.humanDate}</Text>
                    )}
                  </Pressable>
                ))
              )}
            </View>
          )}

          <View style={styles.sourceFooter}>
            <Ionicons name="library-outline" size={12} color={theme.textMuted} />
            <Text style={[styles.sourceFooterText, { color: theme.textMuted }]}>
              {t("sabbathSchool.sourceAttribution")}
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
  dailyStudyHeader: {
    paddingTop: 4,
    paddingBottom: 2,
  },
  dailyStudyLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  daysGrid: { gap: 8 },
  dayCard: {
    borderRadius: 14,
    padding: 14,
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
    gap: 8,
  },
  dayLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  todayBadge: {
    backgroundColor: "rgba(201, 147, 58, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todayBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: "#C9933A",
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
  companionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  companionCardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  companionCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  companionCardLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  companionCardTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 2,
  },
  companionCardSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 48,
  },
  videoSection: {
    gap: 10,
    marginTop: 4,
  },
  videoSectionTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
    color: "#C9933A",
  },
  videoRow: {
    gap: 10,
    paddingRight: 8,
  },
  videoCard: {
    width: 200,
    gap: 6,
  },
  videoThumb: {
    width: 200,
    aspectRatio: 16 / 9,
    borderRadius: 8,
  },
  videoTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#FFFFFF",
    lineHeight: 17,
  },
  videoArtist: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },
  videoModalTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  videoModalArtist: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#C9933A",
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
  archiveToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  archiveToggleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    flex: 1,
  },
  archiveSection: { gap: 10 },
  archiveEmpty: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
  },
  archiveCard: {
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  archiveCardTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
    color: "#fff",
    lineHeight: 22,
  },
  archiveCardDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
  },
  sourceFooter: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 2,
  },
  sourceFooterText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
