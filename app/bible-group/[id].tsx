import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { apiRequest } from "@/lib/query-client";
import { getDeviceTimeZone, withDeviceTimeZone } from "@/lib/device-time-zone";
import {
  resolveSabbathSchoolContinueDay,
  useSabbathSchoolLastRead,
} from "@/lib/sabbath-school-continue";
import { weekdayNameForSabbathSchoolDay } from "@/lib/sabbath-school-day-navigation";
import { buildSabbathSchoolTabRoute } from "@/lib/sabbath-school-route-containment";
import type { SabbathSchoolWeekPointer } from "@/lib/bible-small-group";
import { SABBATH_SCHOOL_TRACKS } from "@/lib/sabbath-school-tracks";

const C = {
  surface: PathB.surface,
  card: PathB.surfaceCard,
  ink: PathB.ink,
  inkMuted: HV2.inkMutedText,
  coral: PathB.coral,
  coralInk: PathB.coralInk,
  pill: "#F1EBDD",
  border: "#E7E0D2",
};

type Member = {
  userId: string;
  role: string;
  displayName: string;
};

type Post = {
  id: string;
  userId: string;
  ssWeekKey: string;
  body: string;
  createdAt: string;
  displayName: string;
};

type GroupDetail = {
  group: {
    id: string;
    name: string;
    inviteCode: string;
    curriculum: string;
    role: string;
    currentWeek: SabbathSchoolWeekPointer | null;
  };
  members: Member[];
  posts: Post[];
};

type SsCurrent = {
  quarterly: { quarterCode?: string } | null;
  currentLesson: {
    title: string;
    lessonNumber: number;
    days: { dayNumber: number; title: string | null; date: string | null }[];
  } | null;
  currentLessonNumber: number;
  todayDayNumber: number | null;
};

