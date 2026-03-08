import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import type { ResumeItem } from "@/hooks/useResumeJourney";

interface ContinueCardProps {
  item: ResumeItem | null;
  theme: typeof Colors.dark;
  isDark: boolean;
}

export default function ContinueCard({ item, theme, isDark }: ContinueCardProps) {
  if (!item) return null;

  const handlePress = () => {
    const params = item.params || {};
    const queryStr = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    const fullRoute = queryStr ? `${item.route}?${queryStr}` : item.route;
    router.push(fullRoute as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        s.card,
        { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
      ]}
      testID="home-continue-card"
      accessibilityRole="button"
      accessibilityLabel={"Continue " + item.title}
    >
      <View style={s.top}>
        <LinearGradient
          colors={item.gradientColors}
          style={s.iconWrap}
        >
          <Ionicons name={item.icon as any} size={20} color="#fff" />
        </LinearGradient>
        <View style={s.info}>
          <Text style={[s.label, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Continue Your Journey
          </Text>
          <Text style={[s.title, { color: theme.text, fontFamily: "Lora_600SemiBold" }]} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
      </View>
      <View style={s.metaRow}>
        <View style={[s.typeBadge, { backgroundColor: item.gradientColors[0] + "18" }]}>
          <Text style={[s.typeBadgeText, { color: item.gradientColors[0] }]}>{item.typeBadge}</Text>
        </View>
        <Text style={[s.progressText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {item.subtitle}
        </Text>
      </View>
      <View style={s.bottom}>
        <View style={[s.ctaButton, { backgroundColor: theme.accent + "18" }]}>
          <Text style={[s.ctaText, { color: theme.accent }]}>Resume</Text>
          <Ionicons name="arrow-forward" size={14} color={theme.accent} />
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  label: { fontSize: 12, marginBottom: 3 },
  title: { fontSize: 19 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    paddingLeft: 58,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  progressText: {
    fontSize: 13,
    flex: 1,
  },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(201,147,58,0.15)",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
