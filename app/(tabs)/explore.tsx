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
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORY_IMAGES: Record<string, any> = {
  "study-scripture": require("@/assets/topic-cards/deep-study.png"),
  "sabbath-prayer": require("@/assets/topic-cards/fundamental-beliefs.png"),
  "learning-paths": require("@/assets/topic-cards/study-paths.png"),
  "study-tools": require("@/assets/topic-cards/maps-timeline.png"),
  "adventist-studies": require("@/assets/topic-cards/three-angels.png"),
  "prophecy-end-times": require("@/assets/topic-cards/three-angels.png"),
  "spiritual-themes": require("@/assets/topic-cards/grace.png"),
};

const SIGNPOST_IMAGE = require("@/assets/topic-cards/wisdom.png");
const SABBATH_IMAGE = require("@/assets/topic-cards/prayer.png");

const CATEGORIES = [
  {
    id: "study-scripture",
    title: "Study Scripture",
    subtitle: "Quick Read, Guided Study, Deep Dive",
    icon: "book" as const,
  },
  {
    id: "sabbath-prayer",
    title: "Sabbath School & Prayer",
    subtitle: "Weekly lesson, Prayer Journal",
    icon: "calendar" as const,
  },
  {
    id: "prophecy-end-times",
    title: "Prophecy & End Times",
    subtitle: "Daniel, Revelation & the Great Controversy",
    icon: "telescope" as const,
  },
  {
    id: "spiritual-themes",
    title: "Spiritual Themes",
    subtitle: "Love, Faith, Prayer, Peace, Hope & more",
    icon: "heart" as const,
  },
  {
    id: "adventist-studies",
    title: "New Believers",
    subtitle: "Core Adventist beliefs — start your journey here",
    icon: "school" as const,
  },
  {
    id: "study-tools",
    title: "Study Tools",
    subtitle: "Historic Voices, Bible Maps, Timeline",
    icon: "compass" as const,
  },
];

