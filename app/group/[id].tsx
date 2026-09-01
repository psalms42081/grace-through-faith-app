import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
  Share,
  Modal,
  LayoutChangeEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import { safeGoBack } from "@/lib/safe-back";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import PrayerWall from "@/components/PrayerWall";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { displayInitials } from "@/lib/user-initials";

interface GroupMember {
  id: string;
  userId: string;
  displayName: string | null;
  role: string;
  joinedAt: string;
}

interface TrackInfo {
  id: string;
  title: string;
  icon: string;
  color: string;
  category: string;
}

interface TrackProgress {
  track: TrackInfo;
  enrolledCount: number;
  totalMembers: number;
  averagePercent: number;
}

interface GroupDetail {
  group: {
    id: string;
    name: string;
    description: string | null;
    joinCode: string;
    memberCount: number;
    createdBy: string;
    groupType: string;
    isPublic: boolean;
    assignedTrackId: string | null;
    groupPlanId: string | null;
    createdAt: string;
  };
  members: GroupMember[];
  trackProgress: TrackProgress | null;
}

interface DevotionalPlanInfo {
  id: string;
  title: string;
  description: string | null;
  totalDays: number;
  theme: string | null;
}

interface MemberPlanProgress {
  userId: string;
  displayName: string;
  role: string;
  enrolled: boolean;
  completedDays: number;
  totalDays: number;
  percent: number;
}

interface GroupPlanProgress {
  plan: DevotionalPlanInfo | null;
  members: MemberPlanProgress[];
  enrolledCount: number;
  totalMembers: number;
  averagePercent: number;
}

interface AvailablePlan {
  id: string;
  title: string;
  description: string | null;
  totalDays: number;
  theme: string | null;
}

interface Discussion {
  id: string;
  userId: string;
  authorName: string | null;
  content: string;
  isPinned: boolean;
  replyCount: number;
  createdAt: string;
}

interface DiscussionReply {
  id: string;
  userId: string;
  authorName: string | null;
  content: string;
  createdAt: string;
}

interface AvailableTrack {
  id: string;
  title: string;
  icon: string;
  color: string;
  category: string;
}

