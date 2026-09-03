import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Image,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";

const TOPIC_IMAGES: Record<string, any> = {
  "quick-read": require("@/assets/topic-cards/quick-read.png"),
  "guided-study": require("@/assets/topic-cards/guided-study.png"),
  "deep-study": require("@/assets/topic-cards/deep-study.png"),
  "study-paths": require("@/assets/topic-cards/study-paths.png"),
  "devotional-plans": require("@/assets/topic-cards/devotional-plans.png"),
  "historic-voices": require("@/assets/topic-cards/historic-voices.png"),
  "fundamental-beliefs": require("@/assets/topic-cards/fundamental-beliefs.png"),
  "maps-timeline": require("@/assets/topic-cards/maps-timeline.png"),
  "bible-maps": require("@/assets/topic-cards/bible-maps.png"),
  timeline: require("@/assets/topic-cards/timeline.png"),
  "three-angels": require("@/assets/topic-cards/three-angels.png"),
  "state-of-the-dead": require("@/assets/topic-cards/timeline.png"),
  health: require("@/assets/topic-cards/health-message.png"),
  prayer: require("@/assets/topic-cards/prayer.png"),
  love: require("@/assets/topic-cards/love.png"),
  faith: require("@/assets/topic-cards/faith.png"),
  peace: require("@/assets/topic-cards/peace.png"),
  hope: require("@/assets/topic-cards/hope.png"),
  strength: require("@/assets/topic-cards/strength.png"),
  wisdom: require("@/assets/topic-cards/wisdom.png"),
  grace: require("@/assets/topic-cards/grace.png"),
  joy: require("@/assets/topic-cards/joy.png"),
  "second-coming": require("@/assets/topic-cards/three-angels.png"),
  "sabbath-study": require("@/assets/topic-cards/quick-read.png"),
  "sanctuary-study": require("@/assets/topic-cards/fundamental-beliefs.png"),
};

