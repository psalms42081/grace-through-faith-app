// Path B Brief 03 (extended scope) — Sabbath School quarter screen v2 (hidden route).
// Same teal treatment as sabbath-school, NO gradient (hero is the only gradient
// and it lives on the main SS screen). Old screen stays canonical until swap.
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
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { HV2, F } from "@/components/home-v2/theme";
import { getSabbathSchoolQuarterTheme } from "@/lib/sabbath-school-quarter-theme";
import { sabbathSchoolCoverUrl, sabbathSchoolLessonCoverUrl } from "@/lib/sabbath-school-artwork";
import { SabbathSchoolArtwork } from "@/components/sabbath-school/SabbathSchoolArtwork";
import { useSabbathSchoolTrack } from "@/hooks/useSabbathSchoolTrack";
import {
  buildSabbathSchoolTabRoute,
  SABBATH_SCHOOL_TAB_ROOT,
  useSabbathSchoolTabContainment,
} from "@/lib/sabbath-school-route-containment";
import { tabScrollBottomPad } from "@/lib/reader-floating-chrome";
import { readingScreenBottomPad } from "@/lib/reading-screen-inset";

const SSQ = {
  surface: "#FBF7EE",
  card: "#FFFFFF",
  ink: "#1F1A12",
  inkMuted: HV2.inkMutedText,
  teal: "#1F7A70",
  tealTint: "rgba(31,122,112,0.08)",
  border: "rgba(31,26,18,0.08)",
  violet: "#7C3AED",
};

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
  coverUrl?: string | null;
  quarterCode?: string;
  humanDate: string | null;
  colorPrimary: string | null;
}