type GroupTab = "discussion" | "prayer" | "study" | "devotional" | "live";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeTab, setActiveTab] = useState<GroupTab>("discussion");
  const [codeCopied, setCodeCopied] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [expandedDiscussion, setExpandedDiscussion] = useState<string | null>(null);
  const [manageMember, setManageMember] = useState<GroupMember | null>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const [showTabFade, setShowTabFade] = useState(true);

  const TABS = [
    { key: "discussion" as const, icon: "chatbubbles" as const, label: "Discussion" },
    { key: "prayer" as const, icon: "heart" as const, label: "Prayer" },
    { key: "devotional" as const, icon: "flame" as const, label: "Devotional" },
    { key: "study" as const, icon: "book" as const, label: "Study" },
    { key: "live" as const, icon: "videocam" as const, label: "Live" },
  ];

  useEffect(() => {
    const layout = tabLayouts.current[activeTab];
    if (layout && tabScrollRef.current) {
      const scrollTo = Math.max(0, layout.x - 16);
      tabScrollRef.current.scrollTo({ x: scrollTo, animated: true });
    }
  }, [activeTab]);

  const handleTabLayout = useCallback((key: string, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    tabLayouts.current[key] = { x, width };
  }, []);

  const handleTabScroll = useCallback((e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const contentWidth = e.nativeEvent.contentSize.width;
    const layoutWidth = e.nativeEvent.layoutMeasurement.width;
    setShowTabFade(offsetX + layoutWidth < contentWidth - 8);
  }, []);

  const { data, isLoading } = useQuery<GroupDetail>({
    queryKey: [`/api/groups/${id}`],
    enabled: !!id,
  });

  const { data: discussions } = useQuery<Discussion[]>({
    queryKey: [`/api/groups/${id}/discussions`],
    enabled: !!id && activeTab === "discussion",
  });

  const { data: tracks } = useQuery<AvailableTrack[]>({
    queryKey: ["/api/tracks"],
    enabled: showTrackPicker,
  });

  const { data: planProgress } = useQuery<GroupPlanProgress>({
    queryKey: [`/api/groups/${id}/plan-progress`],
    enabled: !!id && (activeTab === "devotional" || activeTab === "study"),
  });

  const { data: availablePlans } = useQuery<AvailablePlan[]>({
    queryKey: ["/api/devotionals/plans"],
    enabled: showPlanPicker,
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/groups/${id}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      safeGoBack(router);
    },
  });

  const postDiscussionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/groups/${id}/discussion`, { content: newPostText.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/discussions`] });
      setNewPostText("");
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ discussionId, content }: { discussionId: string; content: string }) => {
      return await apiRequest("POST", `/api/groups/${id}/discussions/${discussionId}/reply`, { content });
    },
    onSuccess: (_, { discussionId }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/discussions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/discussions/${discussionId}/replies`] });
    },
  });

  const assignTrackMutation = useMutation({
    mutationFn: async (trackId: string) => {
      return await apiRequest("POST", `/api/groups/${id}/assign-track`, { trackId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
      setShowTrackPicker(false);
    },
  });

  const assignPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return await apiRequest("POST", `/api/groups/${id}/assign-plan`, { planId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/plan-progress`] });
      setShowPlanPicker(false);
    },
  });

  const { data: activeStreams } = useQuery<any[]>({
    queryKey: [`/api/streams/active`],
    enabled: !!id,
    refetchInterval: 30000,
  });

  const groupStream = activeStreams?.find((s: any) => s.groupId === id);


  const promoteMutation = useMutation({
    mutationFn: async ({ targetUserId, newRole }: { targetUserId: string; newRole: string }) => {
      return await apiRequest("POST", `/api/groups/${id}/promote`, { targetUserId, newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ targetUserId }: { targetUserId: string }) => {
      return await apiRequest("POST", `/api/groups/${id}/remove-member`, { targetUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
      setManageMember(null);
    },
  });

  const handleCopyCode = async () => {
    if (data?.group?.joinCode) {
      await Clipboard.setStringAsync(data.group.joinCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleShareInvite = async () => {
    if (!data?.group) return;
    try {
      await Share.share({
        message: `Join my group "${data.group.name}" on Informed Ministries! Use invite code: ${data.group.joinCode}`,
      });
    } catch {}
  };

  const handleLeave = () => {
    if (Platform.OS === "web") {
      if (confirm("Are you sure you want to leave this group?")) {
        leaveMutation.mutate();
      }
    } else {
      Alert.alert(
        "Leave Group",
        "Are you sure you want to leave this group?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => leaveMutation.mutate() },
        ]
      );
    }
  };

  const myMembership = data?.members?.find(m => m.userId === userId);
  const isLeader = myMembership?.role === "leader";
  const isModerator = myMembership?.role === "moderator" || isLeader;

  if (isLoading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!data?.group) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[s.errorText, { color: theme.textSecondary }]}>Group not found</Text>
      </View>
    );
  }

  const { group, members, trackProgress } = data;

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const renderDiscussionTab = () => (
    <View style={s.tabContent}>
      <View style={[s.postInputRow, { backgroundColor: isDark ? "#1A1A2E" : "#F5F3EE", borderColor: theme.border }]}>
        <TextInput
          style={[s.postInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
          placeholder="Share something with the group..."
          placeholderTextColor={theme.textMuted}
          value={newPostText}
          onChangeText={setNewPostText}
          multiline
        />
        <Pressable
          onPress={() => postDiscussionMutation.mutate()}
          disabled={!newPostText.trim() || postDiscussionMutation.isPending}
          style={[s.postBtn, { backgroundColor: theme.accent, opacity: !newPostText.trim() ? 0.4 : 1 }]}
        >
          {postDiscussionMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={16} color="#fff" />
          )}
        </Pressable>
      </View>

      {(discussions || []).length === 0 ? (
        <View style={s.tabEmpty}>
          <Ionicons name="chatbubbles-outline" size={40} color={theme.textMuted} />
          <Text style={[s.tabEmptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Start the conversation
          </Text>
        </View>
      ) : (
        (discussions || []).map((disc) => (
          <DiscussionCard
            key={disc.id}
            disc={disc}
            groupId={id!}
            theme={theme}
            isDark={isDark}
            isExpanded={expandedDiscussion === disc.id}
            onToggle={() => setExpandedDiscussion(expandedDiscussion === disc.id ? null : disc.id)}
            onReply={(content: string) => replyMutation.mutate({ discussionId: disc.id, content })}
            replyPending={replyMutation.isPending}
          />
        ))
      )}
    </View>
  );

  const renderStudyTab = () => (
    <View style={s.tabContent}>
      {trackProgress ? (
        <View style={[s.studyCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={s.studyHeader}>
            <View style={[s.studyIcon, { backgroundColor: trackProgress.track.color + "20" }]}>
              <Ionicons name={(trackProgress.track.icon as keyof typeof Ionicons.glyphMap) || "book"} size={22} color={trackProgress.track.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.studyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {trackProgress.track.title}
              </Text>
              <Text style={[s.studyMeta, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {trackProgress.enrolledCount}/{trackProgress.totalMembers} enrolled
              </Text>
            </View>
          </View>
          <View style={s.progressSection}>
            <View style={s.progressLabelRow}>
              <Text style={[s.progressLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                Group Progress
              </Text>
              <Text style={[s.progressPercent, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                {trackProgress.averagePercent}%
              </Text>
            </View>
            <View style={[s.progressBarBg, { backgroundColor: isDark ? "#2A2A3E" : "#E8E4DD" }]}>
              <View style={[s.progressBarFill, { width: `${trackProgress.averagePercent}%`, backgroundColor: theme.accent }]} />
            </View>
          </View>
          <Pressable
            onPress={() => router.push(`/study-path/${trackProgress.track.id}`)}
            style={[s.viewTrackBtn, { borderColor: theme.accent }]}
          >
            <Text style={[s.viewTrackText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              View Track
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.tabEmpty}>
          <Ionicons name="book-outline" size={40} color={theme.textMuted} />
          <Text style={[s.tabEmptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            No study plan assigned yet
          </Text>
          {isLeader || isModerator ? (
            <Pressable
              onPress={() => setShowTrackPicker(true)}
              style={[s.assignBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={[s.assignBtnText, { fontFamily: "Inter_600SemiBold" }]}>Assign a Study Path</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {trackProgress && (isLeader || isModerator) ? (
        <Pressable
          onPress={() => setShowTrackPicker(true)}
          style={[s.changeTrackBtn, { borderColor: theme.border }]}
        >
          <Ionicons name="swap-horizontal" size={16} color={theme.textSecondary} />
          <Text style={[s.changeTrackText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Change Study Plan
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  const renderDevotionalTab = () => (
    <View style={s.tabContent}>
      {planProgress?.plan ? (
        <>
          <View style={[s.studyCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={s.studyHeader}>
              <View style={[s.studyIcon, { backgroundColor: theme.accent + "20" }]}>
                <Ionicons name="flame" size={22} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.studyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {planProgress.plan.title}
                </Text>
                <Text style={[s.studyMeta, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {planProgress.plan.totalDays} days
                  {planProgress.plan.theme ? ` \u00B7 ${planProgress.plan.theme}` : ""}
                </Text>
              </View>
            </View>
            {planProgress.plan.description ? (
              <Text style={[{ color: theme.textSecondary, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 }]}>
                {planProgress.plan.description}
              </Text>
            ) : null}
            <View style={s.progressSection}>
              <View style={s.progressLabelRow}>
                <Text style={[s.progressLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Group Progress ({planProgress.enrolledCount}/{planProgress.totalMembers} enrolled)
                </Text>
                <Text style={[s.progressPercent, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  {planProgress.averagePercent}%
                </Text>
              </View>
              <View style={[s.progressBarBg, { backgroundColor: isDark ? "#2A2A3E" : "#E8E4DD" }]}>
                <View style={[s.progressBarFill, { width: `${planProgress.averagePercent}%`, backgroundColor: theme.accent }]} />
              </View>
            </View>
          </View>

          <View style={[s.studyCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border, marginTop: 10 }]}>
            <Text style={[s.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 4 }]}>
              Member Progress
            </Text>
            {planProgress.members.map((member) => (
              <View key={member.userId} style={[s.memberProgressRow, { borderColor: theme.border }]}>
                <View style={[s.memberAvatar, { backgroundColor: theme.accent + "20" }]}>
                  <Text style={[{ color: theme.accent, fontSize: 12, fontFamily: "Inter_600SemiBold" }]}>
                    {displayInitials(member.displayName || "")}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[{ color: theme.text, fontSize: 13, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
                      {member.displayName}
                    </Text>
                    <Text style={[{ color: member.enrolled ? theme.accent : theme.textMuted, fontSize: 11, fontFamily: "Inter_500Medium" }]}>
                      {member.enrolled ? `${member.completedDays}/${member.totalDays}` : "Not enrolled"}
                    </Text>
                  </View>
                  {member.enrolled ? (
                    <View style={[s.progressBarBg, { backgroundColor: isDark ? "#2A2A3E" : "#E8E4DD", height: 4, marginTop: 4 }]}>
                      <View style={[s.progressBarFill, { width: `${member.percent}%`, backgroundColor: theme.accent, height: 4 }]} />
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => router.push(`/devotional-day?planId=${planProgress.plan!.id}&groupId=${id}`)}
            style={[s.startReadingBtn, { backgroundColor: theme.accent }]}
          >
            <Ionicons name="book" size={18} color="#fff" />
            <Text style={[{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }]}>
              Start Today's Reading
            </Text>
          </Pressable>

          {(isLeader || isModerator) ? (
            <Pressable
              onPress={() => setShowPlanPicker(true)}
              style={[s.changeTrackBtn, { borderColor: theme.border }]}
            >
              <Ionicons name="swap-horizontal" size={16} color={theme.textSecondary} />
              <Text style={[s.changeTrackText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                Change Devotional Plan
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <View style={s.tabEmpty}>
          <Ionicons name="flame-outline" size={40} color={theme.textMuted} />
          <Text style={[s.tabEmptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            No devotional plan assigned yet
          </Text>
          {(isLeader || isModerator) ? (
            <Pressable
              onPress={() => setShowPlanPicker(true)}
              style={[s.assignBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={[s.assignBtnText, { fontFamily: "Inter_600SemiBold" }]}>Assign a Devotional Plan</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 24 }}>
        <View style={[s.groupHeader, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={s.headerTopRow}>
            <Pressable onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </Pressable>
            <Pressable onPress={() => setShowMembers(!showMembers)}>
              <View style={s.memberCountBadge}>
                <Ionicons name="people" size={16} color={theme.accent} />
                <Text style={[s.memberCountText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  {members.length}
                </Text>
              </View>
            </Pressable>
          </View>
          <View style={[s.groupIconLg, { backgroundColor: theme.accent + "20" }]}>
            <Ionicons name="people" size={28} color={theme.accent} />
          </View>
          <Text style={[s.groupName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {group.name}
          </Text>
          {group.description ? (
            <Text style={[s.groupDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {group.description}
            </Text>
          ) : null}

          <Pressable onPress={handleCopyCode} style={[s.codeCard, { backgroundColor: isDark ? "#1A1A2E" : "#F5F3EE" }]}>
            <Text style={[s.codeLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Invite Code
            </Text>
            <View style={s.codeRow}>
              <Text style={[s.codeText, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
                {group.joinCode}
              </Text>
              <Ionicons
                name={codeCopied ? "checkmark-circle" : "copy-outline"}
                size={18}
                color={codeCopied ? "#7ED321" : theme.accent}
              />
            </View>
          </Pressable>

          <Pressable onPress={handleShareInvite} style={[s.shareInviteBtn, { borderColor: theme.accent }]}>
            <Ionicons name="share-social" size={16} color={theme.accent} />
            <Text style={[{ color: theme.accent, fontSize: 13, fontFamily: "Inter_600SemiBold" }]}>
              Share Invite
            </Text>
          </Pressable>

          {groupStream ? (
            <Pressable
              onPress={() => router.push(`/stream/${groupStream.id}` as any)}
              style={[s.liveBanner, { backgroundColor: "#FF3B3018" }]}
            >
              <View style={s.liveBannerDot} />
              <View style={{ flex: 1 }}>
                <Text style={[s.liveBannerTitle, { color: "#FF3B30", fontFamily: "Inter_700Bold" }]}>
                  LIVE NOW
                </Text>
                <Text style={[s.liveBannerSub, { color: theme.text, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
                  {groupStream.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FF3B30" />
            </Pressable>
          ) : null}
        </View>

        {showMembers ? (
          <View style={[s.membersSection, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <Text style={[s.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Members ({members.length})
            </Text>
            {members.map((member) => (
              <View key={member.id} style={[s.memberRow, { borderColor: theme.border }]}>
                <View style={[s.memberAvatar, { backgroundColor: theme.accent + "20" }]}>
                  <Ionicons name="person" size={16} color={theme.accent} />
                </View>
                <Text style={[s.memberName, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {member.displayName || "Member"}
                </Text>
                <View style={[s.roleBadge, { backgroundColor: member.role === "leader" ? theme.accent + "20" : (member.role === "moderator" ? "#7C3AED20" : "transparent") }]}>
                  <Text style={[s.roleText, { color: member.role === "leader" ? theme.accent : (member.role === "moderator" ? "#7C3AED" : theme.textMuted), fontFamily: "Inter_500Medium" }]}>
                    {member.role}
                  </Text>
                </View>
                {isLeader && member.userId !== userId ? (
                  <Pressable
                    onPress={() => setManageMember(member)}
                    style={s.promoteBtn}
                  >
                    <Ionicons name="ellipsis-vertical" size={16} color={theme.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.tabBarWrapper}>
          <ScrollView
            ref={tabScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.tabBarScroll}
            contentContainerStyle={s.tabBarContent}
            onScroll={handleTabScroll}
            scrollEventThrottle={16}
          >
            {TABS.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setActiveTab(t.key)}
                onLayout={(e) => handleTabLayout(t.key, e)}
                style={[s.tabItem, activeTab === t.key && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
              >
                <Ionicons name={t.icon} size={14} color={activeTab === t.key ? theme.accent : theme.textMuted} />
                <Text style={[s.tabLabel, { color: activeTab === t.key ? theme.accent : theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {showTabFade && (
            <LinearGradient
              colors={["transparent", theme.background]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.tabFade}
              pointerEvents="none"
            />
          )}
        </View>

        {activeTab === "discussion" && renderDiscussionTab()}
        {activeTab === "prayer" && (
          <View style={s.tabContent}>
            <PrayerWall groupId={id} />
          </View>
        )}
        {activeTab === "devotional" && renderDevotionalTab()}
        {activeTab === "study" && renderStudyTab()}
        {activeTab === "live" && (
          <View style={s.tabContent}>
            {groupStream ? (
              <View style={{ alignItems: "center" as const, gap: 16, paddingVertical: 20 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#FF3B3015", alignItems: "center" as const, justifyContent: "center" as const }}>
                  <Ionicons name="videocam" size={28} color="#FF3B30" />
                </View>
                <View style={{ alignItems: "center" as const, gap: 4 }}>
                  <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B30" }} />
                    <Text style={{ color: "#FF3B30", fontSize: 13, fontFamily: "Inter_700Bold" }}>LIVE NOW</Text>
                  </View>
                  <Text style={{ color: theme.text, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>
                    {groupStream.title}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: "Inter_400Regular" }}>
                    Hosted by {groupStream.hostDisplayName || "Group Leader"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push(`/stream/${groupStream.id}` as any)}
                  style={({ pressed }) => [{ backgroundColor: "#FF3B30", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={{ color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Join Live Session</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ alignItems: "center" as const, gap: 16, paddingVertical: 30 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accent + "15", alignItems: "center" as const, justifyContent: "center" as const }}>
                  <Ionicons name="videocam-outline" size={28} color={theme.accent} />
                </View>
                <Text style={{ color: theme.text, fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" as const }}>
                  No active session
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" as const, maxWidth: 260, lineHeight: 19 }}>
                  Group leaders can start a live session for prayer, Bible study, or worship.
                </Text>
                {isLeader && (
                  <Pressable
                    onPress={() => {
                      apiRequest("POST", "/api/streams/create", {
                        title: `${data?.group?.name || "Group"} Live Session`,
                        groupId: id,
                      }).then(res => res.json()).then((stream: any) => {
                        queryClient.invalidateQueries({ queryKey: ["/api/streams/active"] });
                        queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
                        router.push(`/stream/${stream.id}` as any);
                      }).catch(() => {});
                    }}
                    style={({ pressed }) => [{ backgroundColor: theme.accent, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, opacity: pressed ? 0.85 : 1 }]}
                  >
                    <Text style={{ color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Start Live Session</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        <Pressable onPress={handleLeave} style={s.leaveBtn}>
          <Ionicons name="exit-outline" size={18} color="#FF6B6B" />
          <Text style={[s.leaveText, { fontFamily: "Inter_500Medium" }]}>Leave Group</Text>
        </Pressable>
      </ScrollView>

      {showTrackPicker ? (
        <View style={s.pickerOverlay}>
          <View style={[s.pickerCard, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[s.pickerTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              Assign Study Path
            </Text>
            {(tracks || []).length === 0 ? (
              <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={s.pickerList}>
                {(tracks || []).map((track) => (
                  <Pressable
                    key={track.id}
                    onPress={() => assignTrackMutation.mutate(track.id)}
                    style={[s.pickerItem, { borderColor: theme.border }]}
                  >
                    <View style={[s.pickerIcon, { backgroundColor: track.color + "20" }]}>
                      <Ionicons name={(track.icon as keyof typeof Ionicons.glyphMap) || "book"} size={18} color={track.color} />
                    </View>
                    <Text style={[s.pickerItemText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                      {track.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <Pressable onPress={() => setShowTrackPicker(false)} style={[s.pickerCancel, { borderColor: theme.border }]}>
              <Text style={[s.pickerCancelText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {showPlanPicker ? (
        <View style={s.pickerOverlay}>
          <View style={[s.pickerCard, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[s.pickerTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              Assign Devotional Plan
            </Text>
            {(availablePlans || []).length === 0 ? (
              <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={s.pickerList}>
                {(availablePlans || []).map((plan) => (
                  <Pressable
                    key={plan.id}
                    onPress={() => assignPlanMutation.mutate(plan.id)}
                    style={[s.pickerItem, { borderColor: theme.border }]}
                  >
                    <View style={[s.pickerIcon, { backgroundColor: theme.accent + "20" }]}>
                      <Ionicons name="flame" size={18} color={theme.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.pickerItemText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                        {plan.title}
                      </Text>
                      <Text style={[{ color: theme.textMuted, fontSize: 11, fontFamily: "Inter_400Regular" }]}>
                        {plan.totalDays} days{plan.theme ? ` \u00B7 ${plan.theme}` : ""}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <Pressable onPress={() => setShowPlanPicker(false)} style={[s.pickerCancel, { borderColor: theme.border }]}>
              <Text style={[s.pickerCancelText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {manageMember && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setManageMember(null)}>
          <Pressable style={s.modalOverlay} onPress={() => setManageMember(null)}>
            <View style={[s.memberSheet, { backgroundColor: isDark ? "#1A1A24" : "#fff" }]}>
              <Text style={[s.memberSheetTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {manageMember.displayName || "Member"}
              </Text>
              <Text style={[s.memberSheetRole, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Current role: {manageMember.role}
              </Text>

              {manageMember.role !== "leader" && (
                <Pressable
                  style={[s.memberSheetAction, { borderColor: theme.border }]}
                  onPress={() => {
                    promoteMutation.mutate({ targetUserId: manageMember.userId, newRole: "leader" });
                    setManageMember(null);
                  }}
                >
                  <Ionicons name="shield" size={20} color={theme.accent} />
                  <Text style={[s.memberSheetActionText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                    Promote to Leader
                  </Text>
                </Pressable>
              )}

              {manageMember.role !== "moderator" && (
                <Pressable
                  style={[s.memberSheetAction, { borderColor: theme.border }]}
                  onPress={() => {
                    promoteMutation.mutate({ targetUserId: manageMember.userId, newRole: "moderator" });
                    setManageMember(null);
                  }}
                >
                  <Ionicons name="star" size={20} color="#7C3AED" />
                  <Text style={[s.memberSheetActionText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                    {manageMember.role === "leader" ? "Demote to Moderator" : "Promote to Moderator"}
                  </Text>
                </Pressable>
              )}

              {manageMember.role !== "member" && (
                <Pressable
                  style={[s.memberSheetAction, { borderColor: theme.border }]}
                  onPress={() => {
                    promoteMutation.mutate({ targetUserId: manageMember.userId, newRole: "member" });
                    setManageMember(null);
                  }}
                >
                  <Ionicons name="arrow-down" size={20} color={theme.textMuted} />
                  <Text style={[s.memberSheetActionText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                    Demote to Member
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={[s.memberSheetAction, { borderColor: "#FF3B3020" }]}
                onPress={() => {
                  removeMemberMutation.mutate({ targetUserId: manageMember.userId });
                }}
              >
                <Ionicons name="person-remove" size={20} color="#FF3B30" />
                <Text style={[s.memberSheetActionText, { color: "#FF3B30", fontFamily: "Inter_500Medium" }]}>
                  Remove from Group
                </Text>
              </Pressable>

              <Pressable
                style={[s.memberSheetCancel, { backgroundColor: isDark ? "#2A2A36" : "#F3F3F3" }]}
                onPress={() => setManageMember(null)}
              >
                <Text style={[s.memberSheetCancelText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

function DiscussionCard({
  disc,
  groupId,
  theme,
  isDark,
  isExpanded,
  onToggle,
  onReply,
  replyPending,
}: {
  disc: Discussion;
  groupId: string;
  theme: typeof Colors.dark;
  isDark: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onReply: (content: string) => void;
  replyPending: boolean;
}) {
  const [replyText, setReplyText] = useState("");
  const { data: replies } = useQuery<DiscussionReply[]>({
    queryKey: [`/api/groups/${groupId}/discussions/${disc.id}/replies`],
    enabled: isExpanded,
  });

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <View style={[s.discCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={s.discHeader}>
        <View style={[s.discAvatar, { backgroundColor: theme.accent + "20" }]}>
          <Text style={[s.discAvatarText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            {displayInitials(disc.authorName || "")}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.discAuthor, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {disc.authorName || "Member"}
          </Text>
          <Text style={[s.discTime, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {formatTimeAgo(disc.createdAt)}
          </Text>
        </View>
      </View>
      <Text style={[s.discContent, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
        {disc.content}
      </Text>
      <Pressable onPress={onToggle} style={s.replyToggle}>
        <Ionicons name="chatbubble-outline" size={14} color={theme.textMuted} />
        <Text style={[s.replyCount, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
          {disc.replyCount} {disc.replyCount === 1 ? "reply" : "replies"}
        </Text>
      </Pressable>

      {isExpanded ? (
        <View style={s.repliesSection}>
          {(replies || []).map((r) => (
            <View key={r.id} style={[s.replyItem, { borderColor: theme.border }]}>
              <Text style={[s.replyAuthor, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                {r.authorName || "Member"}
              </Text>
              <Text style={[s.replyContent, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                {r.content}
              </Text>
              <Text style={[s.replyTime, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {formatTimeAgo(r.createdAt)}
              </Text>
            </View>
          ))}
          <View style={[s.replyInputRow, { backgroundColor: isDark ? "#1A1A2E" : "#F5F3EE" }]}>
            <TextInput
              style={[s.replyInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
              placeholder="Write a reply..."
              placeholderTextColor={theme.textMuted}
              value={replyText}
              onChangeText={setReplyText}
            />
            <Pressable
              onPress={() => {
                if (replyText.trim()) {
                  onReply(replyText.trim());
                  setReplyText("");
                }
              }}
              disabled={!replyText.trim() || replyPending}
              style={[s.replyBtn, { backgroundColor: theme.accent, opacity: !replyText.trim() ? 0.4 : 1 }]}
            >
              <Ionicons name="send" size={12} color="#fff" />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  groupHeader: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 4 },
  backBtn: { padding: 4 },
  memberCountBadge: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 },
  memberCountText: { fontSize: 14 },
  groupIconLg: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  groupName: { fontSize: 22, marginTop: 4, textAlign: "center" },
  groupDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  codeCard: {
    width: "100%",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  codeLabel: { fontSize: 11 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  codeText: { fontSize: 20, letterSpacing: 3 },
  shareInviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  membersSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 16, marginBottom: 10 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  memberName: { fontSize: 14, flex: 1 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleText: { fontSize: 10, textTransform: "capitalize" as const },
  promoteBtn: { padding: 6 },
  tabBarWrapper: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    position: "relative" as const,
  },
  tabBarScroll: {
    flexGrow: 0,
  },
  tabBarContent: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  tabFade: {
    position: "absolute" as const,
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
  tabItem: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 12, paddingHorizontal: 4 },
  tabLabel: { fontSize: 11 },
  tabContent: { marginHorizontal: 16, marginTop: 8 },
  tabEmpty: { alignItems: "center", gap: 10, paddingVertical: 48 },
  tabEmptyText: { fontSize: 14, textAlign: "center" },
  postInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 14,
    padding: 10,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  postInput: { flex: 1, fontSize: 14, maxHeight: 80, padding: 0 },
  postBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  discCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  discHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  discAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  discAvatarText: { fontSize: 14 },
  discAuthor: { fontSize: 13 },
  discTime: { fontSize: 11 },
  discContent: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  replyToggle: { flexDirection: "row", alignItems: "center", gap: 4 },
  replyCount: { fontSize: 12 },
  repliesSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  replyItem: { paddingLeft: 10, marginBottom: 8, borderLeftWidth: 2 },
  replyAuthor: { fontSize: 12 },
  replyContent: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  replyTime: { fontSize: 10, marginTop: 2 },
  replyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 8,
    gap: 6,
    marginTop: 6,
  },
  replyInput: { flex: 1, fontSize: 13, padding: 0 },
  replyBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  studyCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  studyHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  studyIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  studyTitle: { fontSize: 16 },
  studyMeta: { fontSize: 12, marginTop: 2 },
  progressSection: { gap: 6 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 12 },
  progressPercent: { fontSize: 13 },
  progressBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },
  viewTrackBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  viewTrackText: { fontSize: 14 },
  assignBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  assignBtnText: { color: "#fff", fontSize: 14 },
  changeTrackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  changeTrackText: { fontSize: 13 },
  memberProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  startReadingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
  },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,107,107,0.08)",
    marginTop: 16,
  },
  leaveText: { color: "#FF6B6B", fontSize: 14 },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  pickerCard: { borderRadius: 20, padding: 20, maxHeight: 400 },
  pickerTitle: { fontSize: 18, textAlign: "center", marginBottom: 12 },
  pickerList: { maxHeight: 280 },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pickerIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  pickerItemText: { fontSize: 15, flex: 1 },
  pickerCancel: { marginTop: 12, paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  pickerCancelText: { fontSize: 14 },
  liveBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
  },
  liveBannerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF3B30",
  },
  liveBannerTitle: { fontSize: 11, letterSpacing: 1 },
  liveBannerSub: { fontSize: 14 },
  goLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    marginTop: 8,
  },
  goLiveText: { fontSize: 14 },
  goLiveCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  goLiveCardTitle: { fontSize: 17, textAlign: "center" },
  goLiveInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  goLiveActions: { flexDirection: "row", gap: 10 },
  goLiveCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  goLiveCancelText: { fontSize: 14 },
  goLiveStartBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
  },
  goLiveStartText: { color: "#fff", fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  memberSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  memberSheetTitle: { fontSize: 18, textAlign: "center", marginBottom: 2 },
  memberSheetRole: { fontSize: 13, textAlign: "center", marginBottom: 16 },
  memberSheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  memberSheetActionText: { fontSize: 15 },
  memberSheetCancel: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  memberSheetCancelText: { fontSize: 14 },
});
