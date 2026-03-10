import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import FeatureTutorial from "@/components/FeatureTutorial";
import { EXPLORE_TUTORIAL_STEPS } from "@/lib/tutorial-steps";
import { TOPICS_LIST as TOPICS } from "@/data/topics";
import ListItem from "@/components/ui/ListItem";

const INSPIRATIONS = [
  { title: "Walking in the Spirit", subtitle: "Galatians 5:16-26", gradient: ["#1A1F3C", "#0D1025"] as [string, string], icon: "walk" as const, bookId: 48, chapter: 5 },
  { title: "Armor of God", subtitle: "Ephesians 6:10-18", gradient: ["#2E7D32", "#1B5E20"] as [string, string], icon: "shield-checkmark" as const, bookId: 49, chapter: 6 },
  { title: "The Lord's Prayer", subtitle: "Matthew 6:9-13", gradient: ["#C9933A", "#A87828"] as [string, string], icon: "hand-left" as const, bookId: 40, chapter: 6 },
  { title: "The Beatitudes", subtitle: "Matthew 5:3-12", gradient: ["#8B5CF6", "#6D3BD4"] as [string, string], icon: "sparkles" as const, bookId: 40, chapter: 5 },
  { title: "Love Chapter", subtitle: "1 Corinthians 13", gradient: ["#E8456B", "#C2185B"] as [string, string], icon: "heart" as const, bookId: 46, chapter: 13 },
];

function SectionDivider({ theme }: { theme: typeof Colors.dark }) {
  return <View style={[styles.divider, { backgroundColor: theme.divider }]} />;
}

