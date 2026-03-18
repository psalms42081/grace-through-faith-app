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
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/components/ScreenHeader";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "react-i18next";

interface LessonInfo {
  id: string;
  lessonNumber: number;
  title: string;
  startDate: string | null;
  endDate: string | null;
  companion: { slug: string; title: string } | null;
}

interface QuarterlyInfo {
  id: string;
  title: string;
  humanDate: string | null;
  colorPrimary: string | null;
}

export default function SabbathSchoolQuarterScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { quarterCode, title } = useLocalSearchParams<{ quarterCode: string; title: string }>();

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data, isLoading } = useQuery<{ quarterly: QuarterlyInfo; lessons: LessonInfo[] }>({
    queryKey: [`/api/sabbath-school/quarter/${quarterCode}`],
    enabled: !!quarterCode,
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title={title || t("sabbathSchool.archive")} />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : !data?.quarterly ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            {t("sabbathSchool.noArchive")}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.quarterlyCard, { backgroundColor: data.quarterly.colorPrimary || "#2E4161" }]}>
            <Text style={styles.quarterlyTitle}>{data.quarterly.title}</Text>
            {data.quarterly.humanDate && (
              <Text style={styles.quarterlyDate}>{data.quarterly.humanDate}</Text>
            )}
          </View>

          <View style={styles.lessonsGrid}>
            {data.lessons.map((lesson) => (
              <Pressable
                key={lesson.id}
                onPress={() =>
                  router.push(
                    `/sabbath-school-day?lessonNumber=${lesson.lessonNumber}&dayNumber=1&quarterCode=${quarterCode}` as any
                  )
                }
                style={({ pressed }) => [
                  styles.lessonCard,
                  {
                    backgroundColor: theme.backgroundCard,
                    borderColor: theme.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View style={styles.lessonCardTop}>
                  <Text style={[styles.lessonNumber, { color: theme.accent }]}>
                    {t("sabbathSchool.lesson")} {lesson.lessonNumber}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                </View>
                <Text style={[styles.lessonTitle, { color: theme.text }]} numberOfLines={2}>
                  {lesson.title}
                </Text>
                {lesson.startDate && lesson.endDate && (
                  <Text style={[styles.lessonDates, { color: theme.textMuted }]}>
                    {lesson.startDate} — {lesson.endDate}
                  </Text>
                )}
                {lesson.companion && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/resource-detail?slug=${lesson.companion!.slug}` as any);
                    }}
                    style={({ pressed }) => [
                      styles.companionBadge,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Ionicons name="book" size={12} color="#8B5CF6" />
                    <Text style={styles.companionBadgeText}>Companion</Text>
                    <Ionicons name="chevron-forward" size={12} color="#8B5CF6" />
                  </Pressable>
                )}
              </Pressable>
            ))}
          </View>
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
  },
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
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  quarterlyCard: {
    borderRadius: 16,
    padding: 20,
    gap: 6,
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
  lessonsGrid: { gap: 10 },
  lessonCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  lessonCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lessonNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
  lessonTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  lessonDates: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  companionBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    borderRadius: 8,
    alignSelf: "flex-start" as const,
  },
  companionBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#8B5CF6",
  },
});