export default function SabbathSchoolQuarterV2Screen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { quarterCode, title } = useLocalSearchParams<{ quarterCode: string; title: string }>();
  const isTabContained = useSabbathSchoolTabContainment(
    "sabbath-school-quarter",
    {
      quarterCode,
      title,
    },
    !!quarterCode,
  );
  const bottomPad = isTabContained
    ? tabScrollBottomPad(insets.bottom, Platform.OS)
    : readingScreenBottomPad(insets.bottom);

  const { selectedTrack } = useSabbathSchoolTrack();
  const { data, isLoading } = useQuery<{ quarterly: QuarterlyInfo; lessons: LessonInfo[] }>({
    queryKey: [`/api/sabbath-school/quarter/${quarterCode}?curriculum=${selectedTrack}`],
    enabled: !!quarterCode,
  });
  const quarterTheme = getSabbathSchoolQuarterTheme(data?.quarterly?.colorPrimary);

  if (!isTabContained) return null;

  return (
    <View style={s.container}>
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace(SABBATH_SCHOOL_TAB_ROOT as any))}
          style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={SSQ.ink} />
        </Pressable>
        <Text style={s.topTitle} numberOfLines={1}>
          {title || t("sabbathSchool.archive", { defaultValue: "Past Quarter" })}
        </Text>
        <View style={s.backBtn} />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={SSQ.teal} />
        </View>
      ) : !data?.quarterly ? (
        <View style={s.center}>
          <Ionicons name="book-outline" size={48} color={SSQ.inkMuted} />
          <Text style={s.centerText}>{t("sabbathSchool.noArchive", { defaultValue: "Quarter not found." })}</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Quarter header — flat teal card, no gradient */}
          <View style={[s.quarterCard, { backgroundColor: quarterTheme.primary }]}>
            <View style={s.quarterHead}>
              <SabbathSchoolArtwork
                uri={sabbathSchoolCoverUrl(data.quarterly.quarterCode || quarterCode, data.quarterly.coverUrl)}
                title={data.quarterly.title}
                color="rgba(255,255,255,0.28)"
                width={64}
                height={86}
                testID="ss-quarter-list-cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={s.quarterEyebrow}>SABBATH SCHOOL QUARTERLY</Text>
                <Text style={s.quarterTitle}>{data.quarterly.title}</Text>
                {data.quarterly.humanDate && <Text style={s.quarterDate}>{data.quarterly.humanDate}</Text>}
              </View>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {data.lessons.map((lesson) => (
              <Pressable
                key={lesson.id}
                onPress={() =>
                  router.push(
                    buildSabbathSchoolTabRoute("sabbath-school-day", {
                      lessonNumber: lesson.lessonNumber,
                      dayNumber: 1,
                      quarterCode,
                    }) as any,
                  )
                }
                style={({ pressed }) => [s.lessonCard, { opacity: pressed ? 0.7 : 1 }]}
              >
                <SabbathSchoolArtwork
                  uri={sabbathSchoolLessonCoverUrl(data.quarterly.quarterCode || quarterCode, lesson.lessonNumber)}
                  title={lesson.title}
                  color={quarterTheme.tint}
                  width={52}
                  height={70}
                  testID={`ss-lesson-cover-${lesson.lessonNumber}`}
                />
                <View style={{ flex: 1 }}>
                <View style={s.lessonCardTop}>
                  <Text style={[s.lessonNumber, { color: quarterTheme.primary }]}>
                    {t("sabbathSchool.lesson", { defaultValue: "Lesson" }).toUpperCase()} {lesson.lessonNumber}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={SSQ.inkMuted} />
                </View>
                <Text style={s.lessonTitle} numberOfLines={2}>{lesson.title}</Text>
                {lesson.startDate && lesson.endDate && (
                  <Text style={s.lessonDates}>{lesson.startDate} — {lesson.endDate}</Text>
                )}
                {lesson.companion && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/resource-detail?slug=${lesson.companion!.slug}` as any);
                    }}
                    style={({ pressed }) => [s.companionBadge, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons name="book" size={12} color={SSQ.violet} />
                    <Text style={s.companionBadgeText}>Companion</Text>
                    <Ionicons name="chevron-forward" size={12} color={SSQ.violet} />
                  </Pressable>
                )}
                </View>
              </Pressable>
            ))}
          </View>
          <Text style={s.attribution} testID="sabbath-school-quarter-attribution">
            {t("sabbathSchool.sourceAttribution", { defaultValue: "Lesson content courtesy of the Adventech Sabbath School project." })}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SSQ.surface },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, textAlign: "center", fontFamily: F.interSemi, fontSize: 16, color: SSQ.ink },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  centerText: { fontFamily: F.inter, fontSize: 14, color: SSQ.inkMuted, textAlign: "center" },
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  attribution: { fontFamily: F.inter, fontSize: 12, lineHeight: 18, color: SSQ.inkMuted },
  quarterCard: { borderRadius: 20, padding: 20, gap: 6, ...HV2.cardShadow },
  quarterHead: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  quarterEyebrow: { fontFamily: F.interBold, fontSize: 10.5, letterSpacing: 1.6, color: "rgba(255,255,255,0.9)" },
  quarterTitle: { fontFamily: F.loraBold, fontSize: 20, color: "#FFFFFF", lineHeight: 28 },
  quarterDate: { fontFamily: F.inter, fontSize: 12, color: "rgba(255,255,255,0.92)", marginTop: 2 },
  lessonCard: { flexDirection: "row", alignItems: "center", backgroundColor: SSQ.card, borderRadius: 14, padding: 14, gap: 12, ...HV2.rowShadow },
  lessonCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lessonNumber: { fontFamily: F.interBold, fontSize: 11, letterSpacing: 1 },
  lessonTitle: { fontFamily: F.interMed, fontSize: 14, lineHeight: 20, color: SSQ.ink },
  lessonDates: { fontFamily: F.inter, fontSize: 11, color: SSQ.inkMuted },
  companionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "rgba(124,58,237,0.08)",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  companionBadgeText: { fontFamily: F.interSemi, fontSize: 11, color: SSQ.violet },
});
