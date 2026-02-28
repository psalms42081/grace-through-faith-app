import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

interface RecentRead {
  id: string;
  bookId: number;
  bookName: string;
  chapter: number;
  translation: string;
  readAt: string;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;
}

interface Plan {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  theme: string | null;
}

const TOPICS = [
  { id: "love", title: "Love", icon: "heart" as const, gradient: ["#E8456B", "#C2185B"] as [string, string] },
  { id: "faith", title: "Faith", icon: "shield" as const, gradient: ["#5B86E5", "#36D1DC"] as [string, string] },
  { id: "prayer", title: "Prayer", icon: "hand-left" as const, gradient: ["#8B5CF6", "#6D3BD4"] as [string, string] },
  { id: "forgiveness", title: "Forgiveness", icon: "refresh" as const, gradient: ["#2E7D32", "#66BB6A"] as [string, string] },
  { id: "comfort", title: "Comfort", icon: "heart-half" as const, gradient: ["#FF6B35", "#F5A623"] as [string, string] },
  { id: "wisdom", title: "Wisdom", icon: "bulb" as const, gradient: ["#C9933A", "#A87828"] as [string, string] },
  { id: "strength", title: "Strength", icon: "fitness" as const, gradient: ["#E65100", "#FF8F00"] as [string, string] },
  { id: "peace", title: "Peace", icon: "leaf" as const, gradient: ["#00796B", "#4DB6AC"] as [string, string] },
  { id: "hope", title: "Hope", icon: "sunny" as const, gradient: ["#1565C0", "#42A5F5"] as [string, string] },
  { id: "grace", title: "Grace", icon: "gift" as const, gradient: ["#AD1457", "#EC407A"] as [string, string] },
  { id: "courage", title: "Courage", icon: "flag" as const, gradient: ["#4527A0", "#7C4DFF"] as [string, string] },
  { id: "joy", title: "Joy", icon: "sparkles" as const, gradient: ["#F9A825", "#FDD835"] as [string, string] },
];

const INSPIRATIONS = [
  { title: "Walking in the Spirit", subtitle: "Galatians 5:16-26", gradient: ["#1A1F3C", "#0D1025"] as [string, string], icon: "walk" as const },
  { title: "Armor of God", subtitle: "Ephesians 6:10-18", gradient: ["#2E7D32", "#1B5E20"] as [string, string], icon: "shield-checkmark" as const },
  { title: "The Lord's Prayer", subtitle: "Matthew 6:9-13", gradient: ["#C9933A", "#A87828"] as [string, string], icon: "hand-left" as const },
];

