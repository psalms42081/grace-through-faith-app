import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useProStatus } from "@/contexts/ProContext";
import ListItem from "@/components/ui/ListItem";
import FeatureTutorial from "@/components/FeatureTutorial";
import { PROFILE_TUTORIAL_STEPS } from "@/lib/tutorial-steps";
import { useAuth } from "@/contexts/AuthContext";
import { useTutorial } from "@/contexts/TutorialContext";
import { setLanguage, useDeviceLanguage } from "@/lib/i18n";
import { useContentLanguage } from "@/contexts/ContentLanguageContext";
import { type ContentLanguageOption } from "@/lib/content-language";
import BibleHeatmap, { type BookMapEntry } from "@/components/profile/BibleHeatmap";
import BadgesGrid from "@/components/profile/BadgesGrid";
import GrowthAnalytics from "@/components/profile/GrowthAnalytics";
import ActivitySections from "@/components/profile/ActivitySections";
import LanguageSettings from "@/components/profile/LanguageSettings";

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

interface GrowthData {
  deepStudyMinutes: number;
  totalSessions: number;
  wordsLearned: number;
  bibleMap: BookMapEntry[];
  booksExplored: number;
  totalBooks: number;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function ProfileScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const { isPatron } = useProStatus();
  const { user, isGuest, isAuthenticated, logout } = useAuth();
  const { resetAllTutorials } = useTutorial();
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
    <>
    <FeatureTutorial tutorialId="profile" steps={PROFILE_TUTORIAL_STEPS} />
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

      <GrowthAnalytics
        studyMinutes={studyMinutes}
        wordsLearned={wordsLearned}
        totalSessions={totalSessions}
        theme={theme}
        isDark={isDark}
        headerText={t("profile.growthAnalytics")}
        deepStudyLabel={t("profile.deepStudyMinutes")}
        greekHebrewLabel={t("profile.greekHebrewWords")}
        socraticLabel={t("profile.socraticSessions")}
      />

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

      <BadgesGrid
        earnedBadges={earnedBadges}
        theme={theme}
        isDark={isDark}
        sectionTitle={t("profile.badges")}
      />

      <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />

      <ActivitySections
        recentReads={recentReads}
        revisitEntries={revisitEntries}
        theme={theme}
        isDark={isDark}
        recentActivityTitle={t("profile.recentActivity")}
        revisitTitle={t("profile.revisitReflections")}
        revisitSubtitle={t("profile.revisitSubtitle")}
      />

      <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />

      <View style={st.sectionPad}>
        <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          {t("profile.quickLinks")}
        </Text>

        <LanguageSettings
          theme={theme}
          isDark={isDark}
          currentLang={currentLang}
          contentLangOption={contentLangOption}
          langPickerOpen={langPickerOpen}
          contentLangPickerOpen={contentLangPickerOpen}
          onToggleLangPicker={() => setLangPickerOpen(!langPickerOpen)}
          onToggleContentLangPicker={() => setContentLangPickerOpen(!contentLangPickerOpen)}
          onLanguageChange={handleLanguageChange}
          onUseDeviceLang={handleUseDeviceLang}
          onContentLangChange={handleContentLangChange}
          languageLabel={t("profile.language")}
          contentLanguageLabel={t("profile.contentLanguage")}
          contentLangSub={t("profile.contentLangSub")}
          useDeviceLanguageLabel={t("profile.useDeviceLanguage")}
          sameAsAppLabel={t("profile.sameAsApp")}
        />

        {[
          { title: "Spiritual Growth", icon: "trending-up" as const, color: "#4ECCA3", route: "/growth-map" },
          { title: "My Library", icon: "library" as const, color: "#C9933A", route: "/library" },
          { title: t("profile.prayerJournal"), icon: "journal" as const, color: "#8B5CF6", route: "/prayer-journal" },
          { title: t("profile.prayerGroups"), icon: "people-circle" as const, color: "#10B981", route: "/groups" },
          { title: t("profile.parentControls"), icon: "shield-checkmark" as const, color: "#E65100", route: "/parent-controls" },
          { title: t("profile.howItWorks"), icon: "information-circle" as const, color: "#5B86E5", route: "/how-it-works" },
        ].map((link) => (
          <ListItem
            key={link.route}
            icon={link.icon}
            iconColor={link.color}
            title={link.title}
            onPress={() => router.push(link.route as any)}
            style={{ marginBottom: 6 }}
          />
        ))}

        <ListItem
          icon="refresh"
          iconColor="#C9933A"
          title="Replay Tutorials"
          onPress={resetAllTutorials}
          style={{ marginBottom: 6 }}
        />
      </View>
    </ScrollView>
    </>
  );
}

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
});
