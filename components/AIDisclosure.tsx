import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

type DisclosureLevel = "inline" | "banner" | "notice";

interface AIDisclosureProps {
  level?: DisclosureLevel;
  context?: "study" | "kids" | "devotional" | "general";
  showLearnMore?: boolean;
  onLearnMore?: () => void;
}

const MESSAGES = {
  study: "AI-assisted study aid based on Scripture and SDA theology. Always verify with your Bible and local church.",
  kids: "AI-assisted content reviewed for age-appropriateness and biblical accuracy.",
  devotional: "AI-assisted reflection to support your personal study. Not a substitute for Scripture or pastoral guidance.",
  general: "AI-assisted content aligned with SDA beliefs. Always compare with Scripture.",
};

export default function AIDisclosure({
  level = "inline",
  context = "general",
  showLearnMore = false,
  onLearnMore,
}: AIDisclosureProps) {
  const { theme } = useTheme();

  if (level === "inline") {
    return (
      <View style={[st.inlineWrap, { backgroundColor: theme.accent + "10" }]}>
        <Ionicons name="sparkles" size={12} color={theme.accent} />
        <Text style={[st.inlineText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          AI-assisted
        </Text>
      </View>
    );
  }

  if (level === "banner") {
    return (
      <View style={[st.bannerWrap, { backgroundColor: theme.accent + "0D", borderColor: theme.accent + "20" }]}>
        <Ionicons name="sparkles" size={14} color={theme.accent} />
        <Text style={[st.bannerText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {MESSAGES[context]}
        </Text>
      </View>
    );
  }

  return (
    <View style={[st.noticeWrap, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={st.noticeHeader}>
        <Ionicons name="sparkles" size={16} color={theme.accent} />
        <Text style={[st.noticeTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          AI-Assisted Content
        </Text>
      </View>
      <Text style={[st.noticeBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
        {MESSAGES[context]}
      </Text>
      {showLearnMore && (
        <Pressable onPress={onLearnMore} style={st.learnMore}>
          <Text style={[st.learnMoreText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
            About our AI guidelines
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.accent} />
        </Pressable>
      )}
    </View>
  );
}

export function AIGeneratedLabel({ color }: { color?: string }) {
  const { theme } = useTheme();
  const c = color || theme.accent;
  return (
    <View style={[st.label, { borderColor: c + "30" }]}>
      <Ionicons name="sparkles" size={10} color={c} />
      <Text style={[st.labelText, { color: c, fontFamily: "Inter_500Medium" }]}>AI-assisted</Text>
    </View>
  );
}

export function HumanCuratedLabel() {
  const { theme } = useTheme();
  return (
    <View style={[st.label, { borderColor: "#4CAF50" + "30" }]}>
      <Ionicons name="person" size={10} color="#4CAF50" />
      <Text style={[st.labelText, { color: "#4CAF50", fontFamily: "Inter_500Medium" }]}>Curated</Text>
    </View>
  );
}

const st = StyleSheet.create({
  inlineWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  inlineText: {
    fontSize: 11,
  },
  bannerWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  bannerText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  noticeWrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginVertical: 10,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 14,
  },
  noticeBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  learnMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  learnMoreText: {
    fontSize: 13,
  },
  label: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  labelText: {
    fontSize: 10,
  },
});
