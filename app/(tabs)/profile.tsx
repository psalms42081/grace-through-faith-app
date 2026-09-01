import React, { Component, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { SWEEP_LIGHT } from "@/constants/light-sweep";
import { ENABLE_ORG_TOOLS } from "@/lib/feature-flags";
import ListItem from "@/components/ui/ListItem";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useProStatus } from "@/contexts/ProContext";
import { apiRequest } from "@/lib/query-client";
import { withDeviceTimeZone } from "@/lib/device-time-zone";

const C = {
  surface: PathB.surface,
  card: PathB.surfaceCard,
  ink: PathB.ink,
  inkMuted: HV2.inkMutedText,
  coral: PathB.coral,
  coralInk: PathB.coralInk,
  pill: SWEEP_LIGHT.backgroundSecondary,
  border: SWEEP_LIGHT.border,
};

class ProfileErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: C.surface }}>
          <Ionicons name="alert-circle-outline" size={48} color={C.coral} />
          <Text style={{ color: C.ink, fontSize: 18, fontWeight: "700", marginTop: 16, textAlign: "center" }}>
            Something went wrong
          </Text>
          <Text style={{ color: C.inkMuted, fontSize: 13, marginTop: 8, textAlign: "center" }}>
            {this.state.error.message}
          </Text>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.coral, borderRadius: 10 }}
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

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

type ActivityKind = "bookmark" | "highlight" | "note";

type ActivityItem = {
  key: string;
  kind: ActivityKind;
  label: string;
  sub: string;
  at: number;
};