function EnrolledTracksPreview({ theme }: { theme: typeof Colors.dark }) {
  const { userId } = useAuth();
  const { data: progressData } = useQuery<any[]>({
    queryKey: [`/api/tracks/progress?userId=${userId}`],
  });

  const enrolled = progressData?.filter((p: any) => p.track) || [];
  if (enrolled.length === 0) return null;

  return (
    <View style={{ marginTop: 4 }}>
      <Text style={[styles.enrolledLabel, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
        Your Active Paths
      </Text>
      {enrolled.map((p: any) => (
        <Pressable
          key={p.id}
          onPress={() => router.push(`/study-path/${p.trackId}` as any)}
          style={({ pressed }) => [
            styles.enrolledCard,
            { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[styles.enrolledIcon, { backgroundColor: (p.track?.color || "#C9933A") + "18" }]}>
            <Ionicons name={(p.track?.icon as any) || "school"} size={18} color={p.track?.color || "#C9933A"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.enrolledTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {p.track?.title}
            </Text>
            <View style={styles.enrolledProgress}>
              <View style={[styles.enrolledBar, { backgroundColor: theme.divider }]}>
                <View style={[styles.enrolledBarFill, { width: `${p.percentComplete || 0}%`, backgroundColor: "#C9933A" }]} />
              </View>
              <Text style={[styles.enrolledPercent, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FeatureTutorial tutorialId="explore" steps={EXPLORE_TUTORIAL_STEPS} />
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Study
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Deepen your faith
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Adventist Formation
          </Text>
        </View>

        <ListItem
          icon="school"
          iconColor="#7C3AED"
          title="28 Fundamental Beliefs"
          subtitle="Core doctrines of the Adventist faith"
          onPress={() => router.push("/sda-studies" as any)}
          style={{ marginBottom: 8 }}
        />

        <ListItem
          icon="flame"
          iconColor="#C9933A"
          title="Devotional Plans"
          subtitle="Guided daily reading & SDA study plans"
          onPress={() => router.push("/devotionals" as any)}
          style={{ marginBottom: 8 }}
        />

        <ListItem
          icon="chatbubbles"
          iconColor="#8B5CF6"
          title="Guided Study"
          subtitle="Socratic AI-guided inductive Bible study"
          onPress={() => router.push("/study-guide" as any)}
          style={{ marginBottom: 8 }}
        />

        <ListItem
          icon="trail-sign"
          iconColor="#2E7D32"
          title="Study Paths"
          subtitle="Structured paths through Scripture"
          onPress={() => router.push("/study-paths" as any)}
          style={{ marginBottom: 8 }}
        />

        <Pressable
          onPress={() => router.push("/resources" as any)}
          style={({ pressed }) => [
            {
              borderRadius: 16,
              overflow: "hidden",
              marginBottom: 12,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          testID="resources-featured-card"
          accessibilityRole="button"
          accessibilityLabel="Open Study Resources: Sabbath School companions, topical studies, family worship"
        >
          <LinearGradient
            colors={["#1A237E", "#0D1442"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: 20,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#C9933A30",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#C9933A20", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="library" size={20} color="#C9933A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFFFFF", fontFamily: "Lora_700Bold", fontSize: 17 }}>
                  Study Resources
                </Text>
                <Text style={{ color: "#FFFFFFAA", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                  Sabbath School companions, topical studies, family worship
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C9933A" />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { label: "Sabbath School", color: "#2E7D32" },
                { label: "Topical", color: "#C9933A" },
                { label: "Family", color: "#E65100" },
              ].map((tag) => (
                <View
                  key={tag.label}
                  style={{
                    backgroundColor: tag.color + "25",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ color: tag.color, fontFamily: "Inter_600SemiBold", fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
                    {tag.label}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Pressable>

        <ListItem
          icon="telescope"
          iconColor="#C9933A"
          title="Prophecy Explorer"
          subtitle="Interactive Daniel & Revelation timelines"
          onPress={() => router.push("/prophecy-explorer" as any)}
          style={{ marginBottom: 8 }}
        />

        <ListItem
          icon="git-merge"
          iconColor="#8B5CF6"
          title="Great Controversy Timeline"
          subtitle="Trace the cosmic conflict from Creation to the New Earth"
          onPress={() => router.push("/great-controversy" as any)}
          style={{ marginBottom: 8 }}
        />

        <EnrolledTracksPreview theme={theme} />

        <SectionDivider theme={theme} />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Wisdom & Insight
          </Text>
        </View>

        <ListItem
          icon="chatbubble-ellipses"
          iconColor="#3B6CB5"
          title="Historic Voices"
          subtitle="Commentary from Matthew Henry, Adam Clarke, John Gill & more"
          onPress={() => router.push("/(tabs)/study?tab=voices")}
          style={{ marginBottom: 8 }}
        />

        <SectionDivider theme={theme} />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Discovery Tools
          </Text>
        </View>

        <View style={styles.toolsRow}>
          <Pressable
            onPress={() => router.push("/maps-timeline?tab=maps")}
            style={({ pressed }) => [
              styles.toolCard,
              { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.toolIcon, { backgroundColor: "rgba(26,31,60,0.10)" }]}>
              <Ionicons name="map" size={24} color={isDark ? "#8B9FD4" : "#1A1F3C"} />
            </View>
            <Text style={[styles.toolTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Bible Maps</Text>
            <Text style={[styles.toolSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Ancient locations</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/maps-timeline?tab=timeline")}
            style={({ pressed }) => [
              styles.toolCard,
              { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.toolIcon, { backgroundColor: "rgba(46,125,50,0.10)" }]}>
              <Ionicons name="time" size={24} color={isDark ? "#66BB6A" : "#2E7D32"} />
            </View>
            <Text style={[styles.toolTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Timeline</Text>
            <Text style={[styles.toolSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Biblical history</Text>
          </Pressable>
        </View>

        <SectionDivider theme={theme} />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Beloved Passages
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inspirationScroll}>
          {INSPIRATIONS.map((item, i) => (
            <Pressable
              key={i}
              onPress={() => router.push(`/read/${item.bookId}/${item.chapter}`)}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={item.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inspirationCard}
              >
                <Ionicons name={item.icon} size={28} color="rgba(255,255,255,0.8)" />
                <Text style={[styles.inspirationTitle, { fontFamily: "Lora_700Bold" }]}>{item.title}</Text>
                <Text style={[styles.inspirationSub, { fontFamily: "Inter_400Regular" }]}>{item.subtitle}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>

        <SectionDivider theme={theme} />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Spiritual Themes
          </Text>
        </View>

        <View style={styles.topicsGrid}>
          {TOPICS.map((topic) => (
            <Pressable
              key={topic.id}
              onPress={() => router.push(`/topic/${topic.id}`)}
              style={({ pressed }) => [styles.topicCard, { opacity: pressed ? 0.8 : 1 }]}
              testID={`topic-${topic.id}`}
            >
              <LinearGradient
                colors={topic.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.topicGradient}
              >
                <Ionicons name={topic.icon} size={22} color="rgba(255,255,255,0.9)" />
                <Text style={[styles.topicTitle, { fontFamily: "Inter_600SemiBold" }]}>{topic.title}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  title: { fontSize: 24 },
  subtitle: { fontSize: 14, marginTop: 4 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 22 },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 24,
    opacity: 0.6,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 22 },
  inspirationScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  inspirationCard: {
    width: 200,
    borderRadius: 20,
    padding: 22,
    gap: 10,
  },
  inspirationTitle: { color: "#fff", fontSize: 17 },
  inspirationSub: { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  topicCard: {
    width: "31%" as any,
    minWidth: 95,
    flexGrow: 1,
  },
  topicGradient: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
    minHeight: 90,
    justifyContent: "center",
  },
  topicTitle: { color: "#fff", fontSize: 13 },
  toolsRow: {
    flexDirection: "row",
    gap: 12,
  },
  toolCard: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  toolTitle: { fontSize: 15 },
  toolSub: { fontSize: 12, lineHeight: 18 },
  enrolledLabel: {
    fontSize: 13,
    marginBottom: 8,
    marginTop: 4,
    paddingLeft: 2,
  },
  enrolledCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 6,
  },
  enrolledIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
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
});
