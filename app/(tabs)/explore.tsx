import React, { useMemo } from "react";
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

const TOPIC_IMAGES: Record<string, any> = {
  "quick-read": require("@/assets/topic-cards/quick-read.png"),
  "guided-study": require("@/assets/topic-cards/guided-study.png"),
  "deep-study": require("@/assets/topic-cards/deep-study.png"),
  "study-paths": require("@/assets/topic-cards/study-paths.png"),
  "devotional-plans": require("@/assets/topic-cards/devotional-plans.png"),
  "study-resources": require("@/assets/topic-cards/study-resources.png"),
  "prophecy": require("@/assets/topic-cards/prophecy.png"),
  "historic-voices": require("@/assets/topic-cards/historic-voices.png"),
  "fundamental-beliefs": require("@/assets/topic-cards/fundamental-beliefs.png"),
  "maps-timeline": require("@/assets/topic-cards/maps-timeline.png"),
  love: require("@/assets/topic-cards/love.png"),
  faith: require("@/assets/topic-cards/faith.png"),
  prayer: require("@/assets/topic-cards/prayer.png"),
  peace: require("@/assets/topic-cards/peace.png"),
  hope: require("@/assets/topic-cards/hope.png"),
  strength: require("@/assets/topic-cards/strength.png"),
  wisdom: require("@/assets/topic-cards/wisdom.png"),
  grace: require("@/assets/topic-cards/grace.png"),
  joy: require("@/assets/topic-cards/joy.png"),
  "word-study": require("@/assets/topic-cards/word-study.png"),
  "bible-characters": require("@/assets/topic-cards/bible-characters.png"),
  "bible-maps": require("@/assets/topic-cards/bible-maps.png"),
  timeline: require("@/assets/topic-cards/timeline.png"),
  "three-angels": require("@/assets/topic-cards/three-angels.png"),
  health: require("@/assets/topic-cards/health-message.png"),
};