export default function BibleGroupHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { userId, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const deviceTimeZone = useMemo(() => getDeviceTimeZone(), []);
  const { lastRead } = useSabbathSchoolLastRead(userId);

  const { data, isLoading } = useQuery<GroupDetail>({
    queryKey: ["/api/bible-groups", id],
    queryFn: async () => {
      const res = await apiRequest("GET", withDeviceTimeZone(`/api/bible-groups/${id}`));
      return res.json();
    },
    enabled: isAuthenticated && !!id,
  });

  const curriculum = data?.group.curriculum === "inverse" ? "inverse" : "adult";
  const { data: ssData } = useQuery<SsCurrent>({
    queryKey: ["bible-group-ss-current", id, curriculum, deviceTimeZone],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        withDeviceTimeZone(`/api/sabbath-school/current?curriculum=${curriculum}`),
      );
      return res.json();
    },
    enabled: !!data?.group,
  });

  const week = data?.group.currentWeek;
  const ssLessonNumber =
    week?.lessonNumber ?? ssData?.currentLesson?.lessonNumber ?? ssData?.currentLessonNumber ?? null;
  const continueDay = resolveSabbathSchoolContinueDay({
    days: ssData?.currentLesson?.days ?? [],
    todayDayNumber: ssData?.todayDayNumber,
    lastRead,
    currentLessonNumber: ssLessonNumber,
    currentQuarterCode: week?.quarterCode ?? ssData?.quarterly?.quarterCode,
  });

  const openLesson = () => {
    if (ssLessonNumber == null) return;
    router.push(
      buildSabbathSchoolTabRoute("sabbath-school-day", {
        lessonNumber: ssLessonNumber,
        dayNumber: continueDay?.dayNumber ?? 1,
        quarterCode: week?.quarterCode ?? ssData?.quarterly?.quarterCode,
      }) as any,
    );
  };

  const postMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        withDeviceTimeZone(`/api/bible-groups/${id}/posts`),
        { body: draft.trim() },
      );
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["/api/bible-groups", id] });
    },
    onError: (err: any) => {
      showToast(err?.message || "Could not post", "error");
    },
  });

  const regenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bible-groups/${id}/invite-code`);
      return res.json();
    },
    onSuccess: async (body: { inviteCode?: string }) => {
      qc.invalidateQueries({ queryKey: ["/api/bible-groups", id] });
      qc.invalidateQueries({ queryKey: ["/api/bible-groups"] });
      if (body.inviteCode) {
        await Clipboard.setStringAsync(body.inviteCode);
        showToast("New invite code copied", "success");
      }
    },
    onError: (err: any) => {
      showToast(err?.message || "Could not regenerate the code", "error");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/bible-groups/${id}/members/${memberId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bible-groups", id] });
    },
    onError: (err: any) => {
      showToast(err?.message || "Could not remove that member", "error");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/bible-groups/${id}/archive`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bible-groups"] });
      router.back();
    },
    onError: (err: any) => {
      showToast(err?.message || "Could not archive this group", "error");
    },
  });

  const isHost = data?.group.role === "host";
  const continueLabel = continueDay
    ? weekdayNameForSabbathSchoolDay(continueDay)
    : "this week's lesson";

  if (!isAuthenticated) {
    return (
      <View style={[s.center, { backgroundColor: C.surface, paddingTop: topPad }]}>
        <Text style={[s.muted, { color: C.inkMuted }]}>Sign in to open this group.</Text>
        <Pressable style={s.coralBtn} onPress={() => router.push("/(auth)/login" as any)}>
          <Text style={s.coralBtnText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading || !data) {
    return (
      <View style={[s.center, { backgroundColor: C.surface }]}>
        <ActivityIndicator color={C.coral} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad + 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} testID="bible-group-back">
            <Ionicons name="arrow-back" size={22} color={C.ink} />
          </Pressable>
          <Text style={s.title} numberOfLines={2}>
            {data.group.name}
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.eyebrow}>INVITE CODE</Text>
          <View style={s.codeRow}>
            <Text style={s.code} testID="bible-group-invite-code">
              {data.group.inviteCode}
            </Text>
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(data.group.inviteCode);
                showToast("Invite code copied", "success");
              }}
              hitSlop={8}
            >
              <Ionicons name="copy-outline" size={20} color={C.coral} />
            </Pressable>
          </View>
          {isHost && (
            <Pressable
              style={s.linkBtn}
              onPress={() => regenMutation.mutate()}
              disabled={regenMutation.isPending}
              testID="bible-group-regen-code"
            >
              <Text style={s.linkText}>Regenerate code</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          style={s.lessonCard}
          onPress={openLesson}
          testID="bible-group-lesson-card"
          accessibilityRole="button"
          accessibilityLabel="Open this week's Sabbath School lesson"
        >
          <Text style={s.eyebrow}>
            THIS WEEK · {SABBATH_SCHOOL_TRACKS[curriculum].shortLabel}
          </Text>
          <Text style={s.lessonTitle}>
            {week
              ? `Lesson ${week.lessonNumber} · ${week.lessonTitle}`
              : "This week's lesson"}
          </Text>
          <Text style={s.lessonMeta}>Open {continueLabel} in Sabbath School</Text>
        </Pressable>

        <View style={s.card} testID="bible-group-members">
          <Text style={s.sectionLabel}>Members</Text>
          {data.members.map((member) => (
            <View key={member.userId} style={s.memberRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.memberName}>{member.displayName}</Text>
                <Text style={s.memberRole}>{member.role === "host" ? "Host" : "Member"}</Text>
              </View>
              {isHost && member.role !== "host" && (
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "Remove member",
                      `Remove ${member.displayName} from this group?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () => removeMutation.mutate(member.userId),
                        },
                      ],
                    );
                  }}
                  testID={`bible-group-remove-${member.userId}`}
                >
                  <Text style={s.removeText}>Remove</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>

        <View style={s.card} testID="bible-group-thread">
          <Text style={s.sectionLabel}>This week's conversation</Text>
          {data.posts.length === 0 ? (
            <Text style={s.emptyThread} testID="bible-group-thread-empty">
              No notes yet this week. Leave a quiet thought from the lesson if you wish.
            </Text>
          ) : (
            data.posts.map((post) => (
              <View key={post.id} style={s.post}>
                <Text style={s.postAuthor}>{post.displayName}</Text>
                <Text style={s.postBody}>{post.body}</Text>
              </View>
            ))
          )}
          <TextInput
            style={s.composer}
            value={draft}
            onChangeText={setDraft}
            placeholder="A note on this week's lesson"
            placeholderTextColor={C.inkMuted}
            multiline
            testID="bible-group-composer"
          />
          <Pressable
            style={[s.coralBtn, { opacity: postMutation.isPending || !draft.trim() ? 0.55 : 1 }]}
            disabled={postMutation.isPending || !draft.trim()}
            onPress={() => postMutation.mutate()}
            testID="bible-group-post"
          >
            {postMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.coralBtnText}>Share with the group</Text>
            )}
          </Pressable>
        </View>

        {isHost && (
          <Pressable
            style={s.archiveBtn}
            onPress={() => {
              Alert.alert(
                "Archive group",
                "The group will be hidden. Members will no longer see it.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Archive", style: "destructive", onPress: () => archiveMutation.mutate() },
                ],
              );
            }}
            testID="bible-group-archive"
          >
            <Text style={s.archiveText}>Archive group</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: "Lora_700Bold",
    color: C.ink,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  lessonCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.coral,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontFamily: "Inter_600SemiBold",
    color: C.coralInk,
    marginBottom: 6,
  },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  code: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    color: C.ink,
  },
  linkBtn: { marginTop: 10 },
  linkText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.coralInk },
  lessonTitle: {
    fontSize: 18,
    fontFamily: "Lora_700Bold",
    color: C.ink,
    marginBottom: 6,
  },
  lessonMeta: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.inkMuted },
  sectionLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.ink,
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  memberName: { fontSize: 15, fontFamily: "Inter_500Medium", color: C.ink },
  memberRole: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.inkMuted, marginTop: 2 },
  removeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.coralInk },
  emptyThread: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.inkMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  post: { marginBottom: 12 },
  postAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.ink, marginBottom: 4 },
  postBody: { fontSize: 15, fontFamily: "Inter_400Regular", color: C.ink, lineHeight: 22 },
  composer: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.ink,
    backgroundColor: C.surface,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  coralBtn: {
    backgroundColor: C.coral,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  coralBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  archiveBtn: { alignItems: "center", paddingVertical: 16 },
  archiveText: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.inkMuted },
  muted: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
});
