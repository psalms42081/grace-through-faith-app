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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import FeatureTutorial from "@/components/FeatureTutorial";
import { CONNECT_TUTORIAL_STEPS } from "@/lib/tutorial-steps";

function SectionHeader({ title, theme }: { title: string; theme: typeof Colors.dark }) {
  return (
    <View style={st.sectionHeader}>
      <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
        {title}
      </Text>
    </View>
  );
}

function SectionDivider({ theme }: { theme: typeof Colors.dark }) {
  return <View style={[st.divider, { backgroundColor: theme.divider }]} />;
}

export default function ConnectScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <FeatureTutorial tutorialId="connect" steps={CONNECT_TUTORIAL_STEPS} />
      <View style={[st.header, { paddingTop: topPad + 16, backgroundColor: theme.background }]}>
        <Text style={[st.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          {t("connect.title")}
        </Text>
      </View>

      <ScrollView
        style={st.scrollView}
        contentContainerStyle={[st.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title={t("connect.findAChurch")} theme={theme} />

        <Pressable
          onPress={() => router.push("/church-connect" as any)}
          style={({ pressed }) => [
            st.actionCard,
            { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[st.actionIcon, { backgroundColor: "rgba(201,147,58,0.12)" }]}>
            <Ionicons name="location" size={24} color="#C9933A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.actionTitle, { color: theme.text }]}>{t("connect.churchConnect")}</Text>
            <Text style={[st.actionSub, { color: theme.textMuted }]}>
              {t("connect.churchConnectSub")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>

        <SectionDivider theme={theme} />

        <SectionHeader title="Watch" theme={theme} />

        <Pressable
          onPress={() => router.push("/broadcasts" as any)}
          style={({ pressed }) => [
            st.actionCard,
            { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[st.actionIcon, { backgroundColor: "rgba(232,69,107,0.12)" }]}>
            <Ionicons name="tv" size={24} color="#E8456B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.actionTitle, { color: theme.text }]}>{t("connect.broadcasts")}</Text>
            <Text style={[st.actionSub, { color: theme.textMuted }]}>
              {t("connect.broadcastsSub")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>

        <View style={[st.placeholderRow, { backgroundColor: theme.backgroundCard }]}>
          <View style={[st.actionIcon, { backgroundColor: "rgba(232,69,107,0.08)" }]}>
            <Ionicons name="videocam" size={24} color="#E8456B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.actionTitle, { color: theme.text }]}>{t("connect.liveStreams")}</Text>
            <Text style={[st.actionSub, { color: theme.textMuted }]}>
              {t("connect.liveStreamsSub")}
            </Text>
          </View>
          <View style={[st.smallBadge, { backgroundColor: theme.accent + "18" }]}>
            <Text style={[st.smallBadgeText, { color: theme.accent }]}>{t("connect.soon")}</Text>
          </View>
        </View>

        <SectionDivider theme={theme} />

        <SectionHeader title={t("connect.community")} theme={theme} />

        <Pressable
          onPress={() => router.push("/groups" as any)}
          style={({ pressed }) => [
            st.actionCard,
            { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[st.actionIcon, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
            <Ionicons name="people-circle" size={24} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.actionTitle, { color: theme.text }]}>{t("connect.smallGroups")}</Text>
            <Text style={[st.actionSub, { color: theme.textMuted }]}>
              {t("connect.smallGroupsSub")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>

        <SectionDivider theme={theme} />

        <SectionHeader title={t("connect.family")} theme={theme} />

        <Pressable
          onPress={() => router.push("/(tabs)/family" as any)}
          style={({ pressed }) => [
            st.actionCard,
            { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[st.actionIcon, { backgroundColor: "rgba(91,134,229,0.12)" }]}>
            <Ionicons name="home" size={24} color="#5B86E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.actionTitle, { color: theme.text }]}>{t("connect.familyDashboard")}</Text>
            <Text style={[st.actionSub, { color: theme.textMuted }]}>
              {t("connect.familyDashboardSub")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  title: { fontSize: 24 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 22 },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 22 },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 24,
    opacity: 0.6,
  },
  placeholderCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  cardDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  comingSoonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  comingSoonText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 10,
  },
  placeholderRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 10,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  smallBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
