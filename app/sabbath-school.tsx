// Sabbath School — Path B light (Brief 03, swapped in as canonical in Phase B).
// Rollback: previous dark screen is in git history (pre-swap checkpoint).
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useSabbathSchoolTrack } from "@/hooks/useSabbathSchoolTrack";
import { useTranslation } from "react-i18next";
import SDAVerifiedBadge from "@/components/SDAVerifiedBadge";
import { HV2, F } from "@/components/home-v2/theme";
import { MemoryVerseCard } from "@/components/sabbath-school/MemoryVerseCard";
import LessonVideoPlayer from "@/components/sabbath-school/LessonVideoPlayer";
import { extractMemoryText } from "@/lib/sabbath-school-memory-text";
import { flattenSabbathSchoolLessonClips } from "@/lib/sabbath-school-video-clips";
import { withDeviceTimeZone } from "@/lib/device-time-zone";
import { getHomeLocalDay } from "@/components/home-v2/home-data";
import { getSabbathSchoolQuarterTheme } from "@/lib/sabbath-school-quarter-theme";
import {
  resolveSabbathSchoolContinueDay,
  sabbathSchoolContinueProgressCount,
  useSabbathSchoolLastRead,
} from "@/lib/sabbath-school-continue";
import {
  buildSabbathSchoolTabRoute,
  sabbathSchoolTabBarClearance,
  useSabbathSchoolTabContainment,
} from "@/lib/sabbath-school-route-containment";

// ---- Screen tokens (SS owns teal; coral = today-dot only; no gold) ----
const SS2 = {
  surface: "#FBF7EE",
  card: "#FFFFFF",
  ink: "#1F1A12",
  inkMuted: HV2.inkMutedText, // #6B6660 — ≥4.5:1 on cream/white
  teal: "#1F7A70",
  tealTint: "rgba(31,122,112,0.08)",
  tealBorder: "rgba(31,122,112,0.25)",
  coral: "#E8604C", // today-dot ONLY
  sage: "#557C55", // done check (icon, ≥3:1 on white)
  pending: "#C9C4B8",
  border: "rgba(31,26,18,0.08)",
  violet: "#7C3AED",
};

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sabbath"];
const DAY_FALLBACK = ["Sabbath", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function weekdayFromDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const m = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
  if (isNaN(d.getTime())) return null;
  return WEEKDAY_LABELS[d.getUTCDay()];
}

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
  videoByArtist?: Array<{ artist: string; clips: Array<{ src: string; title: string; thumbnail: string; target: string }> }> | null;
}
interface QuarterlyData {
  id: string;
  title: string;
  humanDate: string | null;
  colorPrimary: string | null;
  quarterCode?: string;
}
interface CompanionData { id: string; slug: string; title: string; description: string | null }

const EMPTY_LESSON_DAYS: DayData[] = [];

function getLessonDays(lesson: LessonData | null | undefined): DayData[] {
  return lesson?.days ?? EMPTY_LESSON_DAYS;
}

