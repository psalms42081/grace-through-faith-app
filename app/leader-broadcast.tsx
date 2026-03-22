import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, Platform, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";

export default function LeaderBroadcastScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const isLeaderOrAdmin = user?.role === "church_leader" || user?.role === "admin";

  const { data: groupsData } = useQuery<{ groups: Array<{ id: string; name: string; memberCount: number }> }>({
    queryKey: ["/api/groups"],
    enabled: isLeaderOrAdmin,
  });

  const groups = groupsData?.groups || [];

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId) throw new Error("Please select a group");
      return apiRequest("POST", `/api/groups/${selectedGroupId}/announcements`, {
        title,
        content,
        authorName: user?.displayName || user?.username || "Leader",
      });
    },
    onSuccess: () => {
      setTitle("");
      setContent("");
      Alert.alert("Sent", "Your announcement has been broadcast to the group.");
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message || "Failed to send announcement");
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

          <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Select Group</Text>
          {groups.length === 0 ? (
            <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 }}>
              You are not a member of any groups yet.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {groups.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => setSelectedGroupId(g.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: selectedGroupId === g.id ? "#8B5CF6" : theme.border,
                      backgroundColor: selectedGroupId === g.id ? "#8B5CF620" : theme.background,
                    }}
                  >
                    <Text style={{ color: selectedGroupId === g.id ? "#8B5CF6" : theme.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium" }}>
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
              if (!title.trim()) {
                Alert.alert("Error", "Please enter an announcement title");
                return;
              }
              if (!content.trim()) {
                Alert.alert("Error", "Please enter an announcement message");
                return;
              }
              broadcastMutation.mutate();
            }}
            disabled={broadcastMutation.isPending}
            style={{ backgroundColor: "#8B5CF6", borderRadius: 12, padding: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: broadcastMutation.isPending ? 0.6 : 1 }}
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
