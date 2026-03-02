import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Alert,
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
  displayName: string | null;
  joinedAt: string;
}

interface GroupDetail {
  group: {
    id: string;
    name: string;
    description: string | null;
    joinCode: string;
    memberCount: number;
    createdBy: string;
    createdAt: string;
  };
  members: GroupMember[];
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [codeCopied, setCodeCopied] = useState(false);

  const { data, isLoading } = useQuery<GroupDetail>({
    queryKey: ["/api/groups", id],
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
        "Are you sure you want to leave this prayer group?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => leaveMutation.mutate() },
        ]
      );
    }
  };

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

  const { group, members } = data;

  return (
    <ScrollView
      style={[s.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
    >
      <View style={[s.groupHeader, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <View style={[s.groupIcon, { backgroundColor: theme.accent + "20" }]}>
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
            Share this code to invite others
          </Text>
          <View style={s.codeRow}>
            <Text style={[s.codeText, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
              {group.joinCode}
            </Text>
            <Ionicons
              name={codeCopied ? "checkmark-circle" : "copy-outline"}
              size={20}
              color={codeCopied ? "#7ED321" : theme.accent}
            />
          </View>
          {codeCopied && (
            <Text style={[s.copiedText, { fontFamily: "Inter_500Medium" }]}>Copied!</Text>
          )}
        </Pressable>
      </View>

      <View style={[s.section, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
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
          </View>
        ))}
      </View>

      <View style={s.prayerSection}>
        <PrayerWall groupId={id} />
      </View>

      <Pressable onPress={handleLeave} style={s.leaveBtn}>
        <Ionicons name="exit-outline" size={18} color="#FF6B6B" />
        <Text style={[s.leaveText, { fontFamily: "Inter_500Medium" }]}>Leave Group</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  groupHeader: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  groupIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  groupName: { fontSize: 22, marginTop: 4 },
  groupDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  codeCard: {
    width: "100%",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  codeLabel: { fontSize: 12 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  codeText: { fontSize: 24, letterSpacing: 3 },
  copiedText: { color: "#7ED321", fontSize: 12 },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 16, marginBottom: 12 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  memberName: { fontSize: 14, flex: 1 },
  prayerSection: { marginHorizontal: 16, marginBottom: 16 },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,107,107,0.08)",
    marginBottom: 16,
  },
  leaveText: { color: "#FF6B6B", fontSize: 14 },
});
