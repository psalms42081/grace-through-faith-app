import React from "react";
import { View, Text, StyleSheet, Pressable, ImageBackground } from "react-native";
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
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
      testID="continue-study"
      accessibilityRole="button"
      accessibilityLabel={"Continue " + item.title}
    >
      <ImageBackground
        source={require("@/assets/home-cards/study.png")}
        style={s.bgImage}
        imageStyle={s.bgImageInner}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(5,5,7,0.18)", "rgba(5,5,7,0.48)", "rgba(5,5,7,0.72)"]}
          locations={[0, 0.4, 1]}
          style={s.overlay}
        >
          <View style={s.labelRow}>
            <View style={s.labelDot} />
            <Text style={[s.label, { fontFamily: "Inter_500Medium" }]}>
              Continue Your Journey
            </Text>
          </View>

          <Text style={[s.title, { fontFamily: "Lora_700Bold" }]} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={s.metaRow}>
            <View style={[s.typeBadge, { backgroundColor: item.gradientColors[0] + "30" }]}>
              <Text style={[s.typeBadgeText, { color: item.gradientColors[0] }]}>{item.typeBadge}</Text>
            </View>
            <Text style={[s.progressText, { fontFamily: "Inter_400Regular" }]}>
              {item.subtitle}
            </Text>
          </View>

          <View style={s.bottom}>
            <LinearGradient
              colors={["#C9933A", "#A87828"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.ctaButton}
            >
              <Ionicons name="play" size={14} color="#fff" />
              <Text style={[s.ctaText, { fontFamily: "Inter_600SemiBold" }]}>Resume</Text>
            </LinearGradient>
          </View>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
  },
  bgImage: {
    width: "100%",
    minHeight: 180,
  },
  bgImageInner: {
    borderRadius: 20,
  },
  overlay: {
    padding: 22,
    paddingTop: 20,
    borderRadius: 20,
    minHeight: 180,
    justifyContent: "flex-end",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C9933A",
  },
  label: {
    fontSize: 12,
    color: "#C9933A",
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  title: {
    fontSize: 24,
    color: "#F5F0E8",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  progressText: {
    fontSize: 13,
    color: "rgba(245,240,232,0.5)",
    flex: 1,
  },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  ctaText: {
    color: "#fff",
    fontSize: 14,
  },
});
