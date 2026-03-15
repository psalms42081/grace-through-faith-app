import React, { useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { TOPICS_LIST as TOPICS } from "@/data/topics";
import ListItem from "@/components/ui/ListItem";

interface LayerCompletionEntry {
  layer: string;
  completedAt: string;
}

const LAYER_ORDER = ["word", "context", "voices", "application"];

const INSPIRATIONS = [
  { title: "Walking in the Spirit", subtitle: "Galatians 5:16-26", gradient: ["#1A1F3C", "#0D1025"] as [string, string], icon: "walk" as const, bookId: 48, chapter: 5 },
  { title: "Armor of God", subtitle: "Ephesians 6:10-18", gradient: ["#2E7D32", "#1B5E20"] as [string, string], icon: "shield-checkmark" as const, bookId: 49, chapter: 6 },
  { title: "The Lord's Prayer", subtitle: "Matthew 6:9-13", gradient: ["#C9933A", "#A87828"] as [string, string], icon: "hand-left" as const, bookId: 40, chapter: 6 },
  { title: "The Beatitudes", subtitle: "Matthew 5:3-12", gradient: ["#8B5CF6", "#6D3BD4"] as [string, string], icon: "sparkles" as const, bookId: 40, chapter: 5 },
  { title: "Love Chapter", subtitle: "1 Corinthians 13", gradient: ["#E8456B", "#C2185B"] as [string, string], icon: "heart" as const, bookId: 46, chapter: 13 },
];

function SectionLabel({ label, theme }: { label: string; theme: typeof Colors.dark }) {
  return (
    <View style={st.sectionHeader}>
      <Text style={[st.sectionLabel, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
        {label}
      </Text>
    </View>
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
    <View>
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

function StudyModeCard({
  icon,
  iconColor,
  title,
  subtitle,
  badge,
  onPress,
  theme,
  isDark,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
  theme: typeof Colors.dark;
  isDark: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        st.heroCard,
        {
          backgroundColor: isDark ? "#0E0E18" : "#FFFDF8",
          borderColor: isDark ? iconColor + "28" : iconColor + "20",
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[st.heroIcon, { backgroundColor: iconColor + "14" }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={st.heroText}>
        <View style={st.heroTitleRow}>
          <Text style={[st.heroTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
            {title}
          </Text>
          {badge ? (
            <View style={[st.heroBadge, { backgroundColor: iconColor + "18" }]}>
              <Text style={[st.heroBadgeText, { color: iconColor, fontFamily: "Inter_600SemiBold" }]}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[st.heroSub, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
}

export default function StudyScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: recentReads } = useQuery<{ id: string; bookId: number; bookName: string; chapter: number; translation: string }[]>({
    queryKey: [`/api/reading-history/recent?userId=${userId}`],
  });

  const lastRead = recentReads?.[0] ?? null;

  const { data: layerCompletions } = useQuery<LayerCompletionEntry[]>({
    queryKey: [`/api/layer-completions?userId=${userId}&bookId=${lastRead?.bookId}&chapter=${lastRead?.chapter}`],
    enabled: !!userId && !!lastRead,
  });

  const deepStudyState = useMemo(() => {
    if (!lastRead) {
      return { sub: "Observe \u00B7 Context \u00B7 Insight \u00B7 Respond", routeParams: { showIntro: "true" } };
    }
    const completedSet = new Set(layerCompletions?.map((c) => c.layer) ?? []);
    const count = LAYER_ORDER.filter((l) => completedSet.has(l)).length;
    const ref = `${lastRead.bookName} ${lastRead.chapter}`;
    if (count === 4) {
      return { sub: `${ref} -- all 4 layers complete`, routeParams: { showIntro: "true", bookId: String(lastRead.bookId), chapter: String(lastRead.chapter) } };
    }
    if (count > 0) {
      return { sub: `Resume ${ref} -- ${count} of 4 layers`, routeParams: { bookId: String(lastRead.bookId), chapter: String(lastRead.chapter) } };
    }
    return { sub: `Begin ${ref} -- 4 layers`, routeParams: { showIntro: "true", bookId: String(lastRead.bookId), chapter: String(lastRead.chapter) } };
  }, [lastRead, layerCompletions]);

  const hasActiveProgress = useMemo(() => {
    if (lastRead) {
      const completedSet = new Set(layerCompletions?.map((c) => c.layer) ?? []);
      const count = LAYER_ORDER.filter((l) => completedSet.has(l)).length;
      if (count > 0 && count < 4) return true;
    }
    return false;
  }, [lastRead, layerCompletions]);

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <View style={[st.header, { paddingTop: topPad + 16, backgroundColor: theme.background }]}>
        <Text style={[st.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Study
        </Text>
        <Text style={[st.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Start with Scripture, continue your journey, or explore trusted study tools.
        </Text>
      </View>

      <ScrollView
        style={st.scrollView}
        contentContainerStyle={[st.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.heroSection}>
          <Text style={[st.heroSectionTitle, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
            STUDY SCRIPTURE
          </Text>

          <View style={st.heroCards}>
            <StudyModeCard
              icon="book-outline"
              iconColor="#3B82F6"
              title="Quick Read"
              subtitle="Read a passage without extra study layers"
              onPress={() => router.push("/(tabs)/read" as any)}
              theme={theme}
              isDark={isDark}
              testID="study-mode-quick_read"
            />

            <StudyModeCard
              icon="chatbubbles-outline"
              iconColor="#8B5CF6"
              title="Guided Study"
              subtitle="An AI tutor walks with you through observation, meaning, and response"
              onPress={() => router.push("/study-guide" as any)}
              theme={theme}
              isDark={isDark}
              testID="study-mode-guided_study"
            />

            <StudyModeCard
              icon="layers-outline"
              iconColor="#C9933A"
              title="Deep Study"
              subtitle={deepStudyState.sub}
              badge="4-Layer"
              onPress={() => router.push({ pathname: "/(tabs)/study", params: { ...deepStudyState.routeParams, _t: String(Date.now()) } } as any)}
              theme={theme}
              isDark={isDark}
              testID="study-mode-deep_study"
            />
          </View>
        </View>

        {(hasActiveProgress) ? (
          <>
            <View style={st.sectionSpacer} />
            <SectionLabel label="Continue Your Journey" theme={theme} />
            {hasActiveProgress && lastRead ? (
              <Pressable
                onPress={() => router.push({ pathname: "/(tabs)/study", params: { bookId: String(lastRead.bookId), chapter: String(lastRead.chapter), _t: String(Date.now()) } } as any)}
                testID="study-resume-cta"
                style={({ pressed }) => [
                  st.resumeCard,
                  {
                    backgroundColor: isDark ? "#111118" : "#FFFDF8",
                    borderColor: theme.accent + "25",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[st.resumeIcon, { backgroundColor: theme.accent + "14" }]}>
                  <Ionicons name="layers" size={20} color={theme.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.resumeTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {lastRead.bookName} {lastRead.chapter}
                  </Text>
                  <Text style={[st.resumeSub, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {LAYER_ORDER.filter((l) => new Set(layerCompletions?.map((c) => c.layer) ?? []).has(l)).length} of 4 layers complete
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.accent} />
              </Pressable>
            ) : null}
            <EnrolledTracksPreview theme={theme} />
          </>
        ) : (
          <EnrolledTracksPreview theme={theme} />
        )}

        <View style={st.secondaryZone}>
          <View style={[st.secondaryDivider, { backgroundColor: theme.divider }]} />

          <SectionLabel label="Learning Paths" theme={theme} />

          <ListItem
            icon="trail-sign"
            iconColor="#2E7D32"
            title="Study Paths"
            subtitle="Structured paths through Scripture"
            onPress={() => router.push("/study-paths" as any)}
            style={{ marginBottom: 8 }}
          />

          <ListItem
            icon="flame"
            iconColor="#C9933A"
            title="Devotional Plans"
            subtitle="Guided daily reading and SDA study plans"
            onPress={() => router.push("/devotionals" as any)}
            style={{ marginBottom: 8 }}
          />

          <ListItem
            icon="library"
            iconColor="#1A237E"
            title="Study Resources"
            subtitle="Sabbath School companions, topical studies, family worship"
            onPress={() => router.push("/resources" as any)}
            style={{ marginBottom: 8 }}
          />

          <View style={[st.secondaryDivider, { backgroundColor: theme.divider }]} />

          <ListItem
            icon="telescope"
            iconColor="#C9933A"
            title="Prophecy & End Times"
            subtitle="Daniel, Revelation, Great Controversy & guided prophecy study"
            onPress={() => router.push("/prophecy-hub" as any)}
            style={{ marginBottom: 8 }}
          />

          <View style={[st.secondaryDivider, { backgroundColor: theme.divider }]} />

          <SectionLabel label="Reference" theme={theme} />

          <ListItem
            icon="chatbubble-ellipses"
            iconColor="#3B6CB5"
            title="Historic Voices"
            subtitle="Commentary from Matthew Henry, Adam Clarke, John Gill & more"
            onPress={() => router.push("/(tabs)/study?tab=voices")}
            style={{ marginBottom: 8 }}
          />

          <ListItem
            icon="book"
            iconColor="#7C3AED"
            title="Fundamental Beliefs"
            subtitle="Browse and study all 28 Adventist doctrines"
            onPress={() => router.push("/sda-studies" as any)}
            style={{ marginBottom: 8 }}
          />

          <ListItem
            icon="map"
            iconColor={isDark ? "#8B9FD4" : "#1A1F3C"}
            title="Bible Maps & Timeline"
            subtitle="Ancient locations and biblical history"
            onPress={() => router.push("/maps-timeline?tab=maps")}
            style={{ marginBottom: 8 }}
          />

          <View style={[st.secondaryDivider, { backgroundColor: theme.divider }]} />

          <SectionLabel label="Beloved Passages" theme={theme} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.inspirationScroll}>
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
                  style={st.inspirationCard}
                >
                  <Ionicons name={item.icon} size={24} color="rgba(255,255,255,0.75)" />
                  <Text style={[st.inspirationTitle, { fontFamily: "Lora_700Bold" }]}>{item.title}</Text>
                  <Text style={[st.inspirationSub, { fontFamily: "Inter_400Regular" }]}>{item.subtitle}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ height: 20 }} />

          <SectionLabel label="Spiritual Themes" theme={theme} />

          <View style={st.topicsGrid}>
            {TOPICS.map((topic) => (
              <Pressable
                key={topic.id}
                onPress={() => router.push(`/topic/${topic.id}`)}
                style={({ pressed }) => [st.topicCard, { opacity: pressed ? 0.8 : 1 }]}
                testID={`topic-${topic.id}`}
              >
                <LinearGradient
                  colors={topic.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={st.topicGradient}
                >
                  <Ionicons name={topic.icon} size={22} color="rgba(255,255,255,0.9)" />
                  <Text style={[st.topicTitle, { fontFamily: "Inter_600SemiBold" }]}>{topic.title}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  title: { fontSize: 24 },
  subtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 22 },

  heroSection: {
    marginBottom: 8,
  },
  heroSectionTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 14,
    paddingLeft: 2,
  },
  heroCards: {
    gap: 12,
  },
  heroCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  heroText: { flex: 1 },
  heroTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 3,
  },
  heroTitle: { fontSize: 17 },
  heroBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  heroBadgeText: { fontSize: 10 },
  heroSub: { fontSize: 13, lineHeight: 18 },

  sectionSpacer: { height: 20 },

  sectionHeader: {
    marginBottom: 12,
    paddingLeft: 2,
  },
  sectionLabel: {
    fontSize: 13,
    letterSpacing: 0.3,
  },

  resumeCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  resumeIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  resumeTitle: { fontSize: 14, marginBottom: 2 },
  resumeSub: { fontSize: 12 },

  secondaryZone: {
    marginTop: 12,
  },
  secondaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 22,
    opacity: 0.5,
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

  inspirationScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  inspirationCard: {
    width: 180,
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  inspirationTitle: { color: "#fff", fontSize: 15 },
  inspirationSub: { color: "rgba(255,255,255,0.6)", fontSize: 12 },

  topicsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
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
    alignItems: "center" as const,
    gap: 8,
    minHeight: 90,
    justifyContent: "center" as const,
  },
  topicTitle: { color: "#fff", fontSize: 13 },
});
