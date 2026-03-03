import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

interface Section {
  id: string;
  sectionType: string;
  title: string;
  content: string;
  sortOrder: number;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  lessonOrder: number;
  anchorText: string;
  estimatedMinutes: number;
  sections: Section[];
}

interface Module {
  id: string;
  title: string;
  description: string;
  learningObjective: string | null;
  moduleOrder: number;
  totalLessons: number;
  lessons: Lesson[];
}

interface Track {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  totalModules: number;
  totalWeeks: number;
  difficulty: string;
}

interface TrackDetail {
  track: Track;
  modules: Module[];
  completedLessonIds: string[];
}

interface ProgressTrack {
  id: string;
  userId: string;
  trackId: string;
  percentComplete: number;
  currentModuleId: string;
  currentLessonId: string;
  completedAt: string | null;
}

interface ProgressLesson {
  id: string;
  lessonId: string;
  completedAt: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  beliefs: "Adventist Beliefs",
  prophecy: "Prophecy",
  "new-believer": "New Believers",
  discipleship: "Discipleship",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#2E7D32",
  intermediate: "#E65100",
  advanced: "#C62828",
};

export default function TrackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: trackDetail, isLoading } = useQuery<TrackDetail>({
    queryKey: [`/api/tracks/${id}?userId=${userId}`],
  });

  const { data: progressData } = useQuery<ProgressTrack[]>({
    queryKey: [`/api/tracks/progress?userId=${userId}`],
  });

  const trackProgress = progressData?.find((p) => p.trackId === id);
  const isEnrolled = !!trackProgress;

  const enrollMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/tracks/enroll", { userId, trackId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/progress?userId=${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${id}?userId=${userId}`] });
    },
  });

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const completedLessons = new Set(trackDetail?.completedLessonIds || []);

  const isLessonUnlocked = (module: Module, lessonIndex: number): boolean => {
    if (!isEnrolled) return false;
    if (lessonIndex === 0) {
      const modules = trackDetail?.modules || [];
      const moduleIndex = modules.findIndex((m) => m.id === module.id);
      if (moduleIndex === 0) return true;
      const prevModule = modules[moduleIndex - 1];
      if (!prevModule) return true;
      const allPrevCompleted = prevModule.lessons.every((l) =>
        completedLessons.has(l.id)
      );
      return allPrevCompleted;
    }
    const prevLesson = module.lessons[lessonIndex - 1];
    return prevLesson ? completedLessons.has(prevLesson.id) : true;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!trackDetail) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>Track not found</Text>
      </View>
    );
  }

  const { track, modules } = trackDetail;
  const trackColor = track.color || theme.accent;
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text
            style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}
            numberOfLines={1}
          >
            {track.title}
          </Text>
          <View style={[styles.accentLine, { backgroundColor: trackColor }]} />
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {!isEnrolled && (
          <Pressable
            onPress={() => enrollMutation.mutate()}
            disabled={enrollMutation.isPending}
            style={({ pressed }) => [
              styles.enrollButton,
              { backgroundColor: trackColor, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {enrollMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={[styles.enrollButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                  Start This Path
                </Text>
              </>
            )}
          </Pressable>
        )}

        <View style={[styles.infoCard, { backgroundColor: theme.backgroundCard }]}>
          <Text style={[styles.description, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {track.description}
          </Text>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="layers-outline" size={18} color={theme.textMuted} />
              <Text style={[styles.infoLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {track.totalModules} modules
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="book-outline" size={18} color={theme.textMuted} />
              <Text style={[styles.infoLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {totalLessons} lessons
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={18} color={theme.textMuted} />
              <Text style={[styles.infoLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {track.totalWeeks} weeks
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.difficultyBadge, { backgroundColor: (DIFFICULTY_COLORS[track.difficulty] || theme.accent) + "18" }]}>
              <Text
                style={[
                  styles.difficultyText,
                  {
                    color: DIFFICULTY_COLORS[track.difficulty] || theme.accent,
                    fontFamily: "Inter_600SemiBold",
                  },
                ]}
              >
                {track.difficulty.charAt(0).toUpperCase() + track.difficulty.slice(1)}
              </Text>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: trackColor + "18" }]}>
              <Text style={[styles.categoryText, { color: trackColor, fontFamily: "Inter_600SemiBold" }]}>
                {CATEGORY_LABELS[track.category] || track.category}
              </Text>
            </View>
          </View>

          {isEnrolled && trackProgress && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  Progress
                </Text>
                <Text style={[styles.progressPercent, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
                  {trackProgress.percentComplete}%
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${trackProgress.percentComplete}%` as any, backgroundColor: theme.accent },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        <Text style={[styles.modulesTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Modules
        </Text>

        {modules.map((mod, modIndex) => {
          const isExpanded = expandedModules.has(mod.id);

          return (
            <View key={mod.id} style={[styles.moduleCard, { backgroundColor: theme.backgroundCard }]}>
              <Pressable
                onPress={() => toggleModule(mod.id)}
                style={styles.moduleHeader}
              >
                <View style={[styles.moduleNumber, { backgroundColor: trackColor + "18" }]}>
                  <Text style={[styles.moduleNumberText, { color: trackColor, fontFamily: "Inter_700Bold" }]}>
                    {modIndex + 1}
                  </Text>
                </View>
                <View style={styles.moduleInfo}>
                  <Text
                    style={[styles.moduleTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
                    numberOfLines={2}
                  >
                    {mod.title}
                  </Text>
                  <Text style={[styles.moduleLessonCount, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {mod.lessons.length} {mod.lessons.length === 1 ? "lesson" : "lessons"}
                  </Text>
                </View>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.textMuted}
                />
              </Pressable>

              {isExpanded && (
                <View style={[styles.lessonsList, { borderTopColor: theme.border }]}>
                  {mod.learningObjective ? (
                    <View style={[styles.objectiveBox, { backgroundColor: trackColor + "0A", borderColor: trackColor + "25" }]}>
                      <Text style={[styles.objectiveLabel, { color: trackColor, fontFamily: "Inter_600SemiBold" }]}>
                        After completing this module, you should be able to:
                      </Text>
                      <Text style={[styles.objectiveText, { color: theme.text, fontFamily: "Lora_400Regular_Italic" }]}>
                        {mod.learningObjective}
                      </Text>
                    </View>
                  ) : null}
                  {mod.lessons.map((lesson, lessonIndex) => {
                    const isCompleted = completedLessons.has(lesson.id);
                    const unlocked = isEnrolled ? isLessonUnlocked(mod, lessonIndex) || true : false;

                    return (
                      <Pressable
                        key={lesson.id}
                        onPress={() => {
                          if (unlocked) {
                            router.push(`/lesson/${lesson.id}` as any);
                          }
                        }}
                        disabled={!unlocked}
                        style={({ pressed }) => [
                          styles.lessonItem,
                          { opacity: unlocked ? (pressed ? 0.7 : 1) : 0.45 },
                          lessonIndex < mod.lessons.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: theme.border,
                          },
                        ]}
                      >
                        <View style={styles.lessonStatus}>
                          {isCompleted ? (
                            <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
                          ) : unlocked ? (
                            <Ionicons name="ellipse-outline" size={22} color={theme.textMuted} />
                          ) : (
                            <Ionicons name="lock-closed" size={18} color={theme.textMuted} />
                          )}
                        </View>
                        <View style={styles.lessonInfo}>
                          <Text
                            style={[
                              styles.lessonTitle,
                              { color: unlocked ? theme.text : theme.textMuted, fontFamily: "Inter_500Medium" },
                            ]}
                            numberOfLines={2}
                          >
                            {lesson.title}
                          </Text>
                          {lesson.anchorText && (
                            <Text
                              style={[styles.lessonAnchor, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}
                            >
                              {lesson.anchorText}
                            </Text>
                          )}
                        </View>
                        {lesson.estimatedMinutes > 0 && (
                          <Text style={[styles.lessonTime, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                            {lesson.estimatedMinutes}m
                          </Text>
                        )}
                        {unlocked && (
                          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 16, marginTop: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 14,
  },
  headerTitleWrap: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18 },
  accentLine: { height: 3, width: 40, borderRadius: 2, marginTop: 6 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20 },
  enrollButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 20,
  },
  enrollButtonText: { color: "#fff", fontSize: 16 },
  infoCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  description: { fontSize: 14, lineHeight: 22 },
  infoRow: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
    alignItems: "center",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoLabel: { fontSize: 13 },
  difficultyBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  difficultyText: { fontSize: 12 },
  categoryBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryText: { fontSize: 12 },
  progressSection: { gap: 8 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: { fontSize: 14 },
  progressPercent: { fontSize: 14 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  modulesTitle: { fontSize: 20, marginBottom: 14 },
  moduleCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  moduleNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleNumberText: { fontSize: 15 },
  moduleInfo: { flex: 1 },
  moduleTitle: { fontSize: 15, marginBottom: 2 },
  moduleLessonCount: { fontSize: 12 },
  lessonsList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  lessonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  lessonStatus: { width: 24, alignItems: "center" },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 14, marginBottom: 2 },
  lessonAnchor: { fontSize: 12 },
  lessonTime: { fontSize: 12 },
  objectiveBox: {
    marginHorizontal: 4,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  objectiveLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  objectiveText: {
    fontSize: 14,
    lineHeight: 21,
  },
});
