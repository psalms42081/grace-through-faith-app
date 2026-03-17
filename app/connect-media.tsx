import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";

const CARD_IMAGES: Record<string, any> = {
  speakers: require("@/assets/connect-cards/speakers.png"),
  broadcasts: require("@/assets/connect-cards/broadcasts.png"),
  radio: require("@/assets/connect-cards/radio.png"),
};

function MediaCard({
  imageKey,
  title,
  subtitle,
  onPress,
}: {
  imageKey: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        st.card,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Image source={CARD_IMAGES[imageKey]} style={st.cardImage} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.88)"]}
        locations={[0, 0.35, 1]}
        style={st.cardGradient}
      />
      <View style={st.cardContent}>
        <View style={{ flex: 1 }}>
          <Text style={[st.cardTitle, { fontFamily: "Inter_600SemiBold" }]}>{title}</Text>
          <Text style={[st.cardSub, { fontFamily: "Inter_400Regular" }]}>{subtitle}</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
      </View>
    </Pressable>
  );
}

export default function ConnectMediaScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <View style={[st.headerBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={st.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[st.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Watch & Listen
          </Text>
          <Text style={[st.headerSub, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Sermons, broadcasts, and live streams
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: bottomPad + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.cards}>
          <MediaCard
            imageKey="speakers"
            title="SDA Speakers"
            subtitle="Watch sermons from Adventist teachers"
            onPress={() => router.push("/speakers" as any)}
          />
          <MediaCard
            imageKey="broadcasts"
            title="Broadcasts"
            subtitle="Hope Channel, 3ABN, and Adventist networks"
            onPress={() => router.push("/broadcasts" as any)}
          />
          <MediaCard
            imageKey="radio"
            title="Christian Radio"
            subtitle="Live Adventist and gospel streams"
            onPress={() => router.push("/music" as any)}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 22, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, marginTop: 2, opacity: 0.85 },
  cards: { gap: 12 },
  card: {
    borderRadius: 18,
    overflow: "hidden" as const,
    height: 130,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%" as any,
    height: "100%" as any,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 10,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 3,
  },
  cardSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
  },
});
