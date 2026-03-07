import React from "react";
import { View, Text, Pressable } from "react-native";
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
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B30" }} />
        <Text style={{ color: "#FF3B30", fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.5 }}>
          LIVE NOW
        </Text>
      </View>
      {activeStreams.map((stream: any) => (
        <Pressable
          key={stream.id}
          onPress={() => router.push(`/stream/${stream.id}` as any)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isDark ? "#1A1A2E" : "#F5F3EE",
            borderRadius: 16,
            padding: 14,
            gap: 12,
            marginBottom: 8,
            opacity: pressed ? 0.85 : 1,
            borderWidth: 1,
            borderColor: "#FF3B3030",
          })}
        >
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#FF3B3015",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Ionicons name="videocam" size={22} color="#FF3B30" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 14, fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
              {stream.title}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }}>
              {stream.hostDisplayName || "Host"}{stream.groupName ? ` \u00B7 ${stream.groupName}` : ""}
            </Text>
          </View>
          <View style={{
            backgroundColor: "#FF3B30",
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 10,
          }}>
            <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" }}>JOIN</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
