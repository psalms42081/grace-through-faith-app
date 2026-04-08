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
  Modal,
  Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useProStatus } from "@/contexts/ProContext";
import ListItem from "@/components/ui/ListItem";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { apiRequest, queryClient } from "@/lib/query-client";

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
  booksExplored: number;
  totalBooks: number;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const BADGES = [
  { id: "first-read", icon: "book", label: "First Steps", check: (s: number) => s >= 1 },
  { id: "week-warrior", icon: "flame", label: "Week Warrior", check: (s: number) => s >= 7 },
  { id: "perfect-week", icon: "star", label: "Perfect Week", check: (_s: number, pw: number) => pw >= 1 },
  { id: "month-strong", icon: "shield-checkmark", label: "Month Strong", check: (s: number) => s >= 30 },
  { id: "deep-diver", icon: "telescope", label: "Deep Diver", check: (_s: number, _pw: number, ts: number) => ts >= 1 },
  { id: "explorer", icon: "map", label: "Explorer", check: (_s: number, _pw: number, _ts: number, be: number) => be >= 10 },
  { id: "scholar", icon: "school", label: "Scholar", check: (_s: number, _pw: number, _ts: number, be: number) => be >= 33 },
  { id: "centurion", icon: "trophy", label: "Centurion", check: (s: number) => s >= 100 },
] as const;

