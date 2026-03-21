import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

type Member = {
  userId: string;
  displayName: string;
  role: string;
  joinedAt: string;
};

const roleInfo: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  pastor: { icon: "shield", color: "#C9933A", label: "Administrator" },
  elder: { icon: "star", color: "#8B5CF6", label: "Elder" },
  member: { icon: "person", color: "#666", label: "Member" },
};

export default function OrgMembersScreen() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : 0;

  const { data, isLoading } = useQuery<Member[]>({
    queryKey: [`/api/organizations/${orgId}/members`],
    enabled: !!orgId,
  });

  const members = data ?? [];

  return (
    <>
      <Stack.Screen options={{ title: "Church Members", headerStyle: { backgroundColor: "#0D0D15" }, headerTintColor: "#E8DCC8" }} />
      <View style={[s.container, { paddingTop: topPad }]}>
        {isLoading ? (
          <ActivityIndicator color="#C9933A" style={{ marginTop: 40 }} />
        ) : members.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color="#666" />
            <Text style={s.emptyText}>No members yet</Text>
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingTop: 8 }}
            renderItem={({ item }) => {
              const ri = roleInfo[item.role] || roleInfo.member;
              return (
                <View style={s.memberRow}>
                  <View style={[s.avatar, { backgroundColor: ri.color + "22" }]}>
                    <Ionicons name={ri.icon} size={20} color={ri.color} />
                  </View>
                  <View style={s.memberInfo}>
                    <Text style={s.memberName}>{item.displayName || "Member"}</Text>
                    <Text style={s.memberRole}>{ri.label}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D15" },
  empty: {
    alignItems: "center",
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#666",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.15)",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  memberInfo: { flex: 1 },
  memberName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#E8DCC8",
  },
  memberRole: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888",
    marginTop: 2,
  },
});