export default function SabbathSchoolV2Screen() {
  "use no memo";

  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { t } = useTranslation();
  const [showArchive, setShowArchive] = useState(false);
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const isTabContained =
    useSabbathSchoolTabContainment("sabbath-school");
  const { lastRead } = useSabbathSchoolLastRead(userId);
  const localDateKey = useMemo(() => getHomeLocalDay(clock).dateKey, [clock]);
  const { selectedTrack, availableTracks, chipLabel, setTrack } =
    useSabbathSchoolTrack();

  React.useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const { data, isLoading } = useQuery<{
    quarterly: QuarterlyData | null;
    currentLesson: LessonData | null;
    currentLessonNumber: number;
    totalLessons: number;
    completedDays: number;
    todayDayNumber: number | null;
    companion: CompanionData | null;
  }>({
    queryKey: [
      "sabbath-school-current",
      userId,
      selectedTrack,
      localDateKey,
    ],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        withDeviceTimeZone(
          `/api/sabbath-school/current?userId=${userId}&curriculum=${selectedTrack}`,
        ),
      );
      return response.json();
    },
  });

  const { data: archiveData } = useQuery<{ quarters: QuarterlyData[] }>({
    queryKey: ["/api/sabbath-school/quarters", selectedTrack],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/sabbath-school/quarters?curriculum=${selectedTrack}`,
      );
      return response.json();
    },
    enabled: showArchive,
  });

  const quarterly = data?.quarterly;
  const quarterTheme = getSabbathSchoolQuarterTheme(quarterly?.colorPrimary);
  const lesson = data?.currentLesson;
  const days = getLessonDays(lesson);
  const todayDayNumber = data?.todayDayNumber ?? null;
  const companion = data?.companion || null;
  const totalLessons = data?.totalLessons || 13;

  const memoryText = useMemo(
    () => extractMemoryText(days.find((d) => d.dayNumber === 1)?.contentMarkdown).memoryText,
    [days]
  );

  const currentDay = useMemo(
    () =>
      resolveSabbathSchoolContinueDay({
        days,
        todayDayNumber,
        lastRead,
        currentLessonNumber: lesson?.lessonNumber ?? data?.currentLessonNumber,
        currentQuarterCode: quarterly?.quarterCode,
      }),
    [
      days,
      todayDayNumber,
      lastRead,
      lesson?.lessonNumber,
      data?.currentLessonNumber,
      quarterly?.quarterCode,
    ],
  );
  const progressDays = sabbathSchoolContinueProgressCount(
    currentDay,
    days.length || 7,
  );

  const lessonVideoClips = flattenSabbathSchoolLessonClips(lesson?.videoByArtist);

  const pastQuarters = (archiveData?.quarters || []).filter((q) => quarterly && q.id !== quarterly.id);

  const bottomPad =
    (Platform.OS === "web" ? 34 : insets.bottom) +
    sabbathSchoolTabBarClearance(isTabContained, Platform.OS);
  const openDay = (d: DayData) => {
    router.push(
      buildSabbathSchoolTabRoute("sabbath-school-day", {
        lessonNumber: lesson!.lessonNumber,
        dayNumber: d.dayNumber,
        quarterCode: quarterly?.quarterCode,
      }) as any,
    );
  };

  if (!isTabContained) return null;

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/home-v2" as any))}
          style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={SS2.ink} />
        </Pressable>
        <Text style={s.topTitle}>{t("sabbathSchool.title", { defaultValue: "Sabbath School" })}</Text>
        <Pressable
          onPress={() => setShowTrackPicker(true)}
          style={({ pressed }) => [s.trackChip, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`Sabbath School track, ${chipLabel}`}
          testID="ss-track-chip"
        >
          <Text style={s.trackChipText} numberOfLines={1}>
            {chipLabel} ▾
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={SS2.teal} />
          <Text style={s.centerText}>{t("sabbathSchool.loading", { defaultValue: "Loading…" })}</Text>
        </View>
      ) : !quarterly || !lesson ? (
        <View style={s.center}>
          <Ionicons name="book-outline" size={48} color={SS2.inkMuted} />
          <Text style={s.centerText}>{t("sabbathSchool.syncing", { defaultValue: "Lesson content is syncing. Check back shortly." })}</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.scrollContent, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Lesson hero — the screen's ONE gradient */}
          <View style={s.heroWrap}>
            <LinearGradient
              colors={[...quarterTheme.gradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={s.heroInner}
            >
              <Text style={s.heroEyebrow} numberOfLines={1}>
                {quarterly.title.toUpperCase()} · {chipLabel.toUpperCase()} QUARTERLY
              </Text>
              <View style={s.heroBadge}>
                <Text style={s.heroBadgeText}>
                  Lesson {data?.currentLessonNumber || lesson.lessonNumber} of {totalLessons}
                </Text>
              </View>
              <Text style={s.heroTitle} numberOfLines={3}>{lesson.title}</Text>
              <Text style={s.heroMeta} numberOfLines={2}>
                {lesson.startDate && lesson.endDate ? `${lesson.startDate} — ${lesson.endDate}` : quarterly.humanDate}
                {memoryText?.reference ? `  ·  Memory verse: ${memoryText.reference.replace(/,\s*(NKJV|KJV|ESV|NIV|NASB)\s*$/i, "")}` : ""}
              </Text>
              <View style={s.heroTrack}>
                <View style={[s.heroFill, { width: `${Math.round((progressDays / Math.max(days.length, 1)) * 100)}%` }]} />
              </View>
              <Text style={s.heroProgressText}>{progressDays} of {days.length || 7} days</Text>
              {currentDay && (
                <Pressable
                  onPress={() => openDay(currentDay)}
                  style={({ pressed }) => [s.heroCta, { opacity: pressed ? 0.85 : 1 }]}
                  accessibilityRole="button"
                  testID="ss2-hero-cta"
                >
                  <Text style={[s.heroCtaText, { color: quarterTheme.primary }]} numberOfLines={1}>
                    Continue — {weekdayFromDate(currentDay.date) || DAY_FALLBACK[currentDay.dayNumber - 1] || `Day ${currentDay.dayNumber}`}
                    {currentDay.title ? `: ${currentDay.title}` : ""}
                  </Text>
                </Pressable>
              )}
            </LinearGradient>
          </View>

          {/* 2. Watch This Lesson */}
          {lessonVideoClips.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Watch This Lesson</Text>
              <LessonVideoPlayer clips={lessonVideoClips} />
            </View>
          )}

          {/* 3. Memory Verse — THE dark surface (locked canon) */}
          {memoryText && <MemoryVerseCard memoryText={memoryText} testID="ss2-memory-verse" />}

          {/* 4. This Week */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>This Week</Text>
            <View style={s.weekCard}>
              {days.map((day, index) => {
                const isToday = todayDayNumber === day.dayNumber;
                const label = weekdayFromDate(day.date) || DAY_FALLBACK[index] || `Day ${day.dayNumber}`;
                return (
                  <Pressable
                    key={day.id}
                    onPress={() => openDay(day)}
                    style={({ pressed }) => [
                      s.dayRow,
                      isToday && { backgroundColor: quarterTheme.tint },
                      index < days.length - 1 && s.dayRowDivider,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                    testID={`ss2-day-${day.dayNumber}`}
                  >
                    <View style={s.dayStatus}>
                      {day.completed ? (
                        <Ionicons name="checkmark-circle" size={20} color={SS2.sage} />
                      ) : isToday ? (
                        <View style={s.todayDot} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={18} color={SS2.pending} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.dayLabel, isToday && { color: quarterTheme.primary }]}>{label}{isToday ? "  ·  Today" : ""}</Text>
                      <Text style={s.dayTitle} numberOfLines={2}>{day.title || `Day ${day.dayNumber}`}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={SS2.inkMuted} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Companion + discussion (kept — do-not-regress) */}
          {companion && (
            <Pressable
              onPress={() => router.push(`/resource-detail?slug=${companion.slug}` as any)}
              style={({ pressed }) => [s.companionCard, { opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={s.companionIcon}>
                <Ionicons name="book" size={18} color={SS2.violet} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.companionLabel}>LESSON COMPANION</Text>
                <Text style={s.companionTitle} numberOfLines={2}>{companion.title.replace(/^Companion:\s*/i, "")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={SS2.inkMuted} />
            </Pressable>
          )}

          <Pressable
            onPress={() =>
              router.push(
                buildSabbathSchoolTabRoute("sabbath-school-discussion", {
                  lessonId: lesson.id,
                  lessonTitle: lesson.title,
                }) as any,
              )
            }
            style={({ pressed }) => [
              s.discussionBtn,
              { backgroundColor: quarterTheme.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={s.discussionTitle}>Lesson Discussion Guide</Text>
              <Text style={s.discussionSub}>Discussion questions, key themes, and talk prompts</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
          </Pressable>

          {/* Archive → quarter screens */}
          <Pressable
            onPress={() => setShowArchive(!showArchive)}
            style={({ pressed }) => [
              s.archiveToggle,
              { borderColor: quarterTheme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="library-outline" size={18} color={quarterTheme.primary} />
            <Text style={s.archiveToggleText}>{t("sabbathSchool.viewArchive", { defaultValue: "Past Quarters" })}</Text>
            <Ionicons name={showArchive ? "chevron-up" : "chevron-down"} size={16} color={SS2.inkMuted} />
          </Pressable>

          {showArchive && (
            <View style={{ gap: 10 }}>
              {pastQuarters.length === 0 ? (
                <Text style={s.archiveEmpty}>{t("sabbathSchool.noArchive", { defaultValue: "No past quarters yet." })}</Text>
              ) : (
                pastQuarters.map((q) => (
                  <Pressable
                    key={q.id}
                    onPress={() =>
                      router.push(
                        buildSabbathSchoolTabRoute("sabbath-school-quarter", {
                          quarterCode: (q as any).quarterCode,
                          title: q.title,
                        }) as any,
                      )
                    }
                    style={({ pressed }) => [
                      s.archiveCard,
                      {
                        borderLeftColor: getSabbathSchoolQuarterTheme(q.colorPrimary).primary,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={s.archiveCardTitle}>{q.title}</Text>
                    {q.humanDate && <Text style={s.archiveCardDate}>{q.humanDate}</Text>}
                  </Pressable>
                ))
              )}
            </View>
          )}

          <View style={s.sourceFooter}>
            <Ionicons name="library-outline" size={12} color={SS2.inkMuted} />
            <Text style={s.sourceFooterText}>
              {t("sabbathSchool.sourceAttribution", { defaultValue: "Lesson content courtesy of the Adventech Sabbath School project." })}
            </Text>
          </View>
          <SDAVerifiedBadge />
        </ScrollView>
      )}

      <Modal
        visible={showTrackPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTrackPicker(false)}
      >
        <Pressable
          style={s.trackOverlay}
          onPress={() => setShowTrackPicker(false)}
          testID="ss-track-picker"
        >
          <Pressable style={s.trackSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={s.trackSheetTitle}>Lesson track</Text>
            {availableTracks.length === 0 ? (
              <Text style={[s.trackOptionLabel, { paddingHorizontal: 12, paddingVertical: 8 }]}>
                Loading tracks…
              </Text>
            ) : (
              availableTracks.map((track) => {
              const selected = track.id === selectedTrack;
              return (
                <Pressable
                  key={track.id}
                  onPress={() => {
                    setShowTrackPicker(false);
                    void setTrack(track.id);
                  }}
                  style={({ pressed }) => [
                    s.trackOption,
                    selected && s.trackOptionSelected,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                  testID={`ss-track-option-${track.id}`}
                >
                  <Text
                    style={[s.trackOptionLabel, selected && s.trackOptionLabelSelected]}
                    numberOfLines={2}
                  >
                    {track.pickerLabel}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={18} color={SS2.teal} />
                  ) : null}
                </Pressable>
              );
            })
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SS2.surface },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, textAlign: "center", fontFamily: F.interSemi, fontSize: 16, color: SS2.ink },
  trackChip: {
    minHeight: 32,
    maxWidth: 132,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: SS2.tealTint,
    borderWidth: 1,
    borderColor: SS2.tealBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  trackChipText: { fontFamily: F.interSemi, fontSize: 12, color: SS2.teal },
  trackOverlay: {
    flex: 1,
    backgroundColor: "rgba(31,26,18,0.45)",
    justifyContent: "flex-start",
    paddingTop: 88,
    paddingHorizontal: 20,
    alignItems: "flex-end",
  },
  trackSheet: {
    width: 260,
    backgroundColor: SS2.card,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    ...HV2.cardShadow,
  },
  trackSheetTitle: {
    fontFamily: F.interSemi,
    fontSize: 11,
    letterSpacing: 0.8,
    color: SS2.inkMuted,
    textTransform: "uppercase",
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 4,
  },
  trackOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  trackOptionSelected: { backgroundColor: SS2.tealTint },
  trackOptionLabel: { flex: 1, fontFamily: F.interMed, fontSize: 14, color: SS2.ink, lineHeight: 19 },
  trackOptionLabelSelected: { fontFamily: F.interSemi, color: SS2.teal },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  centerText: { fontFamily: F.inter, fontSize: 14, color: SS2.inkMuted, textAlign: "center", lineHeight: 22 },
  scrollContent: { paddingHorizontal: 20, gap: 16 },

  heroWrap: { borderRadius: 24, overflow: "hidden", ...HV2.cardShadow },
  heroInner: { padding: 22 },
  heroEyebrow: { fontFamily: F.interBold, fontSize: 11, letterSpacing: 1.6, color: "#FFFFFF", marginBottom: 10 },
  heroBadge: { alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.22)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeText: { fontFamily: F.interSemi, fontSize: 11, color: "#FFFFFF" },
  heroTitle: { fontFamily: F.loraSemi, fontSize: 23, lineHeight: 30, color: "#FFFFFF", marginTop: 10 },
  heroMeta: { fontFamily: F.interMed, fontSize: 12.5, color: "#FFFFFF", marginTop: 6, lineHeight: 18 },
  heroTrack: { marginTop: 14, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  heroFill: { height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  heroProgressText: { fontFamily: F.interSemi, fontSize: 11.5, color: "#FFFFFF", marginTop: 6 },
  heroCta: { marginTop: 14, alignSelf: "flex-start", backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11, maxWidth: "100%" },
  heroCtaText: { fontFamily: F.interSemi, fontSize: 13.5 },

  section: { gap: 10 },
  sectionTitle: { fontFamily: F.loraSemi, fontSize: 17, color: SS2.ink },

  weekCard: { backgroundColor: SS2.card, borderRadius: 16, overflow: "hidden", ...HV2.rowShadow },
  dayRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  dayRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: SS2.border },
  dayStatus: { width: 22, alignItems: "center" },
  todayDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: SS2.coral },
  dayLabel: { fontFamily: F.interSemi, fontSize: 11.5, letterSpacing: 0.4, color: SS2.inkMuted, textTransform: "uppercase" },
  dayTitle: { fontFamily: F.interMed, fontSize: 14, lineHeight: 19, color: SS2.ink, marginTop: 2 },

  companionCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SS2.card, borderRadius: 14, padding: 16, ...HV2.rowShadow },
  companionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(124,58,237,0.10)", alignItems: "center", justifyContent: "center" },
  companionLabel: { fontFamily: F.interSemi, fontSize: 10, letterSpacing: 1, color: SS2.violet },
  companionTitle: { fontFamily: F.loraSemi, fontSize: 15, lineHeight: 21, color: SS2.ink, marginTop: 2 },

  discussionBtn: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 15 },
  discussionTitle: { fontFamily: F.interSemi, fontSize: 15, color: "#FFFFFF" },
  discussionSub: { fontFamily: F.inter, fontSize: 12, color: "#FFFFFF", marginTop: 1 },

  archiveToggle: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, backgroundColor: SS2.card, paddingHorizontal: 16, paddingVertical: 14 },
  archiveToggleText: { fontFamily: F.interSemi, fontSize: 14, color: SS2.ink, flex: 1 },
  archiveEmpty: { fontFamily: F.inter, fontSize: 13, color: SS2.inkMuted, textAlign: "center", paddingVertical: 12 },
  archiveCard: { backgroundColor: SS2.card, borderRadius: 14, padding: 16, gap: 4, borderLeftWidth: 3, ...HV2.rowShadow },
  archiveCardTitle: { fontFamily: F.loraSemi, fontSize: 16, color: SS2.ink, lineHeight: 22 },
  archiveCardDate: { fontFamily: F.inter, fontSize: 11, color: SS2.inkMuted },

  sourceFooter: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 12, paddingHorizontal: 2 },
  sourceFooterText: { fontFamily: F.inter, fontSize: 11, lineHeight: 16, color: SS2.inkMuted, flex: 1 },
});
