import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";

interface LiveNowSectionProps {
  theme: typeof Colors.dark;
  isDark: boolean;
}

export default function LiveNowSection({ theme, isDark }: LiveNowSectionProps) {
  const { data: activeStreams } = useQuery<any[]>({
    queryKey: ["/api/streams/active"],
    refetchInterval: 30000,
  });

  if (!activeStreams || activeStreams.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.liveDot} />
        <Text style={styles.liveLabel}>
          LIVE FELLOWSHIP
        </Text>
      </View>
      {activeStreams.map((stream: any) => (
        <Pressable
          key={stream.id}
          onPress={() => router.push(`/stream/${stream.id}` as any)}
          accessibilityLabel="Join live stream"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.streamCard,
            { backgroundColor: isDark ? "#1A1A2E" : "#F5F3EE", opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={styles.streamIconWrap}>
            <Ionicons name="videocam" size={22} color="#FF3B30" />
          </View>
          <View style={styles.streamInfo}>
            <Text style={[styles.streamTitle, { color: theme.text }]} numberOfLines={1}>
              {stream.title}
            </Text>
            <Text style={[styles.streamHost, { color: theme.textMuted }]}>
              {stream.hostDisplayName || "Host"}{stream.groupName ? ` \u00B7 ${stream.groupName}` : ""}
            </Text>
          </View>
          <View style={styles.joinBtn}>
            <Text style={styles.joinText}>JOIN</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B30" },
  liveLabel: { color: "#FF3B30", fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  streamCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, gap: 12, marginBottom: 8, borderWidth: 1, borderColor: "#FF3B3030" },
  streamIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FF3B3015", alignItems: "center", justifyContent: "center" },
  streamInfo: { flex: 1 },
  streamTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  streamHost: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  joinBtn: { backgroundColor: "#FF3B30", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  joinText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
});
