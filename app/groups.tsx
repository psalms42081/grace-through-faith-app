import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";

interface SmallGroup {
  id: string;
  name: string;
  description: string | null;
  joinCode: string;
  memberCount: number;
  groupType: string;
  isPublic: boolean;
  createdAt: string;
}

const GROUP_TYPES = [
  { key: "all", label: "All", icon: "grid" as const },
  { key: "bible-study", label: "Bible Study", icon: "book" as const },
  { key: "prayer", label: "Prayer", icon: "heart" as const },
  { key: "prophecy", label: "Prophecy", icon: "telescope" as const },
  { key: "youth", label: "Youth", icon: "people" as const },
  { key: "sabbath-school", label: "Sabbath School", icon: "school" as const },
];

type TabMode = "my" | "browse";

export default function GroupsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isGuest, userId } = useAuth();
  const queryClient = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [tab, setTab] = useState<TabMode>("my");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupType, setGroupType] = useState("bible-study");
  const [isPublic, setIsPublic] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");

  const { data: myData, isLoading: myLoading } = useQuery<{ groups: SmallGroup[] }>({
    queryKey: ["/api/groups"],
    enabled: !isGuest,
  });

  const { data: publicGroups, isLoading: publicLoading } = useQuery<SmallGroup[]>({
    queryKey: [`/api/groups/public?type=${filterType}&search=${searchText}`],
    enabled: tab === "browse",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/groups/create", {
        name: groupName.trim(),
        description: groupDesc.trim() || null,
        groupType,
        isPublic,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setShowCreate(false);
      setGroupName("");
      setGroupDesc("");
      setGroupType("bible-study");
      setIsPublic(false);
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

  const joinPublicMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest("POST", "/api/groups/join", { joinCode: code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/public?type=${filterType}&search=${searchText}`] });
    },
  });

  const myGroupIds = useMemo(() => {
    return new Set((myData?.groups || []).map(g => g.id));
  }, [myData]);

  if (isGuest) {
    return (
      <View style={[s.emptyContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="people" size={56} color={theme.textMuted} />
        <Text style={[s.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
          Small Groups
        </Text>
        <Text style={[s.emptyDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Create an account to join small groups and connect with your church community
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

  const groups = myData?.groups || [];

  const getTypeIcon = (t: string): keyof typeof Ionicons.glyphMap => {
    const found = GROUP_TYPES.find(gt => gt.key === t);
    return (found?.icon || "people") as keyof typeof Ionicons.glyphMap;
  };

  const getTypeLabel = (t: string): string => {
    const found = GROUP_TYPES.find(gt => gt.key === t);
    return found?.label || t;
  };

  const renderGroupCard = (item: SmallGroup, showJoinBtn?: boolean) => (
    <Pressable
      key={item.id}
      onPress={() => {
        if (myGroupIds.has(item.id)) {
          router.push(`/group/${item.id}`);
        }
      }}
      style={[s.groupCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
    >
      <View style={s.groupCardHeader}>
        <View style={[s.groupIcon, { backgroundColor: theme.accent + "20" }]}>
          <Ionicons name={getTypeIcon(item.groupType)} size={20} color={theme.accent} />
        </View>
        <View style={s.groupCardInfo}>
          <Text style={[s.groupName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={s.groupMeta}>
            <Text style={[s.groupMembers, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {item.memberCount} member{item.memberCount !== 1 ? "s" : ""}
            </Text>
            <View style={[s.typeBadge, { backgroundColor: theme.accent + "15" }]}>
              <Text style={[s.typeBadgeText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                {getTypeLabel(item.groupType)}
              </Text>
            </View>
          </View>
        </View>
        {myGroupIds.has(item.id) ? (
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        ) : showJoinBtn ? (
          <Pressable
            onPress={() => joinPublicMutation.mutate(item.joinCode)}
            style={[s.joinBadge, { backgroundColor: theme.accent }]}
          >
            <Text style={[s.joinBadgeText, { fontFamily: "Inter_600SemiBold" }]}>Join</Text>
          </Pressable>
        ) : null}
      </View>
      {item.description ? (
        <Text style={[s.groupDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
    </Pressable>
  );

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={s.tabRow}>
        <Pressable
          onPress={() => setTab("my")}
          style={[s.tabBtn, tab === "my" && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
        >
          <Text style={[s.tabText, { color: tab === "my" ? theme.accent : theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            My Groups
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("browse")}
          style={[s.tabBtn, tab === "browse" && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
        >
          <Text style={[s.tabText, { color: tab === "browse" ? theme.accent : theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Browse
          </Text>
        </Pressable>
      </View>

      {tab === "my" ? (
        <>
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

          {myLoading ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
          ) : groups.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="people-outline" size={48} color={theme.textMuted} />
              <Text style={[s.emptyStateText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                You haven't joined any groups yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={groups}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
              renderItem={({ item }) => renderGroupCard(item)}
            />
          )}
        </>
      ) : (
        <>
          <View style={[s.searchRow, { backgroundColor: isDark ? "#1A1A2E" : "#F5F3EE", borderColor: theme.border }]}>
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              style={[s.searchInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
              placeholder="Search groups..."
              placeholderTextColor={theme.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText ? (
              <Pressable onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
            {GROUP_TYPES.map((gt) => (
              <Pressable
                key={gt.key}
                onPress={() => setFilterType(gt.key)}
                style={[
                  s.filterChip,
                  {
                    backgroundColor: filterType === gt.key ? theme.accent : (isDark ? "#1A1A2E" : "#F5F3EE"),
                    borderColor: filterType === gt.key ? theme.accent : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name={gt.icon as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={filterType === gt.key ? "#fff" : theme.textSecondary}
                />
                <Text style={[s.filterText, { color: filterType === gt.key ? "#fff" : theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  {gt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {publicLoading ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
          ) : (publicGroups || []).length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="globe-outline" size={48} color={theme.textMuted} />
              <Text style={[s.emptyStateText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                No public groups found
              </Text>
            </View>
          ) : (
            <FlatList
              data={publicGroups}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
              renderItem={({ item }) => renderGroupCard(item, true)}
            />
          )}
        </>
      )}

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={s.modalOverlay}>
          <ScrollView contentContainerStyle={s.modalScrollContent}>
            <View style={[s.modalCard, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[s.modalTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Create Small Group
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

              <Text style={[s.fieldLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                Group Type
              </Text>
              <View style={s.typeGrid}>
                {GROUP_TYPES.filter(t => t.key !== "all").map((gt) => (
                  <Pressable
                    key={gt.key}
                    onPress={() => setGroupType(gt.key)}
                    style={[
                      s.typeOption,
                      {
                        backgroundColor: groupType === gt.key ? theme.accent + "20" : (isDark ? "#1A1A2E" : "#F5F3EE"),
                        borderColor: groupType === gt.key ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={gt.icon as keyof typeof Ionicons.glyphMap}
                      size={16}
                      color={groupType === gt.key ? theme.accent : theme.textMuted}
                    />
                    <Text
                      style={[
                        s.typeOptionText,
                        {
                          color: groupType === gt.key ? theme.accent : theme.textSecondary,
                          fontFamily: "Inter_500Medium",
                        },
                      ]}
                    >
                      {gt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => setIsPublic(!isPublic)}
                style={s.toggleRow}
              >
                <View style={s.toggleInfo}>
                  <Text style={[s.toggleLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                    Public Group
                  </Text>
                  <Text style={[s.toggleDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    Anyone can find and join
                  </Text>
                </View>
                <View style={[s.toggleSwitch, { backgroundColor: isPublic ? theme.accent : (isDark ? "#333" : "#DDD") }]}>
                  <View style={[s.toggleKnob, { transform: [{ translateX: isPublic ? 18 : 2 }] }]} />
                </View>
              </Pressable>

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
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showJoin} transparent animationType="fade" onRequestClose={() => setShowJoin(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[s.modalTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              Join Group
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
  tabRow: { flexDirection: "row", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 14 },
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  filterRow: { marginBottom: 12, maxHeight: 40 },
  filterContent: { gap: 8, paddingRight: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 12 },
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
  groupMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  groupMembers: { fontSize: 12 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  typeBadgeText: { fontSize: 10 },
  groupDesc: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  joinBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14 },
  joinBadgeText: { color: "#fff", fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 },
  modalScrollContent: { flexGrow: 1, justifyContent: "center" },
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
  fieldLabel: { fontSize: 13, marginTop: 4 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeOptionText: { fontSize: 12 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 14 },
  toggleDesc: { fontSize: 11, marginTop: 2 },
  toggleSwitch: { width: 44, height: 24, borderRadius: 12, justifyContent: "center" },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
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