function activityTimestamp(value: unknown): number {
  if (!value) return 0;
  const ms = new Date(value as string).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function ProfileScreenInner() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = SWEEP_LIGHT;

  const { isPatron } = useProStatus();
  const { user, isGuest, isAuthenticated } = useAuth();
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
    enabled: ENABLE_ORG_TOOLS && isAuthenticated && !isLeader && user?.role !== "admin",
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
    queryKey: [withDeviceTimeZone(`/api/reading-streaks/weekly?userId=${uid}`)],
  });

  const { data: myOrgData, isLoading: orgLoading } = useQuery<{
    organization: { id: string; name: string; type: string; joinCode: string; memberCount: number } | null;
    role: string | null;
  }>({
    queryKey: ["/api/organizations/my-org"],
    enabled: ENABLE_ORG_TOOLS && isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: myChurchData, isLoading: myChurchLoading } = useQuery<{
    church: {
      id: string;
      name: string;
      address: string;
      city: string;
      state: string | null;
      country: string;
    } | null;
  }>({
    queryKey: ["/api/me/church"],
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const claimedChurch = myChurchData?.church ?? null;

  const isConference = myOrgData?.organization?.type === "conference";
  const isPastorOrElder = myOrgData?.role === "pastor" || myOrgData?.role === "elder";

  const { data: confChurches, refetch: refetchChurches } = useQuery<{
    id: string; name: string; joinCode: string; memberCount: number;
  }[]>({
    queryKey: [`/api/organizations/${myOrgData?.organization?.id}/churches`],
    enabled: ENABLE_ORG_TOOLS && isAuthenticated && isConference && !!myOrgData?.organization?.id,
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

  const initials = (() => {
    const name = user?.displayName || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || "G";
  })();

  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    (recentBookmarks ?? []).forEach((b, i) => {
      items.push({
        key: `bk-${b.id ?? i}`,
        kind: "bookmark",
        label: "Saved a verse",
        sub: b.label || (b.bookName && b.chapter && b.verse ? `${b.bookName} ${b.chapter}:${b.verse}` : b.verseId),
        at: activityTimestamp(b.createdAt),
      });
    });
    (recentHighlights ?? []).forEach((h, i) => {
      items.push({
        key: `hl-${h.id ?? i}`,
        kind: "highlight",
        label: "Highlighted a verse",
        sub: h.bookName && h.chapter && h.verse
          ? `${h.bookName} ${h.chapter}:${h.verse}`
          : h.verseId,
        at: activityTimestamp(h.createdAt),
      });
    });
    (recentNotes ?? []).forEach((n, i) => {
      items.push({
        key: `nt-${n.id ?? i}`,
        kind: "note",
        label: "Added a note",
        sub: n.content,
        at: activityTimestamp(n.createdAt ?? n.updatedAt),
      });
    });
    return items.sort((a, b) => b.at - a.at).slice(0, 5);
  }, [recentBookmarks, recentHighlights, recentNotes]);

  return (
    <>
    <ScrollView
      style={[st.container, { backgroundColor: C.surface }]}
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
          <Ionicons name="settings-outline" size={24} color={C.coral} />
        </Pressable>
        <View style={st.avatarCircle}>
          <Text style={st.avatarInitials}>{initials}</Text>
        </View>
        <Text style={[st.userName, { color: C.ink, fontFamily: "Lora_700Bold" }]}>
          {isAuthenticated ? (user?.displayName || "User") : "Guest"}
        </Text>
        <Text style={[st.userSub, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]}>
          {isAuthenticated ? (user?.email || "Informed Ministries") : "Informed Ministries"}
        </Text>
        {isPatron && (
          <View style={st.patronBadge}>
            <Ionicons name="shield-checkmark" size={14} color={C.inkMuted} />
            <Text style={st.patronBadgeText}>{t("profile.missionPartner")}</Text>
          </View>
        )}
        {isGuest ? (
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={st.authBtn}
            testID="profile-sign-in"
          >
            <Ionicons name="log-in-outline" size={16} color="#fff" />
            <Text style={[st.authBtnText, { fontFamily: "Inter_600SemiBold" }]}>{t("profile.signIn")}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={st.tilesRow}>
        <Pressable
          style={({ pressed }) => [st.tile, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.push("/library" as any)}
        >
          <View style={[st.tileIcon, { backgroundColor: PathB.coral + "14" }]}>
            <Ionicons name="bookmark" size={22} color={C.coral} />
          </View>
          <Text style={[st.tileLabel, { color: C.ink, fontFamily: "Inter_600SemiBold" }]}>Saved</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [st.tile, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.push("/prayer-journal" as any)}
        >
          <View style={[st.tileIcon, { backgroundColor: C.pill }]}>
            <Ionicons name="journal" size={22} color={C.inkMuted} />
          </View>
          <Text style={[st.tileLabel, { color: C.ink, fontFamily: "Inter_600SemiBold" }]}>Prayer</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [st.tile, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => showToast("Giving features coming soon", "info")}
        >
          <View style={[st.tileIcon, { backgroundColor: C.pill }]}>
            <Ionicons name="heart" size={22} color={C.inkMuted} />
          </View>
          <Text style={[st.tileLabel, { color: C.ink, fontFamily: "Inter_600SemiBold" }]}>Giving</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [st.streakCard, { opacity: pressed ? 0.97 : 1 }]}
        onPress={() => setStreakSheetOpen(true)}
      >
        <View style={st.streakTop}>
          <View style={st.streakLeft}>
            <Ionicons name="flame" size={28} color={C.coral} />
            <View>
              <Text style={[st.streakNum, { color: C.ink, fontFamily: "Inter_700Bold" }]}>{streak}</Text>
              <Text style={[st.streakSubLabel, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]}>day streak</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.inkMuted} />
        </View>
        {weeklyData && (
          <View style={st.streakWeekRow}>
            {DAY_LABELS.map((label, i) => {
              const isToday = i === todayIdx;
              const didRead = daysRead[i];
              return (
                <View key={i} style={st.streakDayCol}>
                  <Text style={[st.streakDayLabel, { color: isToday ? C.coralInk : C.inkMuted, fontFamily: "Inter_500Medium" }]}>
                    {label}
                  </Text>
                  <View
                    style={[
                      st.streakDot,
                      didRead && { backgroundColor: C.coral },
                      isToday && !didRead && { borderColor: C.coral, borderWidth: 2 },
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

      {isAuthenticated && (
        <View style={st.sectionPad} testID="profile-my-church-section">
          <Text style={[st.sectionTitle, { color: C.ink, fontFamily: "Lora_700Bold" }]}>
            My Church & Groups
          </Text>
          {myChurchLoading ? (
            <ActivityIndicator color={C.coral} style={{ marginVertical: 16 }} />
          ) : claimedChurch ? (
            <View
              style={st.orgCard}
              testID="profile-my-church-set"
            >
              <Pressable
                onPress={() => router.push(`/church/${claimedChurch.id}` as any)}
                style={st.orgHeader}
              >
                <Ionicons name="business-outline" size={24} color={C.coral} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[st.orgName, { color: C.ink }]}>{claimedChurch.name}</Text>
                  <Text style={[st.orgMeta, { color: C.inkMuted }]}>
                    {claimedChurch.city}{claimedChurch.state ? `, ${claimedChurch.state}` : ""}, {claimedChurch.country}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.inkMuted} />
              </Pressable>
              <Pressable
                style={[st.orgJoinBtn, { marginTop: 14 }]}
                onPress={() => router.push("/church-connect" as any)}
              >
                <Ionicons name="search-outline" size={18} color={C.coralInk} />
                <Text style={st.orgJoinBtnText}>Find a different church</Text>
              </Pressable>
            </View>
          ) : (
            <View
              style={st.orgCard}
              testID="profile-my-church-empty"
            >
              <Text style={[st.orgEmptyText, { color: C.inkMuted }]}>
                You haven't set a church yet.
              </Text>
              <Pressable
                style={st.orgJoinBtn}
                onPress={() => router.push("/church-connect" as any)}
              >
                <Ionicons name="search-outline" size={18} color={C.coralInk} />
                <Text style={st.orgJoinBtnText}>Find a church</Text>
              </Pressable>
            </View>
          )}
          <View
            style={[st.orgCard, { marginTop: 12 }]}
            testID="profile-groups-placeholder"
          >
            <View style={st.orgHeader}>
              <Ionicons name="people-outline" size={24} color={C.inkMuted} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[st.orgName, { color: C.ink }]}>Groups</Text>
                <Text style={[st.orgMeta, { color: C.inkMuted }]}>
                  Small groups coming soon
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {isAuthenticated && (
        <View style={st.activitySection}>
          <Text style={[st.sectionTitle, { fontFamily: "Lora_700Bold", color: C.ink }]}>Activity</Text>
          {activityItems.map((item) => (
            <View key={item.key} style={st.activityRow}>
              <View style={[
                st.activityIcon,
                item.kind === "highlight" && { backgroundColor: C.pill },
                item.kind === "note" && { backgroundColor: C.pill },
              ]}>
                <Ionicons
                  name={item.kind === "bookmark" ? "bookmark" : item.kind === "highlight" ? "color-wand" : "create-outline"}
                  size={16}
                  color={item.kind === "bookmark" ? C.coral : C.inkMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.activityLabel, { fontFamily: "Inter_500Medium" }]}>
                  {item.label}
                </Text>
                <Text style={[st.activitySub, { fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                  {item.sub}
                </Text>
              </View>
            </View>
          ))}
          {activityItems.length === 0 && (
            <Text style={[st.activityEmpty, { fontFamily: "Inter_400Regular" }]}>
              Your reading activity will appear here.
            </Text>
          )}
        </View>
      )}

      {ENABLE_ORG_TOOLS && (<>
      {isAuthenticated && !orgLoading && (myOrgData?.organization || isLeader) && (
        <View style={st.sectionPad}>
          <Text style={[st.sectionTitle, { color: C.ink, fontFamily: "Lora_700Bold" }]}>
            {isConference ? "My Conference" : "Church organization"}
          </Text>
          {myOrgData?.organization ? (
            <>
              <View style={st.orgCard}>
                <View style={st.orgHeader}>
                  <Ionicons
                    name={isConference ? "globe-outline" : "home-outline"}
                    size={24}
                    color={C.coral}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[st.orgName, { color: C.ink }]}>{myOrgData.organization.name}</Text>
                    <Text style={[st.orgMeta, { color: C.inkMuted }]}>
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
                      <Text style={[st.joinCodeLabel, { color: C.inkMuted }]}>
                        {isConference ? "Conference Join Code" : "Join Code"}
                      </Text>
                      <Text style={[st.joinCodeValue, { color: C.ink }]}>{myOrgData.organization.joinCode}</Text>
                    </View>
                    <Ionicons
                      name={codeCopied ? "checkmark-circle" : "copy-outline"}
                      size={20}
                      color={codeCopied ? theme.success : C.coral}
                    />
                  </Pressable>
                )}
                <ListItem
                  icon="people"
                  iconColor={C.coral}
                  title={isConference ? "View Conference Members" : "View Members"}
                  onPress={() => router.push(`/org-members?orgId=${myOrgData.organization!.id}` as any)}
                  style={{ marginTop: 8 }}
                />
              </View>

              {isConference && (
                <View style={{ marginTop: 20 }}>
                  <View style={st.confChurchesHeader}>
                    <Text style={[st.confChurchesTitle, { color: C.ink }]}>Congregations</Text>
                    {isPastorOrElder && (
                      <Pressable onPress={() => setShowAddChurch(!showAddChurch)}>
                        <Ionicons name={showAddChurch ? "close-circle-outline" : "add-circle-outline"} size={24} color={C.coral} />
                      </Pressable>
                    )}
                  </View>

                  {showAddChurch && (
                    <View style={st.addChurchRow}>
                      <TextInput
                        style={[st.addChurchInput, { color: C.ink, borderColor: C.border }]}
                        placeholder="New church name"
                        placeholderTextColor={C.inkMuted}
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
                      <View key={church.id} style={st.confChurchCard}>
                        <View style={st.confChurchRow}>
                          <Ionicons name="home-outline" size={20} color={C.coral} />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[st.confChurchName, { color: C.ink }]}>{church.name}</Text>
                            <Text style={[st.confChurchMeta, { color: C.inkMuted }]}>
                              {church.memberCount} member{church.memberCount !== 1 ? "s" : ""}
                            </Text>
                          </View>
                        </View>
                        {isPastorOrElder && church.joinCode && (
                          <Pressable
                            style={st.confChurchCodeBtn}
                            onPress={() => handleCopyCode(church.joinCode)}
                          >
                            <Ionicons name="key-outline" size={14} color={C.coralInk} />
                            <Text style={st.confChurchCodeText}>{church.joinCode}</Text>
                            <Ionicons name="copy-outline" size={14} color={C.coralInk} />
                          </Pressable>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={[st.confChurchesEmpty, { color: C.inkMuted }]}>
                      No churches added yet. Tap + to add one.
                    </Text>
                  )}
                </View>
              )}
            </>
          ) : isLeader ? (
            <View style={st.orgCard}>
              <Text style={[st.orgEmptyText, { color: C.inkMuted }]}>
                No church organization yet. Join with a code or register one for members and join codes — this is separate from My Church above.
              </Text>
              <Pressable
                style={st.orgJoinBtn}
                onPress={() => router.push("/org-onboarding" as any)}
              >
                <Ionicons name="add-circle-outline" size={18} color={C.coralInk} />
                <Text style={st.orgJoinBtnText}>Join or register an organization</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}

      {isAuthenticated && user?.role === "church_leader_pending" && (
        <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: C.pill, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: PathB.coral + "20", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="shield-checkmark" size={20} color={C.coral} />
            </View>
            <Text style={{ color: C.ink, fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 }}>Complete Your Leader Setup</Text>
          </View>
          <Text style={{ color: C.inkMuted, fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 14, lineHeight: 20 }}>
            You registered as a church leader. Submit a request for admin verification, or create your church organization now.
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => setLeaderFormOpen(true)}
              style={{ flex: 1, backgroundColor: C.coral, borderRadius: 10, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
            >
              <Ionicons name="document-text-outline" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Submit Request</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/org-onboarding" as any)}
              style={{ flex: 1, backgroundColor: C.ink, borderRadius: 10, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
            >
              <Ionicons name="add-circle-outline" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Set Up Org</Text>
            </Pressable>
          </View>
        </View>
      )}

      {isAuthenticated && user?.role === "church_leader" && !user?.organizationId && (
        <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: C.pill, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: PathB.coral + "20", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="home" size={20} color={C.coral} />
            </View>
            <Text style={{ color: C.ink, fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 }}>Set Up Your Organization</Text>
          </View>
          <Text style={{ color: C.inkMuted, fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 14, lineHeight: 20 }}>
            Your leader access is approved! Create your church organization to manage members and share a join code with your congregation.
          </Text>
          <Pressable
            onPress={() => router.push("/org-onboarding" as any)}
            style={{ backgroundColor: C.coral, borderRadius: 10, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Create Organization</Text>
          </Pressable>
        </View>
      )}

      {isAuthenticated && (user?.role === "admin" || user?.role === "editor" || user?.role === "church_leader") && (
        <>
          <View style={[st.sectionDivider, { backgroundColor: theme.divider }]} />
          <View style={st.sectionPad}>
            <ListItem
              icon="construct"
              iconColor={C.coral}
              title="Admin Dashboard"
              onPress={() => router.push("/admin-review" as any)}
              style={{ marginBottom: 6 }}
            />
            <ListItem
              icon="business-outline"
              iconColor={C.inkMuted}
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
              iconColor={C.coral}
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
            <Text style={{ color: C.inkMuted, fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              Leader Tools
            </Text>
            <ListItem
              icon="megaphone-outline"
              iconColor={C.coral}
              title="Broadcast Announcements"
              onPress={() => router.push("/leader-broadcast" as any)}
              style={{ marginBottom: 6 }}
            />
            <ListItem
              icon="people-outline"
              iconColor={C.inkMuted}
              title="Church Member Analytics"
              onPress={() => router.push("/leader-analytics" as any)}
              style={{ marginBottom: 6 }}
            />
          </View>
        </>
      )}
      </>)}

    </ScrollView>

    <Modal visible={streakSheetOpen} animationType="slide" transparent>
      <Pressable style={st.sheetOverlay} onPress={() => setStreakSheetOpen(false)}>
        <View style={{ flex: 1 }} />
        <Pressable style={[st.sheetContent, { backgroundColor: C.card, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 }]}>
          <View style={st.sheetHandle} />
          <View style={st.sheetHeaderRow}>
            <Text style={[st.sheetTitle, { color: C.ink, fontFamily: "Lora_700Bold" }]}>Your Streak</Text>
            <Pressable onPress={() => setStreakSheetOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={C.inkMuted} />
            </Pressable>
          </View>
          <View style={st.sheetStatsRow}>
            <View style={st.sheetStatItem}>
              <Ionicons name="flame" size={28} color={C.coral} />
              <Text style={[st.sheetStatNum, { color: C.ink, fontFamily: "Inter_700Bold" }]}>{streak}</Text>
              <Text style={[st.sheetStatLabel, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]}>Current</Text>
            </View>
            <View style={st.sheetStatItem}>
              <Ionicons name="trophy" size={28} color={C.coral} />
              <Text style={[st.sheetStatNum, { color: C.ink, fontFamily: "Inter_700Bold" }]}>{longestStreak}</Text>
              <Text style={[st.sheetStatLabel, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]}>Longest</Text>
            </View>
            <View style={st.sheetStatItem}>
              <Ionicons name="star" size={28} color={C.coral} />
              <Text style={[st.sheetStatNum, { color: C.ink, fontFamily: "Inter_700Bold" }]}>{perfectWeeks}</Text>
              <Text style={[st.sheetStatLabel, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]}>Perfect Weeks</Text>
            </View>
          </View>
          {weeklyData && (
            <>
              <Text style={[st.sheetWeekTitle, { color: C.ink, fontFamily: "Inter_600SemiBold" }]}>This Week</Text>
              <View style={st.sheetWeekRow}>
                {DAY_LABELS.map((label, i) => {
                  const isToday = i === todayIdx;
                  const didRead = daysRead[i];
                  return (
                    <View key={i} style={{ alignItems: "center", gap: 8 }}>
                      <Text style={{ color: isToday ? C.coralInk : C.inkMuted, fontSize: 13, fontFamily: "Inter_500Medium" }}>{label}</Text>
                      <View style={[st.streakDot, didRead && { backgroundColor: C.coral }, isToday && !didRead && { borderColor: C.coral, borderWidth: 2 }]}>
                        {didRead && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                    </View>
                  );
                })}
              </View>
              <Text style={[st.sheetWeekSummary, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]}>
                {daysRead.filter(Boolean).length} of 7 days completed
              </Text>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>

    {ENABLE_ORG_TOOLS && (
    <Modal visible={leaderFormOpen} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20, maxHeight: "90%" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ color: C.ink, fontSize: 20, fontFamily: "Inter_700Bold" }}>Request Leader Access</Text>
            <Pressable onPress={() => setLeaderFormOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={C.inkMuted} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={{ color: C.inkMuted, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Full Name</Text>
            <TextInput
              style={{ backgroundColor: C.surface, color: C.ink, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 12, borderWidth: 1, borderColor: C.border }}
              value={leaderForm.fullName}
              onChangeText={(v) => setLeaderForm(f => ({ ...f, fullName: v }))}
              placeholder="Your full name"
              placeholderTextColor={C.inkMuted}
            />
            <Text style={{ color: C.inkMuted, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Church Name</Text>
            <TextInput
              style={{ backgroundColor: C.surface, color: C.ink, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 12, borderWidth: 1, borderColor: C.border }}
              value={leaderForm.churchName}
              onChangeText={(v) => setLeaderForm(f => ({ ...f, churchName: v }))}
              placeholder="Your church name"
              placeholderTextColor={C.inkMuted}
            />
            <Text style={{ color: C.inkMuted, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Role</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {["Pastor", "Elder", "Deacon", "Ministry Leader"].map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setLeaderForm(f => ({ ...f, role: r }))}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: leaderForm.role === r ? C.coral : C.border, backgroundColor: leaderForm.role === r ? PathB.coral + "20" : C.surface }}
                >
                  <Text style={{ color: leaderForm.role === r ? C.coralInk : C.inkMuted, fontSize: 14, fontFamily: "Inter_500Medium" }}>{r}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ color: C.inkMuted, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Contact Email</Text>
            <TextInput
              style={{ backgroundColor: C.surface, color: C.ink, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 12, borderWidth: 1, borderColor: C.border }}
              value={leaderForm.contactEmail}
              onChangeText={(v) => setLeaderForm(f => ({ ...f, contactEmail: v }))}
              placeholder="your@email.com"
              placeholderTextColor={C.inkMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={{ color: C.inkMuted, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Description (optional)</Text>
            <TextInput
              style={{ backgroundColor: C.surface, color: C.ink, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 16, borderWidth: 1, borderColor: C.border, minHeight: 80, textAlignVertical: "top" }}
              value={leaderForm.description}
              onChangeText={(v) => setLeaderForm(f => ({ ...f, description: v }))}
              placeholder="Tell us about your ministry..."
              placeholderTextColor={C.inkMuted}
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
              style={{ backgroundColor: C.coral, borderRadius: 12, padding: 14, alignItems: "center", opacity: leaderRequestMutation.isPending ? 0.6 : 1 }}
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
    )}
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
    backgroundColor: C.pill,
    borderWidth: 1,
    borderColor: C.border,
  },
  avatarInitials: {
    fontSize: 28,
    fontFamily: "Lora_700Bold",
    color: C.ink,
    letterSpacing: 1,
  },
  userName: { fontSize: 26, marginBottom: 4, letterSpacing: -0.2 },
  userSub: { fontSize: 14, lineHeight: 22 },
  patronBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.pill,
  },
  patronBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: C.inkMuted,
  },
  authBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: C.coral,
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
    backgroundColor: C.card,
    ...HV2.rowShadow,
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
    backgroundColor: C.card,
    ...HV2.cardShadow,
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
    borderTopColor: C.border,
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
    backgroundColor: C.pill,
    alignItems: "center",
    justifyContent: "center",
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
    borderBottomColor: C.border,
    gap: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PathB.coral + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  activityLabel: {
    color: C.ink,
    fontSize: 14,
    marginBottom: 2,
  },
  activitySub: {
    color: C.inkMuted,
    fontSize: 12,
  },
  activityEmpty: {
    color: C.inkMuted,
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
    backgroundColor: C.border,
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
    borderColor: C.border,
    backgroundColor: C.card,
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
    borderTopColor: C.border,
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
    borderColor: C.coral,
  },
  orgJoinBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.coralInk,
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
    borderColor: C.border,
    backgroundColor: C.card,
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
    backgroundColor: C.coral,
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
    borderColor: C.border,
    backgroundColor: C.card,
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
    backgroundColor: C.pill,
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
    color: C.coralInk,
    letterSpacing: 1,
  },
  confChurchesEmpty: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 20,
  },
});
