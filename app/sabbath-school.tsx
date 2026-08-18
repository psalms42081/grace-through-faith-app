// Sabbath School — Path B light (Brief 03, swapped in as canonical in Phase B).
// Rollback: previous dark screen is in git history (pre-swap checkpoint).
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
  Linking,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import SDAVerifiedBadge from "@/components/SDAVerifiedBadge";
import { useEllenWhite } from "@/contexts/PioneerContext";
import { FEATURE_GUIDES } from "@/constants/ellenWhiteSteps";
import { HV2, F } from "@/components/home-v2/theme";

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
  dark: "#050507", // THE memory-verse surface (locked canon)
  cream: "#F0EBE0",
  creamMuted: "rgba(240,235,224,0.72)",
  tealSoft: "#7FC8BE", // MEMORY VERSE label on #050507 (≈9:1)
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

// Memory verse lives in day 1's contentMarkdown as:
// <blockquote><p>Memory Text:</p> “…verse…” (<a …>Reference, NKJV</a>).</blockquote>
function parseMemoryVerse(html: string | null | undefined): { verse: string; reference: string | null } | null {
  if (!html) return null;
  const blocks = [...html.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi)].map((m) => m[1]);
  const block = blocks.find((b) => /memory text/i.test(b));
  if (!block) return null;
  const stripped = block
    .replace(/<p>\s*Memory Text:\s*<\/p>/i, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const refMatch = stripped.match(/\(([^()]+)\)\s*\.?\s*$/);
  const verse = (refMatch ? stripped.slice(0, refMatch.index) : stripped).trim();
  const reference = refMatch ? refMatch[1].trim() : null;
  return verse ? { verse, reference } : null;
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

export default function SabbathSchoolV2Screen() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { t } = useTranslation();
  const { tryAutoGuide } = useEllenWhite();
  const [showArchive, setShowArchive] = useState(false);

  React.useEffect(() => {
    // Same first-visit guide as the canonical screen (spotlights are fixed
    // positions, so they land on the hero/discussion areas here too).
    const timer = setTimeout(() => {
      if (FEATURE_GUIDES["sabbath-school"]) {
        tryAutoGuide("sabbath-school", FEATURE_GUIDES["sabbath-school"]);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);
  const [activeVideo, setActiveVideo] = useState<{ src: string; title: string; artist: string } | null>(null);
  const videoRef = React.useRef<Video | null>(null);
  const canInlinePlay = useCallback((src: string) => /\.(mp4|m3u8)(\?|$)/i.test(src), []);

  const closeVideoModal = async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.stopAsync();
        await videoRef.current.unloadAsync();
      }
    } catch {}
    setActiveVideo(null);
  };

  const { data: userPrefs } = useQuery<{ preferredCurriculum?: string | null }>({
    queryKey: ["/api/user/preferences"],
  });
  const selectedCurriculum = userPrefs?.preferredCurriculum === "inverse" ? "inverse" : "adult";

  const { data, isLoading } = useQuery<{
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
  const todayDayNumber = data?.todayDayNumber ?? null;
  const companion = data?.companion || null;
  const totalLessons = data?.totalLessons || 13;

  const memoryVerse = useMemo(
    () => parseMemoryVerse(days.find((d) => d.dayNumber === 1)?.contentMarkdown),
    [days]
  );

  const currentDay = useMemo(() => {
    if (!days.length) return null;
    if (todayDayNumber != null) {
      const today = days.find((d) => d.dayNumber === todayDayNumber);
      if (today) return today;
    }
    return days.find((d) => !d.completed) ?? days[days.length - 1];
  }, [days, todayDayNumber]);

  const lessonVideoClips = (lesson?.videoByArtist ?? [])
    .flatMap((group) => (group?.clips ?? []).map((clip) => ({ ...clip, artist: group.artist })))
    .filter((clip) => !!clip.src)
    .slice(0, 5);

  const pastQuarters = (archiveData?.quarters || []).filter((q) => quarterly && q.id !== quarterly.id);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const openDay = (d: DayData) => {
    const qc = quarterly?.quarterCode ? `&quarterCode=${quarterly.quarterCode}` : "";
    router.push(`/sabbath-school-day?lessonNumber=${lesson!.lessonNumber}&dayNumber=${d.dayNumber}${qc}` as any);
  };

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
        <View style={s.backBtn} />
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
              colors={[...HV2.ssGradientSafe]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={s.heroInner}
            >
              <Text style={s.heroEyebrow} numberOfLines={1}>
                {quarterly.title.toUpperCase()} · {selectedCurriculum === "inverse" ? "INVERSE" : "ADULT"} QUARTERLY
              </Text>
              <View style={s.heroBadge}>
                <Text style={s.heroBadgeText}>
                  Lesson {data?.currentLessonNumber || lesson.lessonNumber} of {totalLessons}
                </Text>
              </View>
              <Text style={s.heroTitle} numberOfLines={3}>{lesson.title}</Text>
              <Text style={s.heroMeta} numberOfLines={2}>
                {lesson.startDate && lesson.endDate ? `${lesson.startDate} — ${lesson.endDate}` : quarterly.humanDate}
                {memoryVerse?.reference ? `  ·  Memory verse: ${memoryVerse.reference.replace(/,\s*(NKJV|KJV|ESV|NIV|NASB)\s*$/i, "")}` : ""}
              </Text>
              <View style={s.heroTrack}>
                <View style={[s.heroFill, { width: `${Math.round((completedCount / Math.max(days.length, 1)) * 100)}%` }]} />
              </View>
              <Text style={s.heroProgressText}>{completedCount} of {days.length || 7} days</Text>
              {currentDay && (
                <Pressable
                  onPress={() => openDay(currentDay)}
                  style={({ pressed }) => [s.heroCta, { opacity: pressed ? 0.85 : 1 }]}
                  accessibilityRole="button"
                  testID="ss2-hero-cta"
                >
                  <Text style={s.heroCtaText} numberOfLines={1}>
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
              <View style={[s.videoLayerStack, activeVideo ? { minHeight: 300 } : null]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.videoRow}>
                  {lessonVideoClips.map((clip, index) => {
                    const isActive = activeVideo?.src === clip.src;
                    return (
                      <Pressable
                        key={`${clip.src}-${index}`}
                        onPress={() => {
                          if (!canInlinePlay(clip.src)) {
                            Linking.openURL(clip.src).catch(() => {});
                            return;
                          }
                          if (isActive) { closeVideoModal(); return; }
                          setActiveVideo({ src: clip.src, title: clip.title || "Lesson Clip", artist: clip.artist });
                        }}
                        style={({ pressed }) => [s.videoCard, { opacity: pressed ? 0.85 : 1 }]}
                      >
                        {clip.thumbnail ? (
                          <Image source={{ uri: clip.thumbnail }} style={s.videoThumb} resizeMode="cover" />
                        ) : (
                          <View style={[s.videoThumb, { backgroundColor: SS2.tealTint }]} />
                        )}
                        <View style={s.videoCardMeta}>
                          <Text style={s.videoTitle} numberOfLines={2}>{clip.title || "Lesson Clip"}</Text>
                          <Text style={s.videoArtist} numberOfLines={1}>{clip.artist}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {activeVideo && (
                  <View style={s.inlinePlayerCard}>
                    <Video
                      ref={videoRef}
                      key={activeVideo.src}
                      source={{ uri: activeVideo.src }}
                      style={s.inlineVideo}
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay
                      useNativeControls
                    />
                    <View style={s.inlinePlayerMeta}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.videoModalTitle} numberOfLines={2}>{activeVideo.title}</Text>
                        <Text style={s.videoModalArtist} numberOfLines={1}>{activeVideo.artist}</Text>
                      </View>
                      <Pressable onPress={closeVideoModal} style={({ pressed }) => ({ padding: 2, opacity: pressed ? 0.7 : 1 })}>
                        <Ionicons name="close-circle" size={24} color={SS2.inkMuted} />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* 3. Memory Verse — THE dark surface (locked canon) */}
          {memoryVerse && (
            <View style={s.memoryCard} testID="ss2-memory-verse">
              <Text style={s.memoryLabel}>MEMORY VERSE</Text>
              <Text style={s.memoryText}>{memoryVerse.verse}</Text>
              {memoryVerse.reference && <Text style={s.memoryRef}>{memoryVerse.reference}</Text>}
            </View>
          )}

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
                      isToday && s.dayRowToday,
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
                      <Text style={[s.dayLabel, isToday && { color: SS2.teal }]}>{label}{isToday ? "  ·  Today" : ""}</Text>
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
              router.push(`/sabbath-school-discussion?lessonId=${lesson.id}&lessonTitle=${encodeURIComponent(lesson.title)}` as any)
            }
            style={({ pressed }) => [s.discussionBtn, { opacity: pressed ? 0.85 : 1 }]}
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
            style={({ pressed }) => [s.archiveToggle, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="library-outline" size={18} color={SS2.teal} />
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
                        `/sabbath-school-quarter?quarterCode=${(q as any).quarterCode}&title=${encodeURIComponent(q.title)}` as any
                      )
                    }
                    style={({ pressed }) => [s.archiveCard, { opacity: pressed ? 0.85 : 1 }]}
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
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SS2.surface },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, textAlign: "center", fontFamily: F.interSemi, fontSize: 16, color: SS2.ink },
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
  heroCtaText: { fontFamily: F.interSemi, fontSize: 13.5, color: SS2.teal },

  section: { gap: 10 },
  sectionTitle: { fontFamily: F.loraSemi, fontSize: 17, color: SS2.ink },

  videoLayerStack: { position: "relative" },
  videoRow: { gap: 10, paddingRight: 8 },
  videoCard: { width: 200, backgroundColor: SS2.card, borderRadius: 12, overflow: "hidden", ...HV2.rowShadow },
  videoThumb: { width: 200, aspectRatio: 16 / 9 },
  videoCardMeta: { paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  videoTitle: { fontFamily: F.interMed, fontSize: 12, color: SS2.ink, lineHeight: 17 },
  videoArtist: { fontFamily: F.inter, fontSize: 11, color: SS2.inkMuted },
  inlinePlayerCard: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, borderRadius: 12, borderWidth: 1, borderColor: SS2.border, overflow: "hidden", backgroundColor: SS2.card },
  inlineVideo: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  inlinePlayerMeta: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  videoModalTitle: { fontFamily: F.loraSemi, fontSize: 15, color: SS2.ink, lineHeight: 21 },
  videoModalArtist: { fontFamily: F.interMed, fontSize: 12, color: SS2.inkMuted },

  memoryCard: { backgroundColor: SS2.dark, borderRadius: 20, padding: 22, gap: 10 },
  memoryLabel: { fontFamily: F.interBold, fontSize: 11, letterSpacing: 1.8, color: SS2.tealSoft },
  memoryText: { fontFamily: "Lora_400Regular_Italic", fontStyle: "italic", fontSize: 17, lineHeight: 27, color: SS2.cream },
  memoryRef: { fontFamily: F.interMed, fontSize: 12.5, color: SS2.creamMuted },

  weekCard: { backgroundColor: SS2.card, borderRadius: 16, overflow: "hidden", ...HV2.rowShadow },
  dayRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  dayRowToday: { backgroundColor: SS2.tealTint },
  dayRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: SS2.border },
  dayStatus: { width: 22, alignItems: "center" },
  todayDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: SS2.coral },
  dayLabel: { fontFamily: F.interSemi, fontSize: 11.5, letterSpacing: 0.4, color: SS2.inkMuted, textTransform: "uppercase" },
  dayTitle: { fontFamily: F.interMed, fontSize: 14, lineHeight: 19, color: SS2.ink, marginTop: 2 },

  companionCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SS2.card, borderRadius: 14, padding: 16, ...HV2.rowShadow },
  companionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(124,58,237,0.10)", alignItems: "center", justifyContent: "center" },
  companionLabel: { fontFamily: F.interSemi, fontSize: 10, letterSpacing: 1, color: SS2.violet },
  companionTitle: { fontFamily: F.loraSemi, fontSize: 15, lineHeight: 21, color: SS2.ink, marginTop: 2 },

  discussionBtn: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 15, backgroundColor: SS2.teal },
  discussionTitle: { fontFamily: F.interSemi, fontSize: 15, color: "#FFFFFF" },
  discussionSub: { fontFamily: F.inter, fontSize: 12, color: "#FFFFFF", marginTop: 1 },

  archiveToggle: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, borderColor: SS2.tealBorder, backgroundColor: SS2.card, paddingHorizontal: 16, paddingVertical: 14 },
  archiveToggleText: { fontFamily: F.interSemi, fontSize: 14, color: SS2.ink, flex: 1 },
  archiveEmpty: { fontFamily: F.inter, fontSize: 13, color: SS2.inkMuted, textAlign: "center", paddingVertical: 12 },
  archiveCard: { backgroundColor: SS2.card, borderRadius: 14, padding: 16, gap: 4, borderLeftWidth: 3, borderLeftColor: SS2.teal, ...HV2.rowShadow },
  archiveCardTitle: { fontFamily: F.loraSemi, fontSize: 16, color: SS2.ink, lineHeight: 22 },
  archiveCardDate: { fontFamily: F.inter, fontSize: 11, color: SS2.inkMuted },

  sourceFooter: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 12, paddingHorizontal: 2 },
  sourceFooterText: { fontFamily: F.inter, fontSize: 11, lineHeight: 16, color: SS2.inkMuted, flex: 1 },
});
