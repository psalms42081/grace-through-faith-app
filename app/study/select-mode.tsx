import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

interface ModeOption {
  id: "quick_read" | "guided_study" | "deep_study";
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  layers?: string;
}

const MODES: ModeOption[] = [
  {
    id: "quick_read",
    title: "Quick Read",
    description: "Simply read the passage",
    icon: "book-outline",
    color: "#3B82F6",
  },
  {
    id: "guided_study",
    title: "Guided Study",
    description: "AI tutor walks you through key insights",
    icon: "chatbubbles-outline",
    color: "#8B5CF6",
  },
  {
    id: "deep_study",
    title: "Deep Study",
    description: "Observe \u00B7 Context \u00B7 Insight \u00B7 Respond",
    icon: "layers-outline",
    color: "#C9933A",
    layers: "4-Layer",
  },
];

export default function SelectModeScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSelect = (mode: ModeOption) => {
    switch (mode.id) {
      case "quick_read":
        router.replace("/(tabs)/read" as any);
        break;
      case "guided_study":
        router.push("/study-guide" as any);
        break;
      case "deep_study":
        router.push({ pathname: "/(tabs)/study", params: { showIntro: "true", _t: String(Date.now()) } } as any);
        break;
    }
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { paddingTop: topPad + 20 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.accent} />
        </Pressable>
        <Text style={[s.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Study Scripture
        </Text>
        <Text style={[s.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Choose how you'd like to study today
        </Text>
      </View>

      <View style={[s.cardList, { paddingBottom: bottomPad + 40 }]}>
        {MODES.map((mode) => (
          <Pressable
            key={mode.id}
            onPress={() => handleSelect(mode)}
            testID={`study-mode-${mode.id}`}
            style={({ pressed }) => [
              s.card,
              {
                backgroundColor: isDark ? "#111118" : "#FFFDF8",
                borderColor: isDark ? mode.color + "30" : mode.color + "25",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[s.iconWrap, { backgroundColor: mode.color + "15" }]}>
              <Ionicons name={mode.icon} size={26} color={mode.color} />
            </View>
            <View style={s.cardText}>
              <View style={s.titleRow}>
                <Text style={[s.cardTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  {mode.title}
                </Text>
                {mode.layers && (
                  <View style={[s.layerBadge, { backgroundColor: mode.color + "18" }]}>
                    <Text style={[s.layerBadgeText, { color: mode.color, fontFamily: "Inter_600SemiBold" }]}>
                      {mode.layers}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[s.cardDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {mode.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 28 },
  backBtn: { marginBottom: 16, width: 36 },
  title: { fontSize: 26, marginBottom: 6 },
  subtitle: { fontSize: 15, lineHeight: 21 },
  cardList: { flex: 1, paddingHorizontal: 20, gap: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 17 },
  layerBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  layerBadgeText: { fontSize: 10 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
});
