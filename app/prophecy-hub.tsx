import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import ScreenHeader from "@/components/ScreenHeader";

interface HubCard {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  description: string;
  route: string;
}

const PROPHECY_MODES: HubCard[] = [
  {
    id: "explorer",
    icon: "telescope",
    iconColor: "#C9933A",
    title: "Prophecy Explorer",
    subtitle: "Reference",
    description:
      "A visual reference guide to Daniel and Revelation -- symbols, timelines, and historical fulfillment",
    route: "/prophecy-explorer",
  },
  {
    id: "guided",
    icon: "school",
    iconColor: "#2E7D32",
    title: "Guided Prophecy Study",
    subtitle: "Learning Path",
    description:
      "Step-by-step lessons through Daniel and end-times prophecy, with guided progression",
    route: "/study-paths?filter=prophecy",
  },
  {
    id: "great-controversy",
    icon: "git-merge",
    iconColor: "#8B5CF6",
    title: "Great Controversy Timeline",
    subtitle: "Narrative Overview",
    description:
      "Trace the cosmic conflict from Creation through the ages to the New Earth",
    route: "/great-controversy",
  },
];

export default function ProphecyHubScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="Prophecy & End Times"
        subtitle="Daniel, Revelation & the Great Controversy"
        backIcon="chevron-back"
        testID="prophecy-hub-back"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            styles.introText,
            { color: theme.textSecondary, fontFamily: "Inter_400Regular" },
          ]}
        >
          Explore Adventist prophetic teaching through reference guides,
          structured study, and the grand narrative of Scripture.
        </Text>

        {PROPHECY_MODES.map((mode) => (
          <Pressable
            key={mode.id}
            testID={`prophecy-mode-${mode.id}`}
            onPress={() => router.push(mode.route as any)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.divider,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: mode.iconColor + "14" },
                ]}
              >
                <Ionicons name={mode.icon} size={22} color={mode.iconColor} />
              </View>
              <View style={styles.cardTitles}>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: theme.text, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {mode.title}
                </Text>
                <Text
                  style={[
                    styles.cardSubtitle,
                    { color: theme.textMuted, fontFamily: "Inter_500Medium" },
                  ]}
                >
                  {mode.subtitle}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.textMuted}
              />
            </View>
            <Text
              style={[
                styles.cardDesc,
                { color: theme.textSecondary, fontFamily: "Inter_400Regular" },
              ]}
            >
              {mode.description}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14 },
  introText: { fontSize: 14, lineHeight: 21, marginBottom: 4 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitles: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15 },
  cardSubtitle: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  cardDesc: { fontSize: 13, lineHeight: 19 },
});