function ProfileScreenInner() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const { isPatron } = useProStatus();
  const { user, isGuest, isAuthenticated, logout } = useAuth();
  const { showToast } = useToast();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const uid = user?.id || "guest";

  const qc = useQueryClient();
  const [streakSheetOpen, setStreakSheetOpen] = useState(false);
  const [leaderFormOpen, setLeaderFormOpen] = useState(false);
  const [leaderForm, setLeaderForm] = useState({ fullName: "", churchName: "", role: "Pastor", contactEmail: "", description: "" });
  const isLeader = user?.role === "church_leader" || user?.role === "admin";

  const { data: leaderStatus } = useQuery<{ request: { id: string; status: string } | null }>({
    queryKey: ["/api/leader-requests/my-status"],
    enabled: isAuthenticated && !isLeader && user?.role !== "admin",
  });

  const leaderRequestMutation = useMutation({
    mutationFn: async (data: typeof leaderForm) => {
      return apiRequest("POST", "/api/leader-requests", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/leader-requests/my-status"] });
      setLeaderFormOpen(false);
      setLeaderForm({ fullName: "", churchName: "", role: "Pastor", contactEmail: "", description: "" });
      showToast("Leader access request submitted! You'll be notified when reviewed.", "success");
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to submit request", "error");
    },
  });

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

  const { data: recentBookmarks } = useQuery<any[]>({
    queryKey: [`/api/bookmarks/${uid}`],
    enabled: isAuthenticated,
  });

  const { data: recentHighlights } = useQuery<any[]>({
    queryKey: [`/api/highlights/${uid}`],
    enabled: isAuthenticated,
  });

  const { data: recentNotes } = useQuery<any[]>({
    queryKey: [`/api/notes?userId=${uid}`],
    enabled: isAuthenticated,
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

  const booksExplored = growthData?.booksExplored ?? 0;
  const totalSessions = growthData?.totalSessions ?? 0;

  const initials = (() => {
    const name = user?.displayName || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || "G";
  })();

  const handleShareProfile = useCallback(async () => {
    const profileName = user?.displayName || "Guest";
    const message = `Check out my faith journey on Grace Through Faith! I'm ${profileName} with a ${streak}-day reading streak.`;
    if (Platform.OS === "web") {
      await Clipboard.setStringAsync(message);
      showToast("Profile copied to clipboard!", "success");
    } else {
      try { await Share.share({ message }); } catch {}
    }
  }, [user?.displayName, streak, showToast]);

  return (
    <>
    <ScrollView
      style={[st.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: bottomPad + 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={st.headerSection}>
        <Pressable
          onPress={() => router.push("/settings" as any)}
          hitSlop={12}
          style={{ position: "absolute", top: 0, right: 20, zIndex: 10 }}
          testID="profile-settings-gear"
        >
          <Ionicons name="settings-outline" size={24} color="#C9933A" />
        </Pressable>
        <View style={[st.avatarCircle, { backgroundColor: theme.accent }]}>
          <Text style={st.avatarInitials}>{initials}</Text>
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
            onPress={handleShareProfile}
            style={st.sharePill}
            testID="profile-share"
          >
            <Ionicons name="share-outline" size={15} color="#C9933A" />
            <Text style={[st.sharePillText, { fontFamily: "Inter_600SemiBold" }]}>Share Profile</Text>
          </Pressable>
        )}
      </View>

      <View style={st.tilesRow}>
        <Pressable
          style={({ pressed }) => [st.tile, { backgroundColor: isDark ? "#111118" : "#F5F3EE", opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.push("/library" as any)}
        >
          <View style={[st.tileIcon, { backgroundColor: "rgba(201,147,58,0.12)" }]}>
            <Ionicons name="bookmark" size={22} color="#C9933A" />
          </View>
          <Text style={[st.tileLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Saved</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [st.tile, { backgroundColor: isDark ? "#111118" : "#F5F3EE", opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.push("/prayer-journal" as any)}
        >
          <View style={[st.tileIcon, { backgroundColor: "rgba(139,92,246,0.12)" }]}>
            <Ionicons name="journal" size={22} color="#8B5CF6" />
          </View>
          <Text style={[st.tileLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Prayer</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [st.tile, { backgroundColor: isDark ? "#111118" : "#F5F3EE", opacity: pressed ? 0.85 : 1 }]}
          onPress={() => showToast("Giving features coming soon", "info")}
        >
          <View style={[st.tileIcon, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
            <Ionicons name="heart" size={22} color="#EF4444" />
          </View>
          <Text style={[st.tileLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Giving</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [st.streakCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.97 : 1 }]}
        onPress={() => setStreakSheetOpen(true)}
      >
        <View style={st.streakTop}>
          <View style={st.streakLeft}>
            <Ionicons name="flame" size={28} color="#FF6B35" />
            <View>
              <Text style={[st.streakNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{streak}</Text>
              <Text style={[st.streakSubLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>day streak</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </View>
        {weeklyData && (
          <View style={st.streakWeekRow}>
            {DAY_LABELS.map((label, i) => {
              const isToday = i === todayIdx;
              const didRead = daysRead[i];
              return (
                <View key={i} style={st.streakDayCol}>
                  <Text style={[st.streakDayLabel, { color: isToday ? theme.accent : theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                    {label}
                  </Text>
                  <View
                    style={[
                      st.streakDot,
                      didRead && { backgroundColor: theme.accent },
                      isToday && !didRead && { borderColor: theme.accent, borderWidth: 2 },
                    ]}
                  >
                    {didRead && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Pressable>

      <View style={st.badgesSection}>
        <Text style={[st.badgesTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>Badges</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.badgesScroll}>
          {BADGES.map((badge) => {
            const earned = badge.check(streak, perfectWeeks, totalSessions, booksExplored);
            return (
              <View key={badge.id} style={st.badgeItem}>
                <View style={[st.badgeCircle, earned ? { backgroundColor: "rgba(201,147,58,0.15)", borderColor: "#C9933A" } : { backgroundColor: "rgba(128,128,128,0.08)", borderColor: "rgba(128,128,128,0.2)" }]}>
                  <Ionicons name={badge.icon as any} size={24} color={earned ? "#C9933A" : theme.textMuted} />
                </View>
                <Text style={[st.badgeLabel, { color: earned ? theme.text : theme.textMuted, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
                  {badge.label}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {isAuthenticated && (
        <View style={st.activitySection}>
          <Text style={[st.sectionTitle, { fontFamily: "Lora_700Bold", color: "#FFFFFF" }]}>Activity</Text>
          {recentBookmarks?.slice(0, 3).map((b, i) => (
            <View key={`bk-${i}`} style={st.activityRow}>
              <View style={st.activityIcon}>
                <Ionicons name="bookmark" size={16} color="#C9933A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.activityLabel, { fontFamily: "Inter_500Medium" }]}>
                  Saved a verse
                </Text>
                <Text style={[st.activitySub, { fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                  {b.label || b.verseId}
                </Text>
              </View>
            </View>
          ))}
          {recentHighlights?.slice(0, 3).map((h, i) => (
            <View key={`hl-${i}`} style={st.activityRow}>
              <View style={[st.activityIcon, { backgroundColor: "rgba(234,179,8,0.15)" }]}>
                <Ionicons name="color-wand" size={16} color="#EAB308" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.activityLabel, { fontFamily: "Inter_500Medium" }]}>
                  Highlighted a verse
                </Text>
                <Text style={[st.activitySub, { fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                  {h.bookName && h.chapter && h.verse
                    ? `${h.bookName} ${h.chapter}:${h.verse}`
                    : h.verseId}
                </Text>
              </View>
            </View>
          ))}
          {recentNotes?.slice(0, 3).map((n, i) => (
            <View key={`nt-${i}`} style={st.activityRow}>
              <View style={[st.activityIcon, { backgroundColor: "rgba(99,102,241,0.15)" }]}>
                <Ionicons name="create-outline" size={16} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.activityLabel, { fontFamily: "Inter_500Medium" }]}>
                  Added a note
                </Text>
                <Text style={[st.activitySub, { fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                  {n.content}
                </Text>
              </View>
            </View>
          ))}
          {!recentBookmarks?.length && !recentHighlights?.length && !recentNotes?.length && (
            <Text style={[st.activityEmpty, { fontFamily: "Inter_400Regular" }]}>
              Your reading activity will appear here.
            </Text>
          )}
        </View>
      )}

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

      {isAuthenticated && user?.role === "church_leader_pending" && (
        <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: "#8B5CF615", borderWidth: 1, borderColor: "#8B5CF640", borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#8B5CF620", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="shield-checkmark" size={20} color="#8B5CF6" />
            </View>
            <Text style={{ color: theme.text, fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 }}>Complete Your Leader Setup</Text>
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 14, lineHeight: 20 }}>
            You registered as a church leader. Submit a request for admin verification, or create your church organization now.
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => setLeaderFormOpen(true)}
              style={{ flex: 1, backgroundColor: "#8B5CF6", borderRadius: 10, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
            >
              <Ionicons name="document-text-outline" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Submit Request</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/org-onboarding" as any)}
              style={{ flex: 1, backgroundColor: "#C9933A", borderRadius: 10, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
            >
              <Ionicons name="add-circle-outline" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Set Up Church</Text>
            </Pressable>
          </View>
        </View>
      )}

      {isAuthenticated && user?.role === "church_leader" && !user?.organizationId && (
        <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: "#C9933A15", borderWidth: 1, borderColor: "#C9933A40", borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#C9933A20", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="home" size={20} color="#C9933A" />
            </View>
            <Text style={{ color: theme.text, fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 }}>Set Up Your Church</Text>
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 14, lineHeight: 20 }}>
            Your leader access is approved! Create your church organization to manage members and share a join code with your congregation.
          </Text>
          <Pressable
            onPress={() => router.push("/org-onboarding" as any)}
            style={{ backgroundColor: "#C9933A", borderRadius: 10, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Create Your Church</Text>
          </Pressable>
        </View>
      )}

      {isAuthenticated && (user?.role === "admin" || user?.role === "editor" || user?.role === "church_leader") && (
        <>
          <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />
          <View style={st.sectionPad}>
            <ListItem
              icon="construct"
              iconColor="#EF4444"
              title="Admin Dashboard"
              onPress={() => router.push("/admin-review" as any)}
              style={{ marginBottom: 6 }}
            />
            <ListItem
              icon="business-outline"
              iconColor="#3B82F6"
              title="Conference Portal"
              subtitle="Manage church licensing"
              onPress={() => router.push("/conference-portal" as any)}
              style={{ marginBottom: 6 }}
            />
          </View>
        </>
      )}

      {isAuthenticated && !isLeader && user?.role !== "admin" && user?.role !== "editor" && (
        <>
          <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />
          <View style={st.sectionPad}>
            <ListItem
              icon={leaderStatus?.request?.status === "pending" ? "time-outline" : "shield-checkmark-outline"}
              iconColor={leaderStatus?.request?.status === "pending" ? "#F59E0B" : "#8B5CF6"}
              title={leaderStatus?.request?.status === "pending" ? "Leader Access (Pending)" : "Request Leader Access"}
              onPress={() => {
                if (leaderStatus?.request?.status === "pending") {
                  showToast("Your church leader access is being reviewed. You'll be notified when approved.", "info");
                  return;
                }
                setLeaderFormOpen(true);
              }}
              style={{ marginBottom: 6 }}
            />
          </View>
        </>
      )}

      {isAuthenticated && isLeader && (
        <>
          <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />
          <View style={st.sectionPad}>
            <Text style={{ color: theme.textSecondary, fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              Leader Tools
            </Text>
            <ListItem
              icon="megaphone-outline"
              iconColor="#8B5CF6"
              title="Broadcast Announcements"
              onPress={() => router.push("/leader-broadcast" as any)}
              style={{ marginBottom: 6 }}
            />
            <ListItem
              icon="people-outline"
              iconColor="#3B82F6"
              title="Church Member Analytics"
              onPress={() => router.push("/leader-analytics" as any)}
              style={{ marginBottom: 6 }}
            />
          </View>
        </>
      )}

    </ScrollView>

    <Modal visible={streakSheetOpen} animationType="slide" transparent>
      <Pressable style={st.sheetOverlay} onPress={() => setStreakSheetOpen(false)}>
        <View style={{ flex: 1 }} />
        <Pressable style={[st.sheetContent, { backgroundColor: theme.backgroundCard, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 }]}>
          <View style={st.sheetHandle} />
          <View style={st.sheetHeaderRow}>
            <Text style={[st.sheetTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>Your Streak</Text>
            <Pressable onPress={() => setStreakSheetOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>
          <View style={st.sheetStatsRow}>
            <View style={st.sheetStatItem}>
              <Ionicons name="flame" size={28} color="#FF6B35" />
              <Text style={[st.sheetStatNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{streak}</Text>
              <Text style={[st.sheetStatLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Current</Text>
            </View>
            <View style={st.sheetStatItem}>
              <Ionicons name="trophy" size={28} color={theme.accent} />
              <Text style={[st.sheetStatNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{longestStreak}</Text>
              <Text style={[st.sheetStatLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Longest</Text>
            </View>
            <View style={st.sheetStatItem}>
              <Ionicons name="star" size={28} color="#E8456B" />
              <Text style={[st.sheetStatNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{perfectWeeks}</Text>
              <Text style={[st.sheetStatLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Perfect Weeks</Text>
            </View>
          </View>
          {weeklyData && (
            <>
              <Text style={[st.sheetWeekTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>This Week</Text>
              <View style={st.sheetWeekRow}>
                {DAY_LABELS.map((label, i) => {
                  const isToday = i === todayIdx;
                  const didRead = daysRead[i];
                  return (
                    <View key={i} style={{ alignItems: "center", gap: 8 }}>
                      <Text style={{ color: isToday ? theme.accent : theme.textMuted, fontSize: 13, fontFamily: "Inter_500Medium" }}>{label}</Text>
                      <View style={[st.streakDot, didRead && { backgroundColor: theme.accent }, isToday && !didRead && { borderColor: theme.accent, borderWidth: 2 }]}>
                        {didRead && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                    </View>
                  );
                })}
              </View>
              <Text style={[st.sheetWeekSummary, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {daysRead.filter(Boolean).length} of 7 days completed
              </Text>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>

    <Modal visible={leaderFormOpen} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: theme.backgroundCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20, maxHeight: "90%" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ color: theme.text, fontSize: 20, fontFamily: "Inter_700Bold" }}>Request Leader Access</Text>
            <Pressable onPress={() => setLeaderFormOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Full Name</Text>
            <TextInput
              style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 12, borderWidth: 1, borderColor: theme.border }}
              value={leaderForm.fullName}
              onChangeText={(v) => setLeaderForm(f => ({ ...f, fullName: v }))}
              placeholder="Your full name"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Church Name</Text>
            <TextInput
              style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 12, borderWidth: 1, borderColor: theme.border }}
              value={leaderForm.churchName}
              onChangeText={(v) => setLeaderForm(f => ({ ...f, churchName: v }))}
              placeholder="Your church name"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Role</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {["Pastor", "Elder", "Deacon", "Ministry Leader"].map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setLeaderForm(f => ({ ...f, role: r }))}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: leaderForm.role === r ? "#8B5CF6" : theme.border, backgroundColor: leaderForm.role === r ? "#8B5CF620" : theme.background }}
                >
                  <Text style={{ color: leaderForm.role === r ? "#8B5CF6" : theme.textSecondary, fontSize: 14, fontFamily: "Inter_500Medium" }}>{r}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Contact Email</Text>
            <TextInput
              style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 12, borderWidth: 1, borderColor: theme.border }}
              value={leaderForm.contactEmail}
              onChangeText={(v) => setLeaderForm(f => ({ ...f, contactEmail: v }))}
              placeholder="your@email.com"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Description (optional)</Text>
            <TextInput
              style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 16, borderWidth: 1, borderColor: theme.border, minHeight: 80, textAlignVertical: "top" }}
              value={leaderForm.description}
              onChangeText={(v) => setLeaderForm(f => ({ ...f, description: v }))}
              placeholder="Tell us about your ministry..."
              placeholderTextColor={theme.textMuted}
              multiline
            />
            <Pressable
              onPress={() => {
                if (!leaderForm.fullName || !leaderForm.churchName || !leaderForm.contactEmail) {
                  showToast("Please fill in all required fields", "error");
                  return;
                }
                leaderRequestMutation.mutate(leaderForm);
              }}
              disabled={leaderRequestMutation.isPending}
              style={{ backgroundColor: "#8B5CF6", borderRadius: 12, padding: 14, alignItems: "center", opacity: leaderRequestMutation.isPending ? 0.6 : 1 }}
            >
              {leaderRequestMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" }}>Submit Request</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    marginBottom: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarInitials: {
    fontSize: 28,
    fontFamily: "Lora_700Bold",
    color: "#fff",
    letterSpacing: 1,
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
  sharePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.3)",
    backgroundColor: "rgba(201,147,58,0.08)",
  },
  sharePillText: {
    fontSize: 13,
    color: "#C9933A",
  },
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
  tilesRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tile: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 10,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    fontSize: 13,
  },
  streakCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  streakTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  streakLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  streakNum: {
    fontSize: 26,
    letterSpacing: -0.5,
  },
  streakSubLabel: {
    fontSize: 12,
    marginTop: -2,
  },
  streakWeekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.15)",
  },
  streakDayCol: {
    alignItems: "center",
    gap: 8,
  },
  streakDayLabel: { fontSize: 11 },
  streakDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(128,128,128,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgesSection: {
    marginBottom: 20,
  },
  badgesTitle: {
    fontSize: 18,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  badgesScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  badgeItem: {
    alignItems: "center",
    width: 72,
    gap: 8,
  },
  badgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  badgeLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  activitySection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "transparent",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
    gap: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(201,147,58,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  activityLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 2,
  },
  activitySub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  activityEmpty: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheetContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 20,
  },
  sheetStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 28,
  },
  sheetStatItem: {
    alignItems: "center",
    gap: 6,
  },
  sheetStatNum: {
    fontSize: 28,
  },
  sheetStatLabel: {
    fontSize: 12,
  },
  sheetWeekTitle: {
    fontSize: 16,
    marginBottom: 14,
  },
  sheetWeekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  sheetWeekSummary: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  sectionPad: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 21, marginBottom: 16, letterSpacing: -0.1 },
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
