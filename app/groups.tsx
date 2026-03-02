import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

interface PrayerGroup {
  id: string;
  name: string;
  description: string | null;
  joinCode: string;
  memberCount: number;
  createdAt: string;
}

export default function GroupsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { isGuest } = useAuth();
  const queryClient = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery<{ groups: PrayerGroup[] }>({
    queryKey: ["/api/groups"],
    enabled: !isGuest,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/groups/create", {
        name: groupName.trim(),
        description: groupDesc.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setShowCreate(false);
      setGroupName("");
      setGroupDesc("");
      setError("");
    },
    onError: (err: any) => setError(err.message || "Failed to create group"),
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/groups/join", { joinCode: joinCode.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setShowJoin(false);
      setJoinCode("");
      setError("");
    },
    onError: (err: any) => setError(err.message || "Failed to join group"),
  });

  if (isGuest) {
    return (
      <View style={[s.emptyContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="people" size={56} color={theme.textMuted} />
        <Text style={[s.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
          Prayer Groups
        </Text>
        <Text style={[s.emptyDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Create an account to join prayer groups and connect with your church or Bible study
        </Text>
        <Pressable
          onPress={() => router.push("/(auth)/register")}
          style={[s.ctaBtn, { backgroundColor: theme.accent }]}
        >
          <Text style={[s.ctaBtnText, { fontFamily: "Inter_600SemiBold" }]}>Create Account</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/(auth)/login")}>
          <Text style={[s.linkText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
            Already have an account? Sign In
          </Text>
        </Pressable>
      </View>
    );
  }

  const groups = data?.groups || [];

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={s.actionRow}>
        <Pressable
          onPress={() => { setError(""); setShowCreate(true); }}
          style={[s.actionBtn, { backgroundColor: theme.accent }]}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={[s.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>Create Group</Text>
        </Pressable>
        <Pressable
          onPress={() => { setError(""); setShowJoin(true); }}
          style={[s.actionBtn, { backgroundColor: isDark ? "#2A2A3E" : "#E8E4DD" }]}
        >
          <Ionicons name="enter" size={18} color={theme.accent} />
          <Text style={[s.actionBtnText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>Join Group</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      ) : groups.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="people-outline" size={48} color={theme.textMuted} />
          <Text style={[s.emptyStateText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            You haven't joined any prayer groups yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/group/${item.id}`)}
              style={[s.groupCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
            >
              <View style={s.groupCardHeader}>
                <View style={[s.groupIcon, { backgroundColor: theme.accent + "20" }]}>
                  <Ionicons name="people" size={20} color={theme.accent} />
                </View>
                <View style={s.groupCardInfo}>
                  <Text style={[s.groupName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[s.groupMembers, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {item.memberCount} member{item.memberCount !== 1 ? "s" : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
              </View>
              {item.description ? (
                <Text style={[s.groupDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[s.modalTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              Create Prayer Group
            </Text>
            {error ? <Text style={s.modalError}>{error}</Text> : null}
            <TextInput
              style={[s.modalInput, { backgroundColor: isDark ? "#1A1A2E" : "#F5F3EE", color: theme.text }]}
              placeholder="Group name"
              placeholderTextColor={theme.textMuted}
              value={groupName}
              onChangeText={setGroupName}
            />
            <TextInput
              style={[s.modalInput, { backgroundColor: isDark ? "#1A1A2E" : "#F5F3EE", color: theme.text }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.textMuted}
              value={groupDesc}
              onChangeText={setGroupDesc}
              multiline
            />
            <View style={s.modalActions}>
              <Pressable onPress={() => setShowCreate(false)} style={[s.modalCancelBtn, { borderColor: theme.border }]}>
                <Text style={[s.modalCancelText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => createMutation.mutate()}
                disabled={!groupName.trim() || createMutation.isPending}
                style={[s.modalConfirmBtn, { backgroundColor: theme.accent, opacity: !groupName.trim() ? 0.5 : 1 }]}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[s.modalConfirmText, { fontFamily: "Inter_600SemiBold" }]}>Create</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showJoin} transparent animationType="fade" onRequestClose={() => setShowJoin(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[s.modalTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              Join Prayer Group
            </Text>
            <Text style={[s.modalSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Enter the group code shared by your group leader
            </Text>
            {error ? <Text style={s.modalError}>{error}</Text> : null}
            <TextInput
              style={[s.modalInput, s.codeInput, { backgroundColor: isDark ? "#1A1A2E" : "#F5F3EE", color: theme.text }]}
              placeholder="XXXX-XXXX"
              placeholderTextColor={theme.textMuted}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              maxLength={9}
            />
            <View style={s.modalActions}>
              <Pressable onPress={() => setShowJoin(false)} style={[s.modalCancelBtn, { borderColor: theme.border }]}>
                <Text style={[s.modalCancelText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => joinMutation.mutate()}
                disabled={joinCode.trim().length < 5 || joinMutation.isPending}
                style={[s.modalConfirmBtn, { backgroundColor: theme.accent, opacity: joinCode.trim().length < 5 ? 0.5 : 1 }]}
              >
                {joinMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[s.modalConfirmText, { fontFamily: "Inter_600SemiBold" }]}>Join</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 12 },
  emptyTitle: { fontSize: 24, marginTop: 8 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  ctaBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 24, marginTop: 8 },
  ctaBtnText: { color: "#fff", fontSize: 15 },
  linkText: { fontSize: 13, marginTop: 12 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: { color: "#fff", fontSize: 14 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingBottom: 80 },
  emptyStateText: { fontSize: 14, textAlign: "center", maxWidth: 240 },
  groupCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  groupCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  groupIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  groupCardInfo: { flex: 1 },
  groupName: { fontSize: 16 },
  groupMembers: { fontSize: 12, marginTop: 2 },
  groupDesc: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 },
  modalCard: { borderRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 20, textAlign: "center" },
  modalSubtitle: { fontSize: 13, textAlign: "center" },
  modalError: { color: "#FF6B6B", fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  modalInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  codeInput: { textAlign: "center", fontSize: 22, letterSpacing: 3, fontFamily: "Inter_700Bold" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  modalCancelText: { fontSize: 14 },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalConfirmText: { color: "#fff", fontSize: 14 },
});
