import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import PrayerWall from "@/components/PrayerWall";
import Colors from "@/constants/colors";

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
    createdAt: string;
  };
  members: GroupMember[];
  trackProgress: TrackProgress | null;
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

type GroupTab = "discussion" | "prayer" | "study";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeTab, setActiveTab] = useState<GroupTab>("discussion");
  const [codeCopied, setCodeCopied] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [expandedDiscussion, setExpandedDiscussion] = useState<string | null>(null);

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

  const leaveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/groups/${id}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      router.back();
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

  const promoteMutation = useMutation({
    mutationFn: async ({ targetUserId, newRole }: { targetUserId: string; newRole: string }) => {
      return await apiRequest("POST", `/api/groups/${id}/promote`, { targetUserId, newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
    },
  });

  const handleCopyCode = async () => {
    if (data?.group?.joinCode) {
      await Clipboard.setStringAsync(data.group.joinCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
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
              <Text style={[s.assignBtnText, { fontFamily: "Inter_600SemiBold" }]}>Assign a Formation Track</Text>
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
                    onPress={() => {
                      const nextRole = member.role === "member" ? "moderator" : "member";
                      promoteMutation.mutate({ targetUserId: member.userId, newRole: nextRole });
                    }}
                    style={s.promoteBtn}
                  >
                    <Ionicons name={member.role === "member" ? "arrow-up" : "arrow-down"} size={14} color={theme.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.tabBar}>
          {([
            { key: "discussion" as const, icon: "chatbubbles" as const, label: "Discussion" },
            { key: "prayer" as const, icon: "heart" as const, label: "Prayer" },
            { key: "study" as const, icon: "book" as const, label: "Study Plan" },
          ]).map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[s.tabItem, activeTab === t.key && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
            >
              <Ionicons name={t.icon} size={18} color={activeTab === t.key ? theme.accent : theme.textMuted} />
              <Text style={[s.tabLabel, { color: activeTab === t.key ? theme.accent : theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "discussion" && renderDiscussionTab()}
        {activeTab === "prayer" && (
          <View style={s.tabContent}>
            <PrayerWall groupId={id} />
          </View>
        )}
        {activeTab === "study" && renderStudyTab()}

        <Pressable onPress={handleLeave} style={s.leaveBtn}>
          <Ionicons name="exit-outline" size={18} color="#FF6B6B" />
          <Text style={[s.leaveText, { fontFamily: "Inter_500Medium" }]}>Leave Group</Text>
        </Pressable>
      </ScrollView>

      {showTrackPicker ? (
        <View style={s.pickerOverlay}>
          <View style={[s.pickerCard, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[s.pickerTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              Assign Formation Track
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
            {(disc.authorName || "M")[0].toUpperCase()}
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
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    marginBottom: 4,
  },
  tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  tabLabel: { fontSize: 12 },
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
});