function TopicImageCard({
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
      style={({ pressed }) => [
        st.topicImageCard,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Image source={TOPIC_IMAGES[id]} style={st.topicImageBg} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.28)", "rgba(0,0,0,0.65)"]}
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

interface LayerCompletionEntry {
  layer: string;
  completedAt: string;
}

const LAYER_ORDER = ["word", "context", "voices", "application"];

const CATEGORY_META: Record<string, { title: string; subtitle: string }> = {
  "study-scripture": { title: "Study Scripture", subtitle: "Read, study, and go deeper into the Word" },
  "sabbath-prayer": { title: "Sabbath School & Prayer", subtitle: "Weekly lessons and your prayer life" },
  "learning-paths": { title: "Learning Paths", subtitle: "Structured plans for spiritual growth" },
  "study-tools": { title: "Study Tools", subtitle: "Maps, timeline, and historic commentary" },
  "adventist-studies": { title: "Essentials", subtitle: "Core Adventist teachings and distinctive beliefs" },
  "spiritual-themes": { title: "Spiritual Themes", subtitle: "Explore Scripture by theme" },
};

export default function StudyCategoryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { category } = useLocalSearchParams<{ category: string }>();
  const { userId } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const meta = CATEGORY_META[category || ""] || { title: "Study", subtitle: "" };

  const { data: recentReads } = useQuery<{ id: string; bookId: number; bookName: string; chapter: number; translation: string }[]>({
    queryKey: [`/api/reading-history/recent?userId=${userId}`],
    enabled: category === "study-scripture",
  });

  const lastRead = recentReads?.[0] ?? null;

  const { data: layerCompletions } = useQuery<LayerCompletionEntry[]>({
    queryKey: [`/api/layer-completions?userId=${userId}&bookId=${lastRead?.bookId}&chapter=${lastRead?.chapter}`],
    enabled: category === "study-scripture" && !!userId && !!lastRead,
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

  const renderItems = () => {
    switch (category) {
      case "study-scripture":
        return (
          <>
            <TopicImageCard
              id="quick-read"
              title="Quick Read"
              subtitle="Read a passage without extra study layers"
              onPress={() => router.push("/book-picker" as any)}
            />
            <TopicImageCard
              id="guided-study"
              title="Guided Study"
              subtitle="Choose a passage and explore it with guided questions"
              onPress={() => router.push("/study-guide" as any)}
            />
            <TopicImageCard
              id="deep-study"
              title="Deep Dive"
              subtitle={deepStudyState.sub}
              badge="Guided"
              onPress={() => router.push({ pathname: "/deep-study-picker-v2", params: { ...deepStudyState.routeParams, _t: String(Date.now()) } } as any)}
            />
          </>
        );

      case "sabbath-prayer":
        return (
          <>
            <TopicImageCard
              id="fundamental-beliefs"
              title="Sabbath School"
              subtitle="This week's lesson, discussion questions, and insights"
              onPress={() => router.push("/(tabs)/ss/sabbath-school" as any)}
            />
            <TopicImageCard
              id="prayer"
              title="Prayer Journal"
              subtitle="Record, track, and reflect on your prayer life"
              onPress={() => router.push("/prayer-journal" as any)}
            />
          </>
        );

      case "learning-paths":
        return (
          <>
            <TopicImageCard
              id="study-paths"
              title="Study Paths"
              subtitle="Structured paths through Scripture"
              onPress={() => router.push("/study-paths" as any)}
            />
            <TopicImageCard
              id="devotional-plans"
              title="Devotional Plans"
              subtitle="Daily reading plans for spiritual growth"
              onPress={() => router.push("/devotions" as any)}
            />
          </>
        );

      case "study-tools":
        return (
          <>
            <TopicImageCard
              id="historic-voices"
              title="Classic Commentators"
              subtitle="Matthew Henry, Adam Clarke, John Gill & more"
              onPress={() => router.push("/historic-voices" as any)}
            />
            <TopicImageCard
              id="bible-maps"
              title="Bible Maps"
              subtitle="Ancient locations and biblical geography"
              onPress={() => router.push("/maps-timeline?tab=maps" as any)}
            />
            <TopicImageCard
              id="timeline"
              title="Timeline"
              subtitle="Walk through biblical history"
              onPress={() => router.push("/maps-timeline?tab=timeline" as any)}
            />
          </>
        );

      case "adventist-studies":
        return (
          <>
            <TopicImageCard
              id="fundamental-beliefs"
              title="28 Fundamental Beliefs"
              subtitle="The core doctrines of the Seventh-day Adventist Church"
              onPress={() => router.push("/sda-studies" as any)}
            />
            <TopicImageCard
              id="second-coming"
              title="The Second Coming"
              subtitle="The blessed hope at the heart of Adventist faith"
              onPress={() => router.push("/topic/second-coming")}
            />
            <TopicImageCard
              id="sabbath-study"
              title="The Sabbath"
              subtitle="God's gift of rest from Creation to eternity"
              onPress={() => router.push("/topic/sabbath-study")}
            />
            <TopicImageCard
              id="sanctuary-study"
              title="The Sanctuary"
              subtitle="Understanding Christ's ministry in heaven"
              onPress={() => router.push("/topic/sanctuary-study")}
            />
            <TopicImageCard
              id="three-angels"
              title="Three Angels' Messages"
              subtitle="Study the messages of Revelation 14"
              onPress={() => router.push("/topic/three-angels")}
            />
            <TopicImageCard
              id="state-of-the-dead"
              title="The State of the Dead"
              subtitle="What the Bible teaches about death and resurrection"
              onPress={() => router.push("/topic/state-of-the-dead")}
            />
            <TopicImageCard
              id="health"
              title="Health Message"
              subtitle="Biblical principles for wholeness"
              onPress={() => router.push("/topic/health")}
            />
          </>
        );

      case "spiritual-themes":
        return (
          <>
            {[
              { id: "love", title: "Love", subtitle: "Explore what Scripture teaches about love" },
              { id: "faith", title: "Faith", subtitle: "Walking by faith, not by sight" },
              { id: "prayer", title: "Prayer", subtitle: "Drawing near to God in prayer" },
              { id: "peace", title: "Peace", subtitle: "Finding rest in God's promises" },
              { id: "hope", title: "Hope", subtitle: "Anchored in the hope of Christ" },
              { id: "strength", title: "Strength", subtitle: "God's strength in our weakness" },
              { id: "wisdom", title: "Wisdom", subtitle: "Seeking wisdom from above" },
              { id: "grace", title: "Grace", subtitle: "The unmerited favor of God" },
              { id: "joy", title: "Joy", subtitle: "The joy of the Lord is our strength" },
            ].map((item) => (
              <TopicImageCard
                key={item.id}
                id={item.id}
                title={item.title}
                subtitle={item.subtitle}
                onPress={() => router.push(`/topic/${item.id}`)}
              />
            ))}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[st.headerBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={st.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[st.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {meta.title}
          </Text>
          <Text style={[st.headerSub, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {meta.subtitle}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: bottomPad + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.cards}>
          {renderItems()}
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
  cards: { gap: 10 },
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
