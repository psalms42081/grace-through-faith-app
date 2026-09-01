import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { apiRequest } from "@/lib/query-client";
import { withDeviceTimeZone } from "@/lib/device-time-zone";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  ADULT_CONFIRM_REQUIRED,
  parseGroupCurriculum,
  type BibleGroupCurriculum,
  type SabbathSchoolWeekPointer,
} from "@/lib/bible-small-group";
import { SABBATH_SCHOOL_TRACKS } from "@/lib/sabbath-school-tracks";
import { useSabbathSchoolTrack } from "@/hooks/useSabbathSchoolTrack";

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

type GroupRow = {
  id: string;
  name: string;
  role: string;
  currentWeek: SabbathSchoolWeekPointer | null;
};

type GroupsResponse = {
  groups: GroupRow[];
  adultConfirmed: boolean;
};

function errorCode(err: unknown): string | null {
  const message = err instanceof Error ? err.message : String(err);
  try {
    const jsonStart = message.indexOf("{");
    if (jsonStart < 0) return null;
    const parsed = JSON.parse(message.slice(jsonStart));
    return typeof parsed.code === "string" ? parsed.code : null;
  } catch {
    return null;
  }
}

function errorText(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err);
  try {
    const jsonStart = message.indexOf("{");
    if (jsonStart < 0) return fallback;
    const parsed = JSON.parse(message.slice(jsonStart));
    return typeof parsed.error === "string" ? parsed.error : fallback;
  } catch {
    return fallback;
  }
}

