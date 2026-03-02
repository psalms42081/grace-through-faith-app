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

function SectionDivider({ theme }: { theme: typeof Colors.dark }) {
  return <View style={[styles.divider, { backgroundColor: theme.divider }]} />;
}

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

        <SectionDivider theme={theme} />

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

        <SectionDivider theme={theme} />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Study Resources
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/(tabs)/study?tab=voices")}
          style={({ pressed }) => [
            styles.resourceCard,
            { backgroundColor: isDark ? theme.backgroundCard : theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="historic-voices-card"
        >
          <View style={[styles.resourceIcon, { backgroundColor: "rgba(59,108,181,0.12)" }]}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#3B6CB5" />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={[styles.resourceTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Historic Voices
            </Text>
            <Text style={[styles.resourceSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Commentary from Matthew Henry, Adam Clarke, John Gill & more
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/sda-studies")}
          style={({ pressed }) => [
            styles.resourceCard,
            { backgroundColor: isDark ? theme.backgroundCard : theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="sda-studies-card"
        >
          <View style={[styles.resourceIcon, { backgroundColor: "rgba(124,58,237,0.12)" }]}>
            <Ionicons name="school" size={22} color="#7C3AED" />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={[styles.resourceTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              28 Fundamental Beliefs
            </Text>
            <Text style={[styles.resourceSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              SDA doctrinal studies with scripture
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>

        <SectionDivider theme={theme} />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Study Tools
          </Text>
        </View>

        <View style={styles.toolsRow}>
          <Pressable
            onPress={() => router.push("/maps-timeline?tab=maps")}
            style={({ pressed }) => [
              styles.toolCard,
              { backgroundColor: isDark ? theme.backgroundCard : theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
            ]}
            testID="maps-card"
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
              { backgroundColor: isDark ? theme.backgroundCard : theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
            ]}
            testID="timeline-card"
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
            Christian Content
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/music")}
          style={({ pressed }) => [
            styles.resourceCard,
            { backgroundColor: isDark ? theme.backgroundCard : theme.backgroundCard, opacity: pressed ? 0.85 : 1, marginBottom: 8 },
          ]}
          testID="music-card"
        >
          <View style={[styles.resourceIcon, { backgroundColor: "rgba(201,147,58,0.12)" }]}>
            <Ionicons name="musical-notes" size={22} color="#C9933A" />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={[styles.resourceTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Christian Music
            </Text>
            <Text style={[styles.resourceSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Worship & hymns
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
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
  resourceCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 10,
  },
  resourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  resourceInfo: { flex: 1 },
  resourceTitle: { fontSize: 15, marginBottom: 2 },
  resourceSub: { fontSize: 13, lineHeight: 19 },
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
});