export default function DiscoverScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: recentReads } = useQuery<RecentRead[]>({
    queryKey: ["/api/reading-history/recent?userId=guest"],
  });

  const { data: streakData } = useQuery<StreakData>({
    queryKey: ["/api/reading-streaks?userId=guest"],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/devotionals/plans"],
  });

  const lastRead = recentReads?.[0];
  const streak = streakData?.currentStreak ?? 0;
  const longestStreak = streakData?.longestStreak ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Discover
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {lastRead && (
          <Pressable
            onPress={() => router.push(`/read/${lastRead.bookId}/${lastRead.chapter}?translation=${lastRead.translation || "KJV"}`)}
            style={({ pressed }) => [
              styles.continueCard,
              { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
            ]}
            testID="continue-reading"
          >
            <View style={[styles.continueIcon, { backgroundColor: theme.accent + "18" }]}>
              <Ionicons name="book" size={22} color={theme.accent} />
            </View>
            <View style={styles.continueInfo}>
              <Text style={[styles.continueLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                CONTINUE READING
              </Text>
              <Text style={[styles.continueTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                {lastRead.bookName} {lastRead.chapter}
              </Text>
              <Text style={[styles.continueSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {lastRead.translation || "KJV"}
              </Text>
            </View>
            <LinearGradient colors={["#C9933A", "#A87828"]} style={styles.continueArrow}>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </LinearGradient>
          </Pressable>
        )}

        <View style={styles.streakRow}>
          <View style={[styles.streakCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
            <Ionicons name="flame" size={28} color="#FF6B35" />
            <Text style={[styles.streakNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{streak}</Text>
            <Text style={[styles.streakLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Current{"\n"}Streak
            </Text>
          </View>
          <View style={[styles.streakCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
            <Ionicons name="trophy" size={28} color={theme.accent} />
            <Text style={[styles.streakNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{longestStreak}</Text>
            <Text style={[styles.streakLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Longest{"\n"}Streak
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/prayer-journal")}
            style={({ pressed }) => [
              styles.streakCard,
              { backgroundColor: isDark ? "#1A142A" : "#F5F0FF", opacity: pressed ? 0.85 : 1 },
            ]}
            testID="prayer-journal-card"
          >
            <Ionicons name="journal" size={28} color="#8B5CF6" />
            <Text style={[styles.streakNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              <Ionicons name="add" size={20} color="#8B5CF6" />
            </Text>
            <Text style={[styles.streakLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Prayer{"\n"}Journal
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Daily Inspiration
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inspirationScroll}>
          {INSPIRATIONS.map((item, i) => (
            <LinearGradient
              key={i}
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.inspirationCard}
            >
              <Ionicons name={item.icon} size={28} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.inspirationTitle, { fontFamily: "Lora_700Bold" }]}>{item.title}</Text>
              <Text style={[styles.inspirationSub, { fontFamily: "Inter_400Regular" }]}>{item.subtitle}</Text>
            </LinearGradient>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Topics to Explore
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

        {plans && plans.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                Featured Plans
              </Text>
              {plans.length > 3 && (
                <Pressable onPress={() => router.push("/devotionals")} hitSlop={8}>
                  <Text style={[styles.viewAll, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>View All</Text>
                </Pressable>
              )}
            </View>
            {plans.slice(0, 3).map((plan, i) => (
              <Pressable
                key={plan.id}
                onPress={() => router.push("/devotionals")}
                style={({ pressed }) => [
                  styles.planCard,
                  { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <LinearGradient
                  colors={[
                    ["#C9933A", "#A87828"],
                    ["#2E7D32", "#1B5E20"],
                    ["#1A1F3C", "#0D1025"],
                  ][i % 3] as [string, string]}
                  style={styles.planIcon}
                >
                  <Ionicons name={["heart", "leaf", "star"][i % 3] as any} size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.planInfo}>
                  <Text style={[styles.planTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>{plan.title}</Text>
                  <Text style={[styles.planMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{plan.totalDays} days</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </Pressable>
            ))}
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            More to Explore
          </Text>
        </View>

        <View style={styles.exploreCards}>
          <Pressable
            onPress={() => router.push("/maps-timeline?tab=maps")}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
            testID="maps-card"
          >
            <LinearGradient
              colors={["#1A1F3C", "#0D1025"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exploreCard}
            >
              <Ionicons name="map" size={28} color="rgba(237,229,213,0.8)" />
              <Text style={[styles.exploreCardTitle, { fontFamily: "Lora_600SemiBold" }]}>Bible Maps</Text>
              <Text style={[styles.exploreCardSub, { fontFamily: "Inter_400Regular" }]}>Ancient locations</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => router.push("/maps-timeline?tab=timeline")}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
            testID="timeline-card"
          >
            <LinearGradient
              colors={["#2E7D32", "#1B5E20"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exploreCard}
            >
              <Ionicons name="time" size={28} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.exploreCardTitle, { fontFamily: "Lora_600SemiBold" }]}>Timeline</Text>
              <Text style={[styles.exploreCardSub, { fontFamily: "Inter_400Regular" }]}>Biblical history</Text>
            </LinearGradient>
          </Pressable>
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
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 22 },
  continueCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 18,
    gap: 14,
    marginBottom: 20,
  },
  continueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  continueInfo: { flex: 1 },
  continueLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  continueTitle: { fontSize: 17, marginBottom: 2 },
  continueSub: { fontSize: 12 },
  continueArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  streakRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  streakCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 18,
    gap: 6,
  },
  streakNum: { fontSize: 26 },
  streakLabel: { fontSize: 11, textAlign: "center" as const, lineHeight: 15 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 22 },
  viewAll: { fontSize: 13 },
  inspirationScroll: {
    gap: 12,
    paddingBottom: 4,
    marginBottom: 28,
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
    marginBottom: 28,
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
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 10,
  },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  planInfo: { flex: 1 },
  planTitle: { fontSize: 15, marginBottom: 2 },
  planMeta: { fontSize: 12 },
  exploreCards: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  exploreCard: {
    borderRadius: 20,
    padding: 22,
    gap: 8,
    minHeight: 130,
  },
  exploreCardTitle: { color: "#EDE5D5", fontSize: 16, marginTop: 4 },
  exploreCardSub: { color: "rgba(237,229,213,0.6)", fontSize: 12 },
});
