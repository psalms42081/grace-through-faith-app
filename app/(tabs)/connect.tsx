import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import FeatureTutorial from "@/components/FeatureTutorial";
import { CONNECT_TUTORIAL_STEPS } from "@/lib/tutorial-steps";
import ListItem from "@/components/ui/ListItem";
import Badge from "@/components/ui/Badge";

import SectionHeaderShared from "@/components/SectionHeader";

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
        <SectionHeaderShared title={t("connect.findAChurch")} color={theme.text} />

        <ListItem
          icon="location"
          iconColor="#C9933A"
          title={t("connect.churchConnect")}
          subtitle={t("connect.churchConnectSub")}
          onPress={() => router.push("/church-connect" as any)}
          style={{ marginBottom: 10 }}
        />

        <SectionDivider theme={theme} />

        <SectionHeaderShared title="Watch & Listen" color={theme.text} />

        <ListItem
          icon="tv"
          iconColor="#E8456B"
          title={t("connect.broadcasts")}
          subtitle={t("connect.broadcastsSub")}
          onPress={() => router.push("/broadcasts" as any)}
          style={{ marginBottom: 10 }}
        />

        <ListItem
          icon="videocam"
          iconColor="#E8456B"
          title={t("connect.liveStreams")}
          subtitle={t("connect.liveStreamsSub")}
          showChevron={false}
          rightElement={<Badge label={t("connect.soon")} variant="filled" />}
          style={{ marginBottom: 10 }}
        />

        <ListItem
          icon="radio"
          iconColor="#C9933A"
          title="Christian Radio"
          subtitle="Live Adventist & gospel streams"
          onPress={() => router.push("/music" as any)}
          style={{ marginBottom: 10 }}
        />

        <SectionDivider theme={theme} />

        <SectionHeaderShared title={t("connect.community")} color={theme.text} />

        <ListItem
          icon="people-circle"
          iconColor="#10B981"
          title={t("connect.smallGroups")}
          subtitle={t("connect.smallGroupsSub")}
          onPress={() => router.push("/groups" as any)}
          style={{ marginBottom: 10 }}
        />

        <SectionDivider theme={theme} />

        <SectionHeaderShared title={t("connect.family")} color={theme.text} />

        <ListItem
          icon="home"
          iconColor="#5B86E5"
          title={t("connect.familyDashboard")}
          subtitle={t("connect.familyDashboardSub")}
          onPress={() => router.push("/(tabs)/family" as any)}
          style={{ marginBottom: 10 }}
        />
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
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 24,
    opacity: 0.6,
  },
});
