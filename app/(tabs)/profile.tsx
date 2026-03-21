import React, { Component, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import * as Clipboard from "expo-clipboard";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import BibleHeatmap from "@/components/profile/BibleHeatmap";
import GrowthAnalytics from "@/components/profile/GrowthAnalytics";
import LanguageSettings from "@/components/profile/LanguageSettings";
import NotificationSettings from "@/components/profile/NotificationSettings";
import type { BookMapEntry } from "@/components/profile/BibleHeatmap";

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
    await AsyncStorage.removeItem("@grace-through-faith/translation-manual");
    await AsyncStorage.removeItem("@grace-through-faith/translation");
    setLangPickerOpen(false);
  }, []);

  const handleUseDeviceLang = useCallback(async () => {
    await useDeviceLanguage();
    await AsyncStorage.removeItem("@grace-through-faith/translation-manual");
    await AsyncStorage.removeItem("@grace-through-faith/translation");
    setLangPickerOpen(false);
  }, []);

  const { data: weeklyData } = useQuery<WeeklyStreakData>({
    queryKey: [`/api/reading-streaks/weekly?userId=${uid}`],
  });

  const { data: growthData } = useQuery<GrowthData>({
    queryKey: [`/api/analytics/growth?userId=${uid}`],
  });

  const { data: myOrgData, isLoading: orgLoading } = useQuery<{
    organization: { id: string; name: string; type: string; joinCode: string; memberCount: number } | null;
    role: string | null;
  }>({
    queryKey: ["/api/organizations/my-org"],
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const isConference = myOrgData?.organization?.type === "conference";
  const isPastorOrElder = myOrgData?.role === "pastor" || myOrgData?.role === "elder";

  const { data: confChurches, refetch: refetchChurches } = useQuery<{
    id: string; name: string; joinCode: string; memberCount: number;
  }[]>({
    queryKey: [`/api/organizations/${myOrgData?.organization?.id}/churches`],
    enabled: isAuthenticated && isConference && !!myOrgData?.organization?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const [codeCopied, setCodeCopied] = useState(false);
  const [addChurchName, setAddChurchName] = useState("");
  const [addingChurch, setAddingChurch] = useState(false);
  const [showAddChurch, setShowAddChurch] = useState(false);

  const handleCopyCode = useCallback(async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, []);

  const handleAddChurch = useCallback(async () => {
    if (!addChurchName.trim() || !myOrgData?.organization?.id) return;
    setAddingChurch(true);
    try {
      await apiRequest("POST", `/api/organizations/${myOrgData.organization.id}/churches`, {
        name: addChurchName.trim(),
      });
      setAddChurchName("");
      setShowAddChurch(false);
      refetchChurches();
    } catch {}
    setAddingChurch(false);
  }, [addChurchName, myOrgData?.organization?.id, refetchChurches]);

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
          <Ionicons name={streak >= longestStreak && longestStreak > 0 ? "trophy" : "trending-up"} size={22} color={theme.accent} />
          <Text style={[st.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {streak >= longestStreak && longestStreak > 0 ? longestStreak : longestStreak > 0 ? `${longestStreak - streak} to go` : "--"}
          </Text>
          <Text style={[st.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {streak >= longestStreak && longestStreak > 0 ? t("profile.longestStreak") : longestStreak > 0 ? "Beat your best" : t("profile.longestStreak")}
          </Text>
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

      {(studyMinutes > 0 || wordsLearned > 0 || totalSessions > 0) ? (
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
      ) : (
        <View style={[st.analyticsInvite, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
          <Ionicons name="analytics-outline" size={32} color={theme.textMuted} />
          <Text style={[st.analyticsInviteText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Complete your first Deep Dive to unlock your growth stats
          </Text>
        </View>
      )}

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

      {isAuthenticated && (
        <View style={st.sectionPad}>
          <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {isConference ? "My Conference" : "My Church"}
          </Text>
          {orgLoading ? (
            <ActivityIndicator color="#C9933A" style={{ marginVertical: 16 }} />
          ) : myOrgData?.organization ? (
            <>
              <View style={[st.orgCard, { backgroundColor: isDark ? "#1A1A24" : "#FFFDF6" }]}>
                <View style={st.orgHeader}>
                  <Ionicons
                    name={isConference ? "globe-outline" : "home-outline"}
                    size={24}
                    color="#C9933A"
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[st.orgName, { color: theme.text }]}>{myOrgData.organization.name}</Text>
                    <Text style={[st.orgMeta, { color: theme.textMuted }]}>
                      {myOrgData.role === "pastor" ? "Administrator" : myOrgData.role === "elder" ? "Elder" : "Member"} · {myOrgData.organization.memberCount} member{myOrgData.organization.memberCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
                {isPastorOrElder && myOrgData.organization.joinCode && (
                  <Pressable
                    style={st.joinCodeRow}
                    onPress={() => handleCopyCode(myOrgData.organization!.joinCode)}
                  >
                    <View>
                      <Text style={[st.joinCodeLabel, { color: theme.textMuted }]}>
                        {isConference ? "Conference Join Code" : "Join Code"}
                      </Text>
                      <Text style={[st.joinCodeValue, { color: theme.text }]}>{myOrgData.organization.joinCode}</Text>
                    </View>
                    <Ionicons
                      name={codeCopied ? "checkmark-circle" : "copy-outline"}
                      size={20}
                      color={codeCopied ? "#4CAF50" : "#C9933A"}
                    />
                  </Pressable>
                )}
                <ListItem
                  icon="people"
                  iconColor="#C9933A"
                  title={isConference ? "View Conference Members" : "View Members"}
                  onPress={() => router.push(`/org-members?orgId=${myOrgData.organization!.id}` as any)}
                  style={{ marginTop: 8 }}
                />
              </View>

              {isConference && (
                <View style={{ marginTop: 20 }}>
                  <View style={st.confChurchesHeader}>
                    <Text style={[st.confChurchesTitle, { color: theme.text }]}>My Churches</Text>
                    {isPastorOrElder && (
                      <Pressable onPress={() => setShowAddChurch(!showAddChurch)}>
                        <Ionicons name={showAddChurch ? "close-circle-outline" : "add-circle-outline"} size={24} color="#C9933A" />
                      </Pressable>
                    )}
                  </View>

                  {showAddChurch && (
                    <View style={[st.addChurchRow, { backgroundColor: isDark ? "#1A1A24" : "#FFFDF6" }]}>
                      <TextInput
                        style={[st.addChurchInput, { color: theme.text, borderColor: isDark ? "#2A2A35" : "#DDD" }]}
                        placeholder="New church name"
                        placeholderTextColor={theme.textMuted}
                        value={addChurchName}
                        onChangeText={setAddChurchName}
                      />
                      <Pressable
                        style={[st.addChurchBtn, (!addChurchName.trim() || addingChurch) && st.btnDisabled]}
                        onPress={handleAddChurch}
                        disabled={!addChurchName.trim() || addingChurch}
                      >
                        {addingChurch ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={st.addChurchBtnText}>Add</Text>
                        )}
                      </Pressable>
                    </View>
                  )}

                  {confChurches && confChurches.length > 0 ? (
                    confChurches.map((church) => (
                      <View key={church.id} style={[st.confChurchCard, { backgroundColor: isDark ? "#1A1A24" : "#FFFDF6" }]}>
                        <View style={st.confChurchRow}>
                          <Ionicons name="home-outline" size={20} color="#C9933A" />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[st.confChurchName, { color: theme.text }]}>{church.name}</Text>
                            <Text style={[st.confChurchMeta, { color: theme.textMuted }]}>
                              {church.memberCount} member{church.memberCount !== 1 ? "s" : ""}
                            </Text>
                          </View>
                        </View>
                        {isPastorOrElder && church.joinCode && (
                          <Pressable
                            style={st.confChurchCodeBtn}
                            onPress={() => handleCopyCode(church.joinCode)}
                          >
                            <Ionicons name="key-outline" size={14} color="#C9933A" />
                            <Text style={st.confChurchCodeText}>{church.joinCode}</Text>
                            <Ionicons name="copy-outline" size={14} color="#C9933A" />
                          </Pressable>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={[st.confChurchesEmpty, { color: theme.textMuted }]}>
                      No churches added yet. Tap + to add one.
                    </Text>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={[st.orgCard, { backgroundColor: isDark ? "#1A1A24" : "#FFFDF6" }]}>
              <Text style={[st.orgEmptyText, { color: theme.textMuted }]}>
                You're not part of a church yet.
              </Text>
              <Pressable
                style={st.orgJoinBtn}
                onPress={() => router.push("/org-onboarding" as any)}
              >
                <Ionicons name="add-circle-outline" size={18} color="#C9933A" />
                <Text style={st.orgJoinBtnText}>Join or Register a Church</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

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

        <NotificationSettings
          theme={theme}
          expanded={notifSettingsOpen}
          onToggle={() => setNotifSettingsOpen(!notifSettingsOpen)}
        />

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
          ...(isAuthenticated && (user?.role === "admin" || user?.role === "editor" || user?.role === "church_leader") ? [
            { title: "Admin Dashboard", icon: "construct" as const, color: "#EF4444", route: "/admin-review" },
          ] : []),
          ...(isAuthenticated && user?.role === "church_leader_pending" ? [
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
                const msg = "Your church leader access is being reviewed. You'll be notified when approved.";
                if (Platform.OS === "web") {
                  window.alert(msg);
                } else {
                  Alert.alert("Pending Review", msg);
                }
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
    <ProfileErrorBoundary>
      <ProfileScreenInner />
    </ProfileErrorBoundary>
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
  analyticsInvite: {
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  analyticsInviteText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
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
  orgCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.15)",
  },
  orgHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  orgName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  orgMeta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  joinCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  joinCodeLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  joinCodeValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  orgEmptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 14,
  },
  orgJoinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C9933A",
  },
  orgJoinBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#C9933A",
  },
  btnDisabled: { opacity: 0.5 },
  confChurchesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  confChurchesTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  addChurchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.2)",
  },
  addChurchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  addChurchBtn: {
    backgroundColor: "#C9933A",
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addChurchBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  confChurchCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.12)",
  },
  confChurchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  confChurchName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  confChurchMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  confChurchCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(201,147,58,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    marginLeft: 30,
    alignSelf: "flex-start",
  },
  confChurchCodeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#C9933A",
    letterSpacing: 1,
  },
  confChurchesEmpty: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 20,
  },
});
