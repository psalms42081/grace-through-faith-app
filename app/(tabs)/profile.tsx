import React, { Component, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
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
import { useAuth } from "@/contexts/AuthContext";
import { setLanguage, useDeviceLanguage } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/query-client";
// Temporarily disabled for crash debugging
// import BibleHeatmap from "@/components/profile/BibleHeatmap";
// import GrowthAnalytics from "@/components/profile/GrowthAnalytics";
// import LanguageSettings from "@/components/profile/LanguageSettings";
// let NotificationSettings: React.ComponentType<any> | null = null;
// try { NotificationSettings = require("@/components/profile/NotificationSettings").default; } catch {}

type BookMapEntry = {
  id: number;
  name: string;
  abbreviation: string;
  testament: string;
  chapterCount: number;
  chaptersRead: number;
  explored: boolean;
};

class ProfileErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#0D0D15" }}>
          <Ionicons name="alert-circle-outline" size={48} color="#C9933A" />
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 16, textAlign: "center" }}>
            Something went wrong
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 8, textAlign: "center" }}>
            {this.state.error.message}
          </Text>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#C9933A", borderRadius: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

interface WeeklyStreakData {
  daysRead: boolean[];
  perfectWeeks: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;
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

function ProfileScreenInner() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const { isPatron } = useProStatus();
  const { user, isGuest, isAuthenticated, logout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const uid = user?.id || "guest";

  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [notifSettingsOpen, setNotifSettingsOpen] = useState(false);
  const currentLang = i18n.language?.split("-")[0] || "en";

  const handleLanguageChange = useCallback(async (code: string) => {
    await setLanguage(code);
    setLangPickerOpen(false);
  }, []);

  const handleUseDeviceLang = useCallback(async () => {
    await useDeviceLanguage();
    setLangPickerOpen(false);
  }, []);

  const { data: weeklyData } = useQuery<WeeklyStreakData>({
    queryKey: [`/api/reading-streaks/weekly?userId=${uid}`],
  });

  const { data: growthData } = useQuery<GrowthData>({
    queryKey: [`/api/analytics/growth?userId=${uid}`],
  });

  const daysRead = weeklyData?.daysRead ?? [false, false, false, false, false, false, false];
  const streak = weeklyData?.currentStreak ?? 0;
  const longestStreak = weeklyData?.longestStreak ?? 0;
  const perfectWeeks = weeklyData?.perfectWeeks ?? 0;
  const todayIdx = new Date().getDay();

  const studyMinutes = growthData?.deepStudyMinutes ?? 0;
  const wordsLearned = growthData?.wordsLearned ?? 0;
  const booksExplored = growthData?.booksExplored ?? 0;
  const totalBooks = growthData?.totalBooks ?? 66;
  const totalSessions = growthData?.totalSessions ?? 0;

  return (
    <>
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

      <View style={st.sectionPad}>
        <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Your Growth
        </Text>
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

      <View style={{ height: 8 }} />

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

      <View style={{ height: 16 }} />

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

      <View style={{ height: 16 }} />

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
          Library
        </Text>
        <ListItem
          icon="journal"
          iconColor="#8B5CF6"
          title={t("profile.prayerJournal")}
          onPress={() => router.push("/prayer-journal" as any)}
          style={{ marginBottom: 6 }}
        />
        <ListItem
          icon="bookmark"
          iconColor="#C9933A"
          title="Saved"
          onPress={() => router.push("/library" as any)}
          style={{ marginBottom: 6 }}
        />
      </View>

      <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />

      <View style={st.sectionPad}>
        <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Settings
        </Text>
        <ListItem
          icon="shield-checkmark"
          iconColor="#E65100"
          title={t("profile.parentControls")}
          onPress={() => router.push("/parent-controls" as any)}
          style={{ marginBottom: 6 }}
        />

        {NotificationSettings ? (
          <NotificationSettings
            theme={theme}
            expanded={notifSettingsOpen}
            onToggle={() => setNotifSettingsOpen(!notifSettingsOpen)}
          />
        ) : null}

        <LanguageSettings
          theme={theme}
          isDark={isDark}
          currentLang={currentLang}
          langPickerOpen={langPickerOpen}
          onToggleLangPicker={() => setLangPickerOpen(!langPickerOpen)}
          onLanguageChange={handleLanguageChange}
          onUseDeviceLang={handleUseDeviceLang}
          languageLabel={t("profile.language")}
          useDeviceLanguageLabel={t("profile.useDeviceLanguage")}
        />

        <View style={{ height: 12 }} />

        {[
          ...(user?.role === "admin" || user?.role === "editor" || user?.role === "church_leader" ? [
            { title: "Admin Dashboard", icon: "construct" as const, color: "#EF4444", route: "/admin-review" },
          ] : []),
          ...(user?.role === "church_leader_pending" ? [
            { title: "Leader Access", icon: "hourglass" as const, color: "#F59E0B", route: "pending-leader" },
          ] : []),
          { title: "AI Use & Ethics", icon: "sparkles" as const, color: "#C9933A", route: "/ai-guidelines" },
        ].map((link) => (
          <ListItem
            key={link.route}
            icon={link.icon}
            iconColor={link.color}
            title={link.title}
            onPress={() => {
              if (link.route === "pending-leader") {
                Alert.alert("Pending Review", "Your church leader access is being reviewed. You'll be notified when approved.");
                return;
              }
              router.push(link.route as any);
            }}
            style={{ marginBottom: 6 }}
          />
        ))}
      </View>
    </ScrollView>
    </>
  );
}

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D0D15" }}>
      <Ionicons name="person" size={48} color="#C9933A" />
      <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" as const, marginTop: 16 }}>
        Profile Test
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 8 }}>
        If you can see this, the tab works.
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 36,
    marginVertical: 20,
    opacity: 0.35,
  },
  headerSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  userName: { fontSize: 26, marginBottom: 4, letterSpacing: -0.2 },
  userSub: { fontSize: 14, lineHeight: 22, opacity: 0.8 },
  patronBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
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
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },
  statNum: { fontSize: 24, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, textAlign: "center", lineHeight: 15 },
  weeklyCard: {
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 22,
    marginBottom: 8,
  },
  weeklyTitle: { fontSize: 16, marginBottom: 18 },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 16,
  },
  weekDayCol: {
    alignItems: "center",
    gap: 10,
  },
  weekLabel: { fontSize: 12 },
  weekDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(128,128,128,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  weekSummary: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  heatmapSection: {
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 22,
    marginBottom: 8,
  },
  heatmapHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  heatmapTitle: { fontSize: 18 },
  heatmapSubtitle: { fontSize: 15 },
  heatmapDesc: { fontSize: 12, marginBottom: 18, lineHeight: 18, opacity: 0.8 },
  heatmapEmpty: {
    alignItems: "center",
    paddingVertical: 34,
    gap: 12,
  },
  heatmapEmptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  sectionPad: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 21, marginBottom: 16, letterSpacing: -0.1 },
  sectionSubLabel: { fontSize: 11.5, letterSpacing: 0.8, textTransform: "uppercase" as const },
  authBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
  },
  authBtnText: {
    fontSize: 14,
    color: "#fff",
  },
});
