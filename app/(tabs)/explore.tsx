import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

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
  { title: "Walking in the Spirit", subtitle: "Galatians 5:16-26", gradient: ["#1A1F3C", "#0D1025"] as [string, string], icon: "walk" as const, bookId: 48, chapter: 5 },
  { title: "Armor of God", subtitle: "Ephesians 6:10-18", gradient: ["#2E7D32", "#1B5E20"] as [string, string], icon: "shield-checkmark" as const, bookId: 49, chapter: 6 },
  { title: "The Lord's Prayer", subtitle: "Matthew 6:9-13", gradient: ["#C9933A", "#A87828"] as [string, string], icon: "hand-left" as const, bookId: 40, chapter: 6 },
  { title: "The Beatitudes", subtitle: "Matthew 5:3-12", gradient: ["#8B5CF6", "#6D3BD4"] as [string, string], icon: "sparkles" as const, bookId: 40, chapter: 5 },
  { title: "Love Chapter", subtitle: "1 Corinthians 13", gradient: ["#E8456B", "#C2185B"] as [string, string], icon: "heart" as const, bookId: 46, chapter: 13 },
];

export default function DiscoverScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

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
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Popular Passages
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

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Christian Content
          </Text>
        </View>

        <View style={styles.exploreCards}>
          <Pressable
            onPress={() => router.push("/music")}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
            testID="music-card"
          >
            <LinearGradient
              colors={["#C9933A", "#8B6914"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exploreCard}
            >
              <Ionicons name="musical-notes" size={28} color="rgba(255,255,255,0.9)" />
              <Text style={[styles.exploreCardTitle, { fontFamily: "Lora_600SemiBold" }]}>Christian Music</Text>
              <Text style={[styles.exploreCardSub, { fontFamily: "Inter_400Regular" }]}>Worship & hymns</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => router.push("/family")}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
            testID="family-card"
          >
            <LinearGradient
              colors={["#5B86E5", "#1A3A6B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exploreCard}
            >
              <Ionicons name="people" size={28} color="rgba(255,255,255,0.9)" />
              <Text style={[styles.exploreCardTitle, { fontFamily: "Lora_600SemiBold" }]}>Family & Faith</Text>
              <Text style={[styles.exploreCardSub, { fontFamily: "Inter_400Regular" }]}>For the whole family</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push("/prayer-journal")}
          style={({ pressed }) => [
            styles.prayerCard,
            { backgroundColor: isDark ? "#1A142A" : "#F5F0FF", opacity: pressed ? 0.85 : 1 },
          ]}
          testID="prayer-journal-card"
        >
          <View style={styles.prayerCardIcon}>
            <Ionicons name="journal" size={24} color="#8B5CF6" />
          </View>
          <View style={styles.prayerCardInfo}>
            <Text style={[styles.prayerCardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Prayer Journal
            </Text>
            <Text style={[styles.prayerCardSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Record and track your prayers
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8B5CF6" />
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Study Tools
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
  prayerCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 18,
    gap: 14,
    marginBottom: 28,
  },
  prayerCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(139,92,246,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  prayerCardInfo: { flex: 1 },
  prayerCardTitle: { fontSize: 16, marginBottom: 2 },
  prayerCardSub: { fontSize: 13 },
});