export default function ProfileGroupsSection() {
  const { isAuthenticated, isGuest, refreshUser } = useAuth();
  const { selectedTrack } = useSabbathSchoolTrack();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [adultOpen, setAdultOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"create" | "join" | null>(null);
  const [groupName, setGroupName] = useState("");
  const [curriculum, setCurriculum] = useState<BibleGroupCurriculum>(() =>
    parseGroupCurriculum(selectedTrack),
  );
  const [joinCode, setJoinCode] = useState("");

  const { data, isLoading } = useQuery<GroupsResponse>({
    queryKey: ["/api/bible-groups"],
    queryFn: async () => {
      const res = await apiRequest("GET", withDeviceTimeZone("/api/bible-groups"));
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 0,
  });

  const groups = data?.groups ?? [];
  const adultConfirmed = data?.adultConfirmed === true;

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", withDeviceTimeZone("/api/bible-groups"), {
        name: groupName.trim(),
        curriculum,
      });
      return res.json();
    },
    onSuccess: (body: { group?: { id: string } }) => {
      qc.invalidateQueries({ queryKey: ["/api/bible-groups"] });
      setCreateOpen(false);
      setGroupName("");
      if (body.group?.id) {
        router.push(`/bible-group/${body.group.id}` as any);
      }
    },
    onError: (err) => {
      if (errorCode(err) === ADULT_CONFIRM_REQUIRED) {
        setCreateOpen(false);
        setPendingAction("create");
        setAdultOpen(true);
        return;
      }
      showToast(errorText(err, "Could not create the group"), "error");
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", withDeviceTimeZone("/api/bible-groups/join"), {
        code: joinCode,
      });
      return res.json();
    },
    onSuccess: (body: { group?: { id: string } }) => {
      qc.invalidateQueries({ queryKey: ["/api/bible-groups"] });
      setJoinOpen(false);
      setJoinCode("");
      if (body.group?.id) {
        router.push(`/bible-group/${body.group.id}` as any);
      }
    },
    onError: (err) => {
      if (errorCode(err) === ADULT_CONFIRM_REQUIRED) {
        setJoinOpen(false);
        setPendingAction("join");
        setAdultOpen(true);
        return;
      }
      showToast(errorText(err, "Could not join with that code"), "error");
    },
  });

  const adultMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/me/adult-confirm");
      return res.json();
    },
    onSuccess: async () => {
      await refreshUser();
      qc.invalidateQueries({ queryKey: ["/api/bible-groups"] });
      setAdultOpen(false);
      if (pendingAction === "create") setCreateOpen(true);
      if (pendingAction === "join") setJoinOpen(true);
      setPendingAction(null);
    },
    onError: (err) => {
      showToast(errorText(err, "Could not save confirmation"), "error");
    },
  });

  function requireAdultThen(action: "create" | "join") {
    if (isGuest || !isAuthenticated) {
      router.push("/(auth)/login" as any);
      return;
    }
    if (!adultConfirmed) {
      setPendingAction(action);
      setAdultOpen(true);
      return;
    }
    if (action === "create") {
      setCurriculum(parseGroupCurriculum(selectedTrack));
      setCreateOpen(true);
    } else setJoinOpen(true);
  }

  return (
    <View style={[st.orgCard, { marginTop: 12 }]} testID="profile-my-groups">
      <Text style={[st.subhead, { color: C.ink }]}>My Groups</Text>
      {isLoading ? (
        <ActivityIndicator color={C.coral} style={{ marginVertical: 12 }} />
      ) : groups.length === 0 ? (
        <Text style={[st.empty, { color: C.inkMuted }]} testID="profile-groups-empty">
          Private groups around this week's Sabbath School lesson. Create one, or join with an invite code. Groups are not listed publicly.
        </Text>
      ) : (
        groups.map((group) => (
          <Pressable
            key={group.id}
            style={st.groupRow}
            onPress={() => router.push(`/bible-group/${group.id}` as any)}
            testID={`profile-group-${group.id}`}
          >
            <Ionicons name="people-outline" size={22} color={C.coral} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[st.groupName, { color: C.ink }]}>{group.name}</Text>
              <Text style={[st.groupMeta, { color: C.inkMuted }]} numberOfLines={1}>
                {group.role === "host" ? "Host" : "Member"}
                {group.currentWeek
                  ? ` · Lesson ${group.currentWeek.lessonNumber}`
                  : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.inkMuted} />
          </Pressable>
        ))
      )}

      <Pressable
        style={st.primaryBtn}
        onPress={() => requireAdultThen("create")}
        testID="profile-create-group"
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={st.primaryBtnText}>Create group</Text>
      </Pressable>
      <Pressable
        style={st.outlineBtn}
        onPress={() => requireAdultThen("join")}
        testID="profile-join-group"
      >
        <Ionicons name="key-outline" size={18} color={C.coralInk} />
        <Text style={st.outlineBtnText}>Join with code</Text>
      </Pressable>

      <Modal visible={createOpen} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalSheet}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Create a group</Text>
              <Pressable onPress={() => setCreateOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.inkMuted} />
              </Pressable>
            </View>
            <Text style={st.fieldLabel}>Name</Text>
            <TextInput
              style={st.input}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="e.g. Sabbath morning circle"
              placeholderTextColor={C.inkMuted}
              testID="profile-create-group-name"
            />
            <Text style={st.fieldLabel}>Lesson track</Text>
            <View style={st.chipRow}>
              {(["adult", "inverse"] as const).map((id) => (
                <Pressable
                  key={id}
                  onPress={() => setCurriculum(parseGroupCurriculum(id))}
                  style={[st.chip, curriculum === id && st.chipOn]}
                >
                  <Text style={[st.chipText, curriculum === id && st.chipTextOn]}>
                    {SABBATH_SCHOOL_TRACKS[id].shortLabel}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[st.primaryBtn, { marginTop: 16, opacity: createMutation.isPending ? 0.6 : 1 }]}
              onPress={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              testID="profile-create-group-submit"
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={st.primaryBtnText}>Create</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={joinOpen} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalSheet}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Join with code</Text>
              <Pressable onPress={() => setJoinOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.inkMuted} />
              </Pressable>
            </View>
            <Text style={st.fieldLabel}>Invite code</Text>
            <TextInput
              style={st.input}
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="e.g. K7MNPQ"
              placeholderTextColor={C.inkMuted}
              autoCapitalize="characters"
              testID="profile-join-code"
            />
            <Pressable
              style={[st.primaryBtn, { marginTop: 16, opacity: joinMutation.isPending ? 0.6 : 1 }]}
              onPress={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              testID="profile-join-submit"
            >
              {joinMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={st.primaryBtnText}>Join</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={adultOpen} animationType="fade" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalSheet} testID="adult-confirm-modal">
            <Text style={st.modalTitle}>I am 18 or over</Text>
            <Text style={[st.empty, { textAlign: "left", marginBottom: 16 }]}>
              Small groups are for adults. Confirm once that you are 18 or over. We do not check ID.
            </Text>
            <Pressable
              style={[st.primaryBtn, { opacity: adultMutation.isPending ? 0.6 : 1 }]}
              onPress={() => adultMutation.mutate()}
              disabled={adultMutation.isPending}
              testID="adult-confirm-submit"
            >
              {adultMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={st.primaryBtnText}>I am 18 or over</Text>
              )}
            </Pressable>
            <Pressable
              style={[st.outlineBtn, { marginTop: 10 }]}
              onPress={() => {
                setAdultOpen(false);
                setPendingAction(null);
              }}
            >
              <Text style={st.outlineBtnText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  orgCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  subhead: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
  },
  empty: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 14,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  groupName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  groupMeta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.coral,
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.coral,
  },
  outlineBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.coralInk,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Lora_700Bold",
    color: C.ink,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.inkMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.surface,
    color: C.ink,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: C.pill,
  },
  chipOn: { backgroundColor: PathB.coral + "22" },
  chipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.inkMuted,
  },
  chipTextOn: { color: C.coralInk },
});
