import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Platform, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { SWEEP_LIGHT } from "@/constants/light-sweep";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { apiRequest } from "@/lib/query-client";

export default function LeaderBroadcastScreen() {
  const theme = SWEEP_LIGHT;
  const { user } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const isLeaderOrAdmin = user?.role === "church_leader" || user?.role === "admin";

  const { data: groupsData } = useQuery<{ groups: Array<{ id: string; name: string; memberCount: number }> }>({
    queryKey: ["/api/groups"],
    enabled: isLeaderOrAdmin,
  });

  const { data: orgData } = useQuery<{ organization: { id: string; name: string; memberCount: number } }>({
    queryKey: ["/api/organizations/my-org"],
    enabled: isLeaderOrAdmin && !!user?.organizationId,
  });

  const groups = groupsData?.groups || [];
  const org = orgData?.organization;

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTarget) throw new Error("Please select a target");
      if (selectedTarget.startsWith("org:")) {
        const orgId = selectedTarget.replace("org:", "");
        return apiRequest("POST", `/api/organizations/${orgId}/announcement`, {
          title,
          content,
          authorName: user?.displayName || user?.username || "Leader",
        });
      }
      return apiRequest("POST", `/api/groups/${selectedTarget}/announcements`, {
        title,
        content,
        authorName: user?.displayName || user?.username || "Leader",
      });
    },
    onSuccess: () => {
      setTitle("");
      setContent("");
      const targetLabel = selectedTarget?.startsWith("org:") ? "your organization" : "the group";
      showToast(`Your announcement has been broadcast to ${targetLabel}.`, "success");
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to send announcement", "error");
    },
  });

  if (!isLeaderOrAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Stack.Screen options={{ title: "Access Denied", headerShown: true, headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.text }} />
        <Ionicons name="lock-closed" size={48} color={theme.textMuted} />
        <Text style={{ color: theme.textSecondary, fontSize: 15, fontFamily: "Inter_500Medium", marginTop: 12, textAlign: "center" }}>Leader access required</Text>
      </View>
    );
  }

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const hasTargets = groups.length > 0 || !!org;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: "Broadcast Announcements",
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: webTopInset + 20, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ backgroundColor: theme.backgroundCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ color: theme.text, fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 16 }}>
            New Announcement
          </Text>

          <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Send To</Text>
          {!hasTargets ? (
            <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 }}>
              You are not a member of any groups or organizations yet.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {org && (
                  <Pressable
                    onPress={() => setSelectedTarget(`org:${org.id}`)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: selectedTarget === `org:${org.id}` ? PathB.coral : theme.border,
                      backgroundColor: selectedTarget === `org:${org.id}` ? PathB.coral + "20" : theme.background,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Ionicons name="business" size={14} color={selectedTarget === `org:${org.id}` ? PathB.coral : theme.textMuted} />
                    <Text style={{ color: selectedTarget === `org:${org.id}` ? PathB.coralInk : theme.textSecondary, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                      {org.name} ({org.memberCount})
                    </Text>
                  </Pressable>
                )}
                {groups.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => setSelectedTarget(g.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: selectedTarget === g.id ? "#8B5CF6" : theme.border,
                      backgroundColor: selectedTarget === g.id ? "#8B5CF620" : theme.background,
                    }}
                  >
                    <Text style={{ color: selectedTarget === g.id ? "#8B5CF6" : theme.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium" }}>
                      {g.name} ({g.memberCount})
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}

          <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Title</Text>
          <TextInput
            style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 12, borderWidth: 1, borderColor: theme.border }}
            value={title}
            onChangeText={setTitle}
            placeholder="Announcement title"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Message</Text>
          <TextInput
            style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 16, borderWidth: 1, borderColor: theme.border, minHeight: 100, textAlignVertical: "top" }}
            value={content}
            onChangeText={setContent}
            placeholder="Write your announcement..."
            placeholderTextColor={theme.textMuted}
            multiline
          />

          <Pressable
            onPress={() => {
              if (!selectedTarget) {
                showToast("Please select who to send this to", "error");
                return;
              }
              if (!title.trim()) {
                showToast("Please enter an announcement title", "error");
                return;
              }
              if (!content.trim()) {
                showToast("Please enter an announcement message", "error");
                return;
              }
              broadcastMutation.mutate();
            }}
            disabled={broadcastMutation.isPending}
            style={{ backgroundColor: PathB.coral, borderRadius: 12, padding: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: broadcastMutation.isPending ? 0.6 : 1 }}
          >
            {broadcastMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="megaphone-outline" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" }}>Send Broadcast</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