function CategoryCard({
  id,
  title,
  subtitle,
  badge,
  onPress,
}: {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={`study-cat-${id}`}
      style={({ pressed }) => [
        st.categoryCard,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Image source={CATEGORY_IMAGES[id]} style={st.categoryBg} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.30)", "rgba(0,0,0,0.70)"]}
        locations={[0, 0.35, 1]}
        style={st.categoryOverlay}
      >
        <View style={st.categoryContent}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[st.categoryTitle, { fontFamily: "Inter_600SemiBold" }]}>
                {title}
              </Text>
              {badge && (
                <View style={st.badge}>
                  <Text style={[st.badgeText, { fontFamily: "Inter_600SemiBold" }]}>{badge}</Text>
                </View>
              )}
            </View>
            <Text style={[st.categorySub, { fontFamily: "Inter_400Regular" }]}>
              {subtitle}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const HUB_OWNED_TRACK_CATEGORIES = new Set(["beliefs", "prophecy"]);

function EnrolledTracksPreview({ theme }: { theme: typeof Colors.dark }) {
  const { userId } = useAuth();
  const { data: progressData } = useQuery<any[]>({
    queryKey: [`/api/tracks/progress?userId=${userId}`],
  });

  const enrolled = progressData?.filter(
    (p: any) => p.track && !HUB_OWNED_TRACK_CATEGORIES.has(p.track?.category)
  ) || [];
  if (enrolled.length === 0) return null;

  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[st.sectionLabel, { color: theme.textMuted, fontFamily: "Inter_600SemiBold", paddingLeft: 2, marginBottom: 12 }]}>
        Active Paths
      </Text>
      {enrolled.map((p: any) => (
        <Pressable
          key={p.id}
          onPress={() => router.push(`/study-path/${p.trackId}` as any)}
          style={({ pressed }) => [
            st.enrolledCard,
            { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[st.enrolledIcon, { backgroundColor: (p.track?.color || "#C9933A") + "18" }]}>
            <Ionicons name={(p.track?.icon as any) || "school"} size={18} color={p.track?.color || "#C9933A"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.enrolledTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {p.track?.title}
            </Text>
            <View style={st.enrolledProgress}>
              <View style={[st.enrolledBar, { backgroundColor: theme.divider }]}>
                <View style={[st.enrolledBarFill, { width: `${p.percentComplete || 0}%`, backgroundColor: "#C9933A" }]} />
              </View>
              <Text style={[st.enrolledPercent, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {p.percentComplete || 0}%
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

export default function StudyScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <View style={[st.header, { paddingTop: topPad + 16, backgroundColor: theme.background }]}>
        <Text style={[st.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Study
        </Text>
        <Text style={[st.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Scripture, Sabbath School, and tools for deeper growth.
        </Text>
      </View>

      <ScrollView
        style={st.scrollView}
        contentContainerStyle={[st.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.categoryCards}>
          {CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              id={cat.id}
              title={cat.title}
              subtitle={cat.subtitle}
              badge={
                cat.id === "study-scripture"
                  ? "Start here"
                  : cat.id === "prophecy-end-times"
                  ? "SDA Distinctive"
                  : cat.id === "adventist-studies"
                  ? "New to faith?"
                  : undefined
              }
              onPress={() =>
                cat.id === "prophecy-end-times"
                  ? router.push("/prophecy-hub" as any)
                  : router.push({ pathname: "/study-category", params: { category: cat.id } } as any)
              }
            />
          ))}
        </View>

        <View style={st.infoGroup}>
          <Pressable
            onPress={() => router.push("/touchpoints" as any)}
            testID="touchpoints-card"
            style={({ pressed }) => [
              st.infoCard,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Image source={SIGNPOST_IMAGE} style={st.infoBg} resizeMode="cover" />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.30)", "rgba(0,0,0,0.70)"]}
              locations={[0, 0.35, 1]}
              style={st.infoOverlay}
            >
              <View style={st.infoContent}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.infoTitle, { fontFamily: "Inter_600SemiBold" }]}>
                    Signposts
                  </Text>
                  <Text style={[st.infoSub, { fontFamily: "Inter_400Regular" }]}>
                    What does the Bible say about life's toughest questions?
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={st.dividerRow}>
          <View style={[st.dividerLine, { backgroundColor: "rgba(201,147,58,0.35)" }]} />
          <View style={[st.dividerDot, { backgroundColor: "rgba(201,147,58,0.5)" }]} />
          <View style={[st.dividerDotCenter, { backgroundColor: "rgba(201,147,58,0.75)" }]} />
          <View style={[st.dividerDot, { backgroundColor: "rgba(201,147,58,0.5)" }]} />
          <View style={[st.dividerLine, { backgroundColor: "rgba(201,147,58,0.35)" }]} />
        </View>

        <EnrolledTracksPreview theme={theme} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: { fontSize: 28, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, marginTop: 6, lineHeight: 21, opacity: 0.85 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 24 },

  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
  },

  categoryCards: {
    gap: 12,
  },
  categoryCard: {
    borderRadius: 18,
    overflow: "hidden" as const,
    height: 120,
  },
  categoryBg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%" as any,
    height: "100%" as any,
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end" as const,
  },
  categoryContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 10,
  },
  categoryTitle: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 3,
  },
  categorySub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
  },
  badge: {
    backgroundColor: "rgba(201,147,58,0.2)",
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.4)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#C9933A",
    fontSize: 10,
  },

  enrolledCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  enrolledIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  enrolledTitle: { fontSize: 14, marginBottom: 4 },
  enrolledProgress: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  enrolledBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  enrolledBarFill: {
    height: 4,
    borderRadius: 2,
  },
  enrolledPercent: { fontSize: 11 },

  dividerRow: {
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 6,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dividerDotCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  infoGroup: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 18,
    overflow: "hidden" as const,
    height: 130,
  },
  infoBg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%" as any,
    height: "100%" as any,
  },
  infoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end" as const,
  },
  infoContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 10,
  },
  infoTitle: {
    color: "#fff",
    fontSize: 17,
    marginBottom: 2,
  },
  infoSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
  },
});
