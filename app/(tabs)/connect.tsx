import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Image,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CARD_IMAGES: Record<string, any> = {
  church: require("@/assets/connect-cards/church-connect.png"),
  fellowship: require("@/assets/connect-cards/live-fellowship.png"),
  family: require("@/assets/connect-cards/family-dashboard.png"),
  speakers: require("@/assets/connect-cards/speakers.png"),
  broadcasts: require("@/assets/connect-cards/broadcasts.png"),
  radio: require("@/assets/connect-cards/radio.png"),
};

interface VisualCardProps {
  imageKey: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  theme: any;
}

function VisualCard({ imageKey, title, subtitle, onPress, theme }: VisualCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.card, { opacity: pressed ? 0.9 : 1 }]}
    >
      <Image source={CARD_IMAGES[imageKey]} style={st.cardImage} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.75)", "rgba(0,0,0,0.92)"]}
        locations={[0.1, 0.6, 1]}
        style={st.cardGradient}
      />
      <View style={st.cardContent}>
        <Text style={[st.cardTitle, { fontFamily: "Inter_600SemiBold" }]}>{title}</Text>
        <Text style={[st.cardSubtitle, { fontFamily: "Inter_400Regular" }]}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function SectionLabel({ title, theme }: { title: string; theme: any }) {
  return (
    <Text style={[st.sectionLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
      {title}
    </Text>
  );
}

export default function ConnectScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
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
        <Text style={[st.tabPurpose, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {t("connect.purpose")}
        </Text>

        <SectionLabel title={t("connect.findAndConnect")} theme={theme} />

        <VisualCard
          imageKey="church"
          title={t("connect.churchConnect")}
          subtitle={t("connect.churchConnectSub")}
          onPress={() => router.push("/church-connect" as any)}
          theme={theme}
        />

        <VisualCard
          imageKey="fellowship"
          title={t("connect.smallGroups")}
          subtitle={t("connect.smallGroupsSub")}
          onPress={() => router.push("/groups" as any)}
          theme={theme}
        />

        <VisualCard
          imageKey="family"
          title={t("connect.familyDashboard")}
          subtitle={t("connect.familyDashboardSub")}
          onPress={() => router.push("/(tabs)/family" as any)}
          theme={theme}
        />

        <SectionLabel title={t("connect.watchAndListen")} theme={theme} />

        <VisualCard
          imageKey="speakers"
          title="SDA Speakers"
          subtitle="Watch sermons from Adventist teachers"
          onPress={() => router.push("/speakers" as any)}
          theme={theme}
        />

        <VisualCard
          imageKey="broadcasts"
          title={t("connect.broadcasts")}
          subtitle={t("connect.broadcastsSub")}
          onPress={() => router.push("/broadcasts" as any)}
          theme={theme}
        />

        <VisualCard
          imageKey="radio"
          title="Christian Radio"
          subtitle="Live Adventist & gospel streams"
          onPress={() => router.push("/music" as any)}
          theme={theme}
        />

        <View style={[st.useWithChurch, { backgroundColor: theme.backgroundCard }]}>
          <Ionicons name="heart" size={16} color="#C9933A" />
          <Text style={[st.useWithChurchText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            This app is designed to support your local church, Sabbath School class, small group, or school — not replace them. Use it to prepare, pray, and stay connected between gatherings.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  title: { fontSize: 28, letterSpacing: -0.3 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  tabPurpose: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
    opacity: 0.85,
  },
  sectionLabel: {
    fontSize: 16,
    letterSpacing: -0.2,
    marginTop: 10,
    marginBottom: -2,
  },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    height: 160,
    position: "relative",
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 18,
    gap: 3,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    lineHeight: 18,
  },
  useWithChurch: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  useWithChurchText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    opacity: 0.8,
  },
});
