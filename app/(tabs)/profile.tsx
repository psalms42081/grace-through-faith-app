import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Svg, { Rect } from "react-native-svg";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import { useProStatus } from "@/contexts/ProContext";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORTED_LANGUAGES, setLanguage, useDeviceLanguage } from "@/lib/i18n";
import { useContentLanguage } from "@/contexts/ContentLanguageContext";
import { CONTENT_LANGUAGE_OPTIONS, type ContentLanguageOption } from "@/lib/content-language";

interface WeeklyStreakData {
  daysRead: boolean[];
  perfectWeeks: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;
}

interface TodayResponse {
  today: { dayNumber: number; title: string; passageLabel: string | null } | null;
  enrollment?: { planId: string };
  completedCount?: number;
  totalDays?: number;
  planComplete?: boolean;
}

interface BookMapEntry {
  id: number;
  name: string;
  abbreviation: string;
  testament: string;
  chapterCount: number;
  chaptersRead: number;
  explored: boolean;
}

interface GrowthData {
  deepStudyMinutes: number;
  totalSessions: number;
  wordsLearned: number;
  bibleMap: BookMapEntry[];
  booksExplored: number;
  totalBooks: number;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const BADGES = [
  { id: "first-read", title: "First Read", icon: "book" as const, color: "#C9933A", requirement: "Read your first chapter" },
  { id: "week-streak", title: "Week Warrior", icon: "flame" as const, color: "#FF6B35", requirement: "7-day reading streak" },
  { id: "plan-starter", title: "Plan Starter", icon: "flag" as const, color: "#3B6CB5", requirement: "Start a devotional plan" },
  { id: "prayer-warrior", title: "Prayer Warrior", icon: "hand-left" as const, color: "#8B5CF6", requirement: "Add 5 prayer requests" },
  { id: "deep-diver", title: "Deep Diver", icon: "layers" as const, color: "#2E7D32", requirement: "Use all 4 study layers" },
  { id: "perfect-week", title: "Perfect Week", icon: "trophy" as const, color: "#E8456B", requirement: "Read every day for a week" },
];

const HEATMAP_COLS = 11;
const CELL_SIZE = 28;
const CELL_GAP = 3;
const CELL_RADIUS = 5;

interface LayerSummary {
  word: number;
  context: number;
  voices: number;
  application: number;
}

function BibleHeatmap({
  bibleMap,
  theme,
  isDark,
  userId,
}: {
  bibleMap: BookMapEntry[];
  theme: typeof Colors.dark;
  isDark: boolean;
  userId: string;
}) {
  const [selectedBook, setSelectedBook] = useState<BookMapEntry | null>(null);

  const { data: layerSummary } = useQuery<LayerSummary>({
    queryKey: [`/api/layer-completions/book-summary?userId=${userId}&bookId=${selectedBook?.id}`],
    enabled: !!selectedBook,
  });

  const rows = Math.ceil(bibleMap.length / HEATMAP_COLS);
  const svgWidth = HEATMAP_COLS * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const svgHeight = rows * (CELL_SIZE + CELL_GAP) - CELL_GAP;

  const getCellColor = (book: BookMapEntry) => {
    if (!book.explored) return isDark ? "#1a1a1f" : "#e8e4df";
    const ratio = Math.min(book.chaptersRead / Math.max(book.chapterCount, 1), 1);
    if (ratio >= 0.8) return "#C9933A";
    if (ratio >= 0.4) return "rgba(201,147,58,0.65)";
    return "rgba(201,147,58,0.30)";
  };

  return (
    <View>
      <View style={{ alignItems: "center" }}>
        <Svg width={svgWidth} height={svgHeight}>
          {bibleMap.map((book, i) => {
            const col = i % HEATMAP_COLS;
            const row = Math.floor(i / HEATMAP_COLS);
            const x = col * (CELL_SIZE + CELL_GAP);
            const y = row * (CELL_SIZE + CELL_GAP);
            return (
              <Rect
                key={book.id}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={CELL_RADIUS}
                ry={CELL_RADIUS}
                fill={getCellColor(book)}
                onPress={() => setSelectedBook(selectedBook?.id === book.id ? null : book)}
              />
            );
          })}
        </Svg>
      </View>

      {selectedBook && (
        <View style={[heatSt.tooltip, { backgroundColor: isDark ? "#1c1c22" : "#f0ede8" }]}>
          <Text style={[heatSt.tooltipName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {selectedBook.name}
          </Text>
          <Text style={[heatSt.tooltipDetail, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {selectedBook.chaptersRead} of {selectedBook.chapterCount} chapters read
          </Text>
          {layerSummary && (layerSummary.word > 0 || layerSummary.context > 0 || layerSummary.voices > 0 || layerSummary.application > 0) && (
            <View style={heatSt.layerSummary}>
              {[
                { key: "word", label: "Text" },
                { key: "context", label: "Context" },
                { key: "voices", label: "Insight" },
                { key: "application", label: "Transform" },
              ].map((l) => {
                const pct = layerSummary[l.key as keyof LayerSummary];
                return (
                  <View key={l.key} style={heatSt.layerRow}>
                    <Text style={[heatSt.layerLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {l.label}
                    </Text>
                    <View style={[heatSt.layerBarBg, { backgroundColor: isDark ? "#2a2a2f" : "#ddd8d0" }]}>
                      <View style={[heatSt.layerBarFill, { width: `${pct}%` as any, backgroundColor: theme.accent }]} />
                    </View>
                    <Text style={[heatSt.layerPct, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                      {pct}%
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      <View style={heatSt.legendRow}>
        <View style={heatSt.legendGroup}>
          <Text style={[heatSt.legendLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            OT
          </Text>
          <Text style={[heatSt.legendCount, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
            {bibleMap.filter((b) => b.testament === "OT" && b.explored).length}/39
          </Text>
        </View>
        <View style={heatSt.legendGroup}>
          <Text style={[heatSt.legendLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            NT
          </Text>
          <Text style={[heatSt.legendCount, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
            {bibleMap.filter((b) => b.testament === "NT" && b.explored).length}/27
          </Text>
        </View>
        <View style={heatSt.legendSpacer} />
        <View style={heatSt.legendScaleRow}>
          <View style={[heatSt.legendDot, { backgroundColor: isDark ? "#1a1a1f" : "#e8e4df" }]} />
          <View style={[heatSt.legendDot, { backgroundColor: "rgba(201,147,58,0.30)" }]} />
          <View style={[heatSt.legendDot, { backgroundColor: "rgba(201,147,58,0.65)" }]} />
          <View style={[heatSt.legendDot, { backgroundColor: "#C9933A" }]} />
          <Text style={[heatSt.legendLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            depth
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const { isPatron } = useProStatus();
  const { user, isGuest, isAuthenticated, logout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const uid = user?.id || "guest";

  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [contentLangPickerOpen, setContentLangPickerOpen] = useState(false);
  const currentLang = i18n.language?.split("-")[0] || "en";
  const { contentLangOption, setContentLang } = useContentLanguage();

  const handleLanguageChange = useCallback(async (code: string) => {
    await setLanguage(code);
    setLangPickerOpen(false);
  }, []);

  const handleUseDeviceLang = useCallback(async () => {
    await useDeviceLanguage();
    setLangPickerOpen(false);
  }, []);

  const handleContentLangChange = useCallback(async (code: ContentLanguageOption) => {
    await setContentLang(code);
    setContentLangPickerOpen(false);
  }, [setContentLang]);

  const { data: weeklyData } = useQuery<WeeklyStreakData>({
    queryKey: [`/api/reading-streaks/weekly?userId=${uid}`],
  });

  const { data: recentReads } = useQuery<{ id: string; bookId: number; bookName: string; chapter: number; translation: string; readAt: string }[]>({
    queryKey: [`/api/reading-history/recent?userId=${uid}`],
  });

  const { data: todayData } = useQuery<TodayResponse>({
    queryKey: [`/api/devotionals/today?userId=${uid}`],
  });

  const { data: prayerCount } = useQuery<{ id: string }[]>({
    queryKey: [`/api/prayers?userId=${uid}`],
  });

  const { data: growthData } = useQuery<GrowthData>({
    queryKey: [`/api/analytics/growth?userId=${uid}`],
  });

  interface RevisitEntry {
    bookId: number;
    chapter: number;
    bookName: string;
    lastEdited: string;
    excerpt: string;
    layer: string;
    sectionKey: string;
  }

  const { data: revisitEntries } = useQuery<RevisitEntry[]>({
    queryKey: [`/api/study-journal/revisit?userId=${uid}`],
  });

  const daysRead = weeklyData?.daysRead ?? [false, false, false, false, false, false, false];
  const streak = weeklyData?.currentStreak ?? 0;
  const longestStreak = weeklyData?.longestStreak ?? 0;
  const perfectWeeks = weeklyData?.perfectWeeks ?? 0;
  const totalReads = recentReads?.length ?? 0;
  const todayIdx = new Date().getDay();

  const earnedBadges = new Set<string>();
  if (totalReads > 0) earnedBadges.add("first-read");
  if (streak >= 7) earnedBadges.add("week-streak");
  if (todayData?.enrollment) earnedBadges.add("plan-starter");
  if (prayerCount && prayerCount.length >= 5) earnedBadges.add("prayer-warrior");
  if (perfectWeeks > 0) earnedBadges.add("perfect-week");

  const studyMinutes = growthData?.deepStudyMinutes ?? 0;
  const wordsLearned = growthData?.wordsLearned ?? 0;
  const booksExplored = growthData?.booksExplored ?? 0;
  const totalBooks = growthData?.totalBooks ?? 66;
  const totalSessions = growthData?.totalSessions ?? 0;

  return (
    <ScrollView
      style={[st.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: bottomPad + 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={st.headerSection}>
        <View style={[st.avatarCircle, { backgroundColor: theme.accent }]}>
          <Ionicons name="person" size={36} color="#fff" />
        </View>
        <Text style={[st.userName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          {isAuthenticated ? (user?.displayName || "User") : "Guest"}
        </Text>
        <Text style={[st.userSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {isAuthenticated ? (user?.email || "Grace through Faith") : "Grace through Faith"}
        </Text>
        {isPatron && (
          <View style={st.patronBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#C9933A" />
            <Text style={st.patronBadgeText}>{t("profile.missionPartner")}</Text>
          </View>
        )}
        {isGuest ? (
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={[st.authBtn, { backgroundColor: theme.accent }]}
            testID="profile-sign-in"
          >
            <Ionicons name="log-in-outline" size={16} color="#fff" />
            <Text style={[st.authBtnText, { fontFamily: "Inter_600SemiBold" }]}>{t("profile.signIn")}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={logout}
            style={[st.authBtn, { backgroundColor: isDark ? "#2A2A3E" : "#E8E4DD" }]}
            testID="profile-sign-out"
          >
            <Ionicons name="log-out-outline" size={16} color={theme.textSecondary} />
            <Text style={[st.authBtnText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>{t("profile.signOut")}</Text>
          </Pressable>
        )}
      </View>

      <View style={st.statsRow}>
        <Pressable style={({ pressed }) => [st.statCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 }]}>
          <Ionicons name="flame" size={22} color="#FF6B35" />
          <Text style={[st.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{streak}</Text>
          <Text style={[st.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{t("profile.currentStreak")}</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [st.statCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 }]}>
          <Ionicons name="trending-up" size={22} color={theme.accent} />
          <Text style={[st.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{longestStreak}</Text>
          <Text style={[st.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{t("profile.longestStreak")}</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [st.statCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 }]}>
          <Ionicons name="trophy" size={22} color="#E8456B" />
          <Text style={[st.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{perfectWeeks}</Text>
          <Text style={[st.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{t("profile.perfectWeeks")}</Text>
        </Pressable>
      </View>

      <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />

      {weeklyData && (
        <View style={[st.weeklyCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
          <Text style={[st.weeklyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {t("profile.thisWeek")}
          </Text>
          <View style={st.weekRow}>
            {DAY_LABELS.map((label, i) => {
              const isToday = i === todayIdx;
              const didRead = daysRead[i];
              return (
                <View key={i} style={st.weekDayCol}>
                  <Text style={[st.weekLabel, { color: isToday ? theme.accent : theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                    {label}
                  </Text>
                  <View
                    style={[
                      st.weekDot,
                      didRead && { backgroundColor: theme.accent },
                      isToday && !didRead && { borderColor: theme.accent, borderWidth: 2 },
                    ]}
                  >
                    {didRead && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={[st.weekSummary, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {daysRead.filter(Boolean).length} of 7 days completed
          </Text>
        </View>
      )}

      <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />

      <View style={[st.growthSection, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
        <Text style={[st.growthHeader, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          {t("profile.growthAnalytics")}
        </Text>

        <View style={st.growthStatsRow}>
          <View style={st.growthStatItem}>
            <View style={[st.growthIconWrap, { backgroundColor: "rgba(139,92,246,0.12)" }]}>
              <Ionicons name="school" size={20} color="#8B5CF6" />
            </View>
            <Text style={[st.growthStatNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {studyMinutes}
            </Text>
            <Text style={[st.growthStatLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t("profile.deepStudyMinutes")}
            </Text>
          </View>

          <View style={st.growthStatItem}>
            <View style={[st.growthIconWrap, { backgroundColor: "rgba(201,147,58,0.12)" }]}>
              <Ionicons name="language" size={20} color="#C9933A" />
            </View>
            <Text style={[st.growthStatNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {wordsLearned}
            </Text>
            <Text style={[st.growthStatLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t("profile.greekHebrewWords")}
            </Text>
          </View>

          <View style={st.growthStatItem}>
            <View style={[st.growthIconWrap, { backgroundColor: "rgba(46,125,50,0.12)" }]}>
              <Ionicons name="book" size={20} color="#2E7D32" />
            </View>
            <Text style={[st.growthStatNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {totalSessions}
            </Text>
            <Text style={[st.growthStatLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t("profile.socraticSessions")}
            </Text>
          </View>
        </View>
      </View>

      <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />

      <View style={[st.heatmapSection, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
        <View style={st.heatmapHeaderRow}>
          <Text style={[st.heatmapTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {t("profile.bibleKnowledgeMap")}
          </Text>
          <Text style={[st.heatmapSubtitle, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            {booksExplored}/{totalBooks}
          </Text>
        </View>
        <Text style={[st.heatmapDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {t("profile.tapBlockToSee")}
        </Text>
        {growthData?.bibleMap && growthData.bibleMap.length > 0 ? (
          <BibleHeatmap bibleMap={growthData.bibleMap} theme={theme} isDark={isDark} userId={uid} />
        ) : (
          <View style={st.heatmapEmpty}>
            <Ionicons name="map-outline" size={32} color={theme.textMuted} />
            <Text style={[st.heatmapEmptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t("profile.startReadingMap")}
            </Text>
          </View>
        )}
      </View>

      <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />

      <View style={st.sectionPad}>
        <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          {t("profile.badges")}
        </Text>
        <View style={st.badgeGrid}>
          {BADGES.map((badge) => {
            const earned = earnedBadges.has(badge.id);
            return (
              <View
                key={badge.id}
                style={[
                  st.badgeCard,
                  { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" },
                  !earned && { opacity: 0.45 },
                ]}
              >
                <View style={[st.badgeIcon, { backgroundColor: badge.color + (earned ? "20" : "10") }]}>
                  <Ionicons name={badge.icon} size={22} color={earned ? badge.color : theme.textMuted} />
                </View>
                <Text
                  style={[st.badgeTitle, { color: earned ? theme.text : theme.textMuted, fontFamily: "Inter_600SemiBold" }]}
                  numberOfLines={1}
                >
                  {badge.title}
                </Text>
                <Text style={[st.badgeReq, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                  {badge.requirement}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />

      {recentReads && recentReads.length > 0 && (
        <View style={st.sectionPad}>
          <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {t("profile.recentActivity")}
          </Text>
          {recentReads.slice(0, 5).map((read, i) => (
            <Pressable
              key={read.id}
              onPress={() => router.push(`/read/${read.bookId}/${read.chapter}?translation=${read.translation || "KJV"}`)}
              style={({ pressed }) => [
                st.activityRow,
                { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[st.activityIcon, { backgroundColor: theme.accent + "15" }]}>
                <Ionicons name="book" size={16} color={theme.accent} />
              </View>
              <View style={st.activityInfo}>
                <Text style={[st.activityTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {read.bookName} {read.chapter}
                </Text>
                <Text style={[st.activityTime, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {read.readAt ? formatTimeAgo(read.readAt) : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      {revisitEntries && revisitEntries.length > 0 && (
        <>
          <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />
          <View style={st.sectionPad}>
            <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              {t("profile.revisitReflections")}
            </Text>
            <Text style={[st.revisitSubtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t("profile.revisitSubtitle")}
            </Text>
            {revisitEntries.slice(0, 5).map((entry, i) => {
              const LAYER_DISPLAY: Record<string, string> = { word: "Text", context: "Context", voices: "Insight", application: "Transformation" };
              return (
                <Pressable
                  key={`${entry.bookId}-${entry.chapter}-${i}`}
                  onPress={() => router.push(`/study?bookId=${entry.bookId}&chapter=${entry.chapter}&tab=${entry.layer}&bookName=${encodeURIComponent(entry.bookName)}` as any)}
                  style={({ pressed }) => [
                    st.revisitRow,
                    { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={[st.revisitIcon, { backgroundColor: theme.accent + "15" }]}>
                    <Ionicons name="document-text-outline" size={16} color={theme.accent} />
                  </View>
                  <View style={st.revisitInfo}>
                    <View style={st.revisitHeader}>
                      <Text style={[st.revisitTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                        {entry.bookName} {entry.chapter}
                      </Text>
                      <Text style={[st.revisitLayer, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                        {LAYER_DISPLAY[entry.layer] || entry.layer}
                      </Text>
                    </View>
                    {entry.excerpt ? (
                      <Text style={[st.revisitExcerpt, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                        {entry.excerpt}{entry.excerpt.length >= 120 ? "..." : ""}
                      </Text>
                    ) : null}
                    <Text style={[st.revisitDate, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {entry.lastEdited ? formatTimeAgo(entry.lastEdited) : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />

      <View style={st.sectionPad}>
        <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          {t("profile.quickLinks")}
        </Text>

        <Pressable
          onPress={() => setLangPickerOpen(!langPickerOpen)}
          style={({ pressed }) => [
            st.linkRow,
            { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[st.linkIcon, { backgroundColor: "#3B82F615" }]}>
            <Ionicons name="language" size={18} color="#3B82F6" />
          </View>
          <Text style={[st.linkTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
            {t("profile.language")}
          </Text>
          <Text style={[st.langCurrentLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.label || "English"}
          </Text>
          <Ionicons name={langPickerOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
        </Pressable>

        {langPickerOpen && (
          <View style={[st.langPicker, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", borderColor: theme.border }]}>
            <Pressable
              onPress={handleUseDeviceLang}
              style={({ pressed }) => [
                st.langOption,
                { opacity: pressed ? 0.7 : 1, borderBottomColor: theme.divider },
              ]}
            >
              <Ionicons name="phone-portrait-outline" size={16} color={theme.accent} />
              <Text style={[st.langOptionText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                {t("profile.useDeviceLanguage")}
              </Text>
            </Pressable>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = currentLang === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLanguageChange(lang.code)}
                  style={({ pressed }) => [
                    st.langOption,
                    { opacity: pressed ? 0.7 : 1, borderBottomColor: theme.divider },
                    isActive && { backgroundColor: theme.accent + "10" },
                  ]}
                >
                  <Text style={[st.langOptionText, { color: isActive ? theme.accent : theme.text, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    {lang.label}
                  </Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={theme.accent} />}
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={() => setContentLangPickerOpen(!contentLangPickerOpen)}
          style={({ pressed }) => [
            st.linkRow,
            { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[st.linkIcon, { backgroundColor: "#10B98115" }]}>
            <Ionicons name="document-text" size={18} color="#10B981" />
          </View>
          <Text style={[st.linkTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
            {t("profile.contentLanguage")}
          </Text>
          <Text style={[st.langCurrentLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {CONTENT_LANGUAGE_OPTIONS.find((o) => o.code === contentLangOption)?.label || "Same as App"}
          </Text>
          <Ionicons name={contentLangPickerOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
        </Pressable>

        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, paddingHorizontal: 16, paddingBottom: 8, lineHeight: 17 }}>
          {t("profile.contentLangSub")}
        </Text>

        {contentLangPickerOpen && (
          <View style={[st.langPicker, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", borderColor: theme.border }]}>
            {CONTENT_LANGUAGE_OPTIONS.map((opt) => {
              const isActive = contentLangOption === opt.code;
              return (
                <Pressable
                  key={opt.code}
                  onPress={() => handleContentLangChange(opt.code)}
                  style={({ pressed }) => [
                    st.langOption,
                    { opacity: pressed ? 0.7 : 1, borderBottomColor: theme.divider },
                    isActive && { backgroundColor: theme.accent + "10" },
                  ]}
                >
                  <Text style={[st.langOptionText, { color: isActive ? theme.accent : theme.text, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    {opt.code === "same" ? t("profile.sameAsApp") : opt.label}
                  </Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={theme.accent} />}
                </Pressable>
              );
            })}
          </View>
        )}

        {[
          { title: t("profile.prayerJournal"), icon: "journal" as const, color: "#8B5CF6", route: "/prayer-journal" },
          { title: t("profile.prayerGroups"), icon: "people-circle" as const, color: "#10B981", route: "/groups" },
          { title: t("profile.parentControls"), icon: "shield-checkmark" as const, color: "#E65100", route: "/parent-controls" },
          { title: t("profile.howItWorks"), icon: "information-circle" as const, color: "#5B86E5", route: "/how-it-works" },
        ].map((link) => (
          <Pressable
            key={link.route}
            onPress={() => router.push(link.route as any)}
            style={({ pressed }) => [
              st.linkRow,
              { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[st.linkIcon, { backgroundColor: link.color + "15" }]}>
              <Ionicons name={link.icon} size={18} color={link.color} />
            </View>
            <Text style={[st.linkTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
              {link.title}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const heatSt = StyleSheet.create({
  tooltip: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  tooltipName: { fontSize: 15, marginBottom: 2 },
  tooltipDetail: { fontSize: 12 },
  layerSummary: {
    marginTop: 10,
    width: "100%",
    gap: 6,
  },
  layerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  layerLabel: {
    fontSize: 10,
    width: 56,
    letterSpacing: 0.2,
  },
  layerBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  layerBarFill: {
    height: 6,
    borderRadius: 3,
  },
  layerPct: {
    fontSize: 10,
    width: 28,
    textAlign: "right",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 12,
  },
  legendGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendLabel: { fontSize: 11 },
  legendCount: { fontSize: 12 },
  legendSpacer: { flex: 1 },
  legendScaleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});

const st = StyleSheet.create({
  container: { flex: 1 },
  sectionDivider: {
    height: 1,
    marginHorizontal: 32,
    marginVertical: 8,
    opacity: 0.5,
  },
  headerSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  userName: { fontSize: 24, marginBottom: 4 },
  userSub: { fontSize: 14, lineHeight: 22 },
  patronBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#C9933A",
    backgroundColor: "rgba(201,147,58,0.08)",
  },
  patronBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#C9933A",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  statNum: { fontSize: 24 },
  statLabel: { fontSize: 11, textAlign: "center", lineHeight: 15 },
  weeklyCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  weeklyTitle: { fontSize: 16, marginBottom: 16 },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 14,
  },
  weekDayCol: {
    alignItems: "center",
    gap: 8,
  },
  weekLabel: { fontSize: 12 },
  weekDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(128,128,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  weekSummary: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  growthSection: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
  },
  growthHeader: { fontSize: 22, marginBottom: 18 },
  growthStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  growthStatItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  growthIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  growthStatNum: { fontSize: 22 },
  growthStatLabel: { fontSize: 11, textAlign: "center", lineHeight: 15 },
  heatmapSection: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  heatmapHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  heatmapTitle: { fontSize: 18 },
  heatmapSubtitle: { fontSize: 15 },
  heatmapDesc: { fontSize: 12, marginBottom: 16, lineHeight: 18 },
  heatmapEmpty: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 10,
  },
  heatmapEmptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  sectionPad: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 22, marginBottom: 14 },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badgeCard: {
    width: "31%" as any,
    flexGrow: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTitle: { fontSize: 12, textAlign: "center" },
  badgeReq: { fontSize: 10, textAlign: "center", lineHeight: 16 },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 6,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 15 },
  activityTime: { fontSize: 12, marginTop: 2, lineHeight: 18 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    marginBottom: 6,
  },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  linkTitle: { flex: 1, fontSize: 15 },
  authBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  authBtnText: {
    fontSize: 14,
    color: "#fff",
  },
  revisitSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 20,
  },
  revisitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 6,
  },
  revisitIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  revisitInfo: { flex: 1 },
  revisitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  revisitTitle: { fontSize: 15 },
  revisitLayer: { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.3 },
  revisitExcerpt: { fontSize: 12, lineHeight: 18, marginBottom: 2 },
  revisitDate: { fontSize: 11, marginTop: 2 },
  langCurrentLabel: {
    fontSize: 13,
    marginRight: 4,
  },
  langPicker: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden" as const,
  },
  langOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  langOptionText: {
    fontSize: 15,
    flex: 1,
  },
});
