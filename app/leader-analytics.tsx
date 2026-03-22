import React from "react";
import { View, Text, Platform, ScrollView, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";

export default function LeaderAnalyticsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const isLeaderOrAdmin = user?.role === "church_leader" || user?.role === "admin";

  const { data: groupsData, isLoading } = useQuery<{ groups: Array<{ id: string; name: string; memberCount: number; groupType: string; createdAt: string }> }>({
    queryKey: ["/api/groups"],
    enabled: isLeaderOrAdmin,
  });

  const groups = groupsData?.groups || [];
  const totalMembers = groups.reduce((sum, g) => sum + (g.memberCount || 0), 0);

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
          title: "Church Member Analytics",
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: webTopInset + 20, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <View style={{ flex: 1, backgroundColor: theme.backgroundCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border, alignItems: "center" }}>
                <Ionicons name="people" size={28} color="#3B82F6" />
                <Text style={{ color: theme.text, fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 8 }}>{totalMembers}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" }}>Total Members</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: theme.backgroundCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border, alignItems: "center" }}>
                <Ionicons name="layers" size={28} color="#8B5CF6" />
                <Text style={{ color: theme.text, fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 8 }}>{groups.length}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" }}>Groups</Text>
              </View>
            </View>

            <Text style={{ color: theme.text, fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 12 }}>Your Groups</Text>

            {groups.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 30 }}>
                <Ionicons name="analytics-outline" size={48} color={theme.textMuted} />
                <Text style={{ color: theme.textSecondary, fontSize: 15, fontFamily: "Inter_500Medium", marginTop: 12 }}>
                  No groups to show analytics for
                </Text>
              </View>
            )}

            {groups.map((group) => (
              <View
                key={group.id}
                style={{ backgroundColor: theme.backgroundCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 12 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#8B5CF620", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="people" size={18} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>{group.name}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                      {group.groupType || "General"} · Created {new Date(group.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="person-outline" size={14} color={theme.textMuted} />
                    <Text style={{ color: theme.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium" }}>{group.memberCount} members</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
