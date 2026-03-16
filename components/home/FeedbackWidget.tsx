import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { router } from "expo-router";

interface FeedbackWidgetProps {
  theme: any;
  isDark: boolean;
}

export default function FeedbackWidget({ theme, isDark }: FeedbackWidgetProps) {
  return (
    <Pressable
      onPress={() => router.push("/feedback")}
      style={[ms.card, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", borderColor: theme.border }]}
      testID="feedback-widget"
    >
      <View style={[ms.iconWrap, { backgroundColor: theme.accent + "15" }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.accent} />
      </View>
      <View style={ms.cardContent}>
        <Text style={[ms.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          Share Feedback
        </Text>
        <Text style={[ms.cardDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Help us improve your experience
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
}

const ms = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
  },
});