function TopicImageCard({
  id,
  title,
  subtitle,
  badge,
  onPress,
  testID,
}: {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        st.topicImageCard,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Image source={TOPIC_IMAGES[id]} style={st.topicImageBg} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.82)"]}
        locations={[0, 0.4, 1]}
        style={st.topicImageOverlay}
      >
        <View style={st.topicImageContent}>
          <View style={{ flex: 1 }}>
            <View style={st.topicImageTitleRow}>
              <Text style={[st.topicImageTitle, { fontFamily: "Inter_600SemiBold" }]}>
                {title}
              </Text>
              {badge ? (
                <View style={st.topicImageBadge}>
                  <Text style={[st.topicImageBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[st.topicImageSub, { fontFamily: "Inter_400Regular" }]}>
              {subtitle}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const SPIRITUAL_THEMES = [
  { id: "love", title: "Love", subtitle: "Explore what Scripture teaches about love" },
  { id: "faith", title: "Faith", subtitle: "Walking by faith, not by sight" },
  { id: "prayer", title: "Prayer", subtitle: "Drawing near to God in prayer" },
  { id: "peace", title: "Peace", subtitle: "Finding rest in God's promises" },
  { id: "hope", title: "Hope", subtitle: "Anchored in the hope of Christ" },
  { id: "strength", title: "Strength", subtitle: "God's strength in our weakness" },
  { id: "wisdom", title: "Wisdom", subtitle: "Seeking wisdom from above" },
  { id: "grace", title: "Grace", subtitle: "The unmerited favor of God" },
  { id: "joy", title: "Joy", subtitle: "The joy of the Lord is our strength" },
];

const STUDY_TOOLS = [
  { id: "historic-voices", title: "Historic Voices", subtitle: "Matthew Henry, Adam Clarke, John Gill & more", route: "/(tabs)/study?tab=voices" },
  { id: "bible-maps", title: "Bible Maps", subtitle: "Ancient locations and biblical geography", route: "/maps-timeline?tab=maps" },
  { id: "timeline", title: "Timeline", subtitle: "Walk through biblical history", route: "/maps-timeline?tab=timeline" },
];

const ADVENTIST_STUDIES = [
  { id: "three-angels", title: "Three Angels' Messages", subtitle: "Study the messages of Revelation 14" },
  { id: "health", title: "Health Message", subtitle: "Biblical principles for wholeness" },
];

interface LayerCompletionEntry {
  layer: string;
  completedAt: string;
}

const LAYER_ORDER = ["word", "context", "voices", "application"];


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


export default function StudyScreen() {
  const { theme } = useTheme();
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
        <SectionLabel label="Study Scripture" theme={theme} />

        <View style={st.topicImageCards}>
          <TopicImageCard
            id="quick-read"
            title="Quick Read"
            subtitle="Read a passage without extra study layers"
            onPress={() => router.push("/book-picker" as any)}
            testID="study-mode-quick_read"
          />
          <TopicImageCard
            id="guided-study"
            title="Guided Study"
            subtitle="Choose a passage and explore it with guided questions"
            onPress={() => router.push("/study-guide" as any)}
            testID="study-mode-guided_study"
          />
          <TopicImageCard
            id="deep-study"
            title="Deep Study"
            subtitle={deepStudyState.sub}
            badge="4-Layer"
            onPress={() => router.push({ pathname: "/deep-study-picker", params: { ...deepStudyState.routeParams, _t: String(Date.now()) } } as any)}
            testID="study-mode-deep_study"
          />
        </View>

        <View style={{ height: 24 }} />

        <SectionLabel label="Sabbath School & Prayer" theme={theme} />

        <View style={st.topicImageCards}>
          <TopicImageCard
            id="fundamental-beliefs"
            title="Sabbath School"
            subtitle="This week's lesson, discussion questions, and insights"
            onPress={() => router.push("/sabbath-school" as any)}
            testID="sabbath-school-entry"
          />
          <TopicImageCard
            id="prayer"
            title="Prayer Journal"
            subtitle="Record, track, and reflect on your prayer life"
            onPress={() => router.push("/prayer-journal" as any)}
            testID="prayer-journal-entry"
          />
        </View>

        <EnrolledTracksPreview theme={theme} />

        <View style={{ height: 24 }} />

        <SectionLabel label="Learning Paths" theme={theme} />

        <View style={st.topicImageCards}>
          <TopicImageCard
            id="study-paths"
            title="Study Paths"
            subtitle="Structured paths through Scripture"
            onPress={() => router.push("/study-paths" as any)}
            testID="study-paths"
          />
          <TopicImageCard
            id="devotional-plans"
            title="Devotional Plans"
            subtitle="Daily reading plans for spiritual growth"
            onPress={() => router.push("/devotionals" as any)}
            testID="devotional-plans"
          />
        </View>

        <View style={{ height: 24 }} />

        <SectionLabel label="Study Tools" theme={theme} />

        <View style={st.topicImageCards}>
          {STUDY_TOOLS.map((item) => (
            <TopicImageCard
              key={item.id}
              id={item.id}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => router.push(item.route as any)}
              testID={`tool-${item.id}`}
            />
          ))}
        </View>

        <View style={{ height: 24 }} />

        <SectionLabel label="Adventist Studies" theme={theme} />

        <View style={st.topicImageCards}>
          {ADVENTIST_STUDIES.map((item) => (
            <TopicImageCard
              key={item.id}
              id={item.id}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => router.push(`/topic/${item.id}`)}
              testID={`topic-${item.id}`}
            />
          ))}
        </View>

        <View style={{ height: 24 }} />

        <SectionLabel label="Spiritual Themes" theme={theme} />

        <View style={st.topicImageCards}>
          {SPIRITUAL_THEMES.map((item) => (
            <TopicImageCard
              key={item.id}
              id={item.id}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => router.push(`/topic/${item.id}`)}
              testID={`topic-${item.id}`}
            />
          ))}
        </View>
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

  sectionHeader: {
    marginBottom: 14,
    paddingLeft: 2,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
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

  topicImageCards: {
    gap: 10,
  },
  topicImageCard: {
    borderRadius: 16,
    overflow: "hidden" as const,
    height: 100,
  },
  topicImageBg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%" as any,
    height: "100%" as any,
  },
  topicImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end" as const,
  },
  topicImageContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 8,
  },
  topicImageTitle: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 2,
  },
  topicImageTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 2,
  },
  topicImageBadge: {
    backgroundColor: "rgba(201,147,58,0.25)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topicImageBadgeText: {
    color: "#C9933A",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  topicImageSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
});
