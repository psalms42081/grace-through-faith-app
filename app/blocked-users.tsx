import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { useToast } from "@/contexts/ToastContext";
import { apiRequest } from "@/lib/query-client";
import { safeGoBack } from "@/lib/safe-back";
import { useBlockedUsers } from "@/components/ReportOrBlock";

export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useBlockedUsers();
  const blocked = data?.blocked ?? [];

  const unblock = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/ugc/blocks/${encodeURIComponent(userId)}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/ugc/blocks"] });
    },
    onError: () => showToast("Could not unblock this member. Please try again.", "error"),
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => safeGoBack(router)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          testID="blocked-users-back"
        >
          <Ionicons name="arrow-back" size={24} color={PathB.ink} />
        </Pressable>
        <Text style={styles.title}>Blocked users</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }}
      >
        {isLoading ? (
          <ActivityIndicator color={PathB.coral} style={{ marginTop: 32 }} />
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Couldn't load blocked users.</Text>
            <Pressable onPress={() => void refetch()} style={styles.retry} testID="blocked-users-retry">
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : blocked.length === 0 ? (
          <Text style={styles.emptyText} testID="blocked-users-empty">
            You haven't blocked anyone.
          </Text>
        ) : (
          blocked.map((person) => (
            <View key={person.userId} style={styles.row} testID={`blocked-user-${person.userId}`}>
              <Text style={styles.name}>{person.displayName || "Member"}</Text>
              <Pressable
                onPress={() => unblock.mutate(person.userId)}
                disabled={unblock.isPending}
                style={styles.unblock}
                accessibilityRole="button"
                accessibilityLabel={`Unblock ${person.displayName || "member"}`}
                testID={`blocked-user-unblock-${person.userId}`}
              >
                <Text style={styles.unblockText}>Unblock</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PathB.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Lora_700Bold",
    color: PathB.ink,
  },
  empty: { marginTop: 24, gap: 12 },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "#6B6660",
  },
  retry: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  retryText: { fontSize: 16, lineHeight: 22, color: PathB.coralInk, fontFamily: "Inter_600SemiBold" },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7E0D2",
  },
  name: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 140,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Inter_500Medium",
    color: PathB.ink,
  },
  unblock: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unblockText: {
    fontSize: 16,
    lineHeight: 22,
    color: PathB.coralInk,
    fontFamily: "Inter_600SemiBold",
  },
});
