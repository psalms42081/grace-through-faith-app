import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { BOOK_TOPICS, TOPIC_INFO } from "@/data/book-topics";

interface ContextCard {
  id: string;
  category: string | null;
  title: string;
  body: string;
}

interface CommentaryEntry {
  id: string;
  commentatorName?: string;
  body: string;
}

interface DevPlan {
  id: string;
  title: string;
  totalDays: number;
  theme: string | null;
}

interface RelatedContentProps {
  bookId: number;
  bookName: string;
  chapter: number;
  totalChapters: number;
  translation: string;
  theme: typeof Colors.dark;
  isDark: boolean;
}

export default function RelatedContent({
  bookId,
  bookName,
  chapter,
  totalChapters,
  translation,
  theme,
  isDark,
}: RelatedContentProps) {
  const { data: contextCards } = useQuery<ContextCard[]>({
    queryKey: [`/api/context?book=${bookId}&chapter=${chapter}`],
  });

  const { data: commentary } = useQuery<CommentaryEntry[]>({
    queryKey: [`/api/commentary?book=${bookId}&chapter=${chapter}`],
  });

  const { data: plans } = useQuery<DevPlan[]>({
    queryKey: ["/api/devotionals/plans?traditionKey=all"],
  });

  const relatedTopics = useMemo(() => {
    const topics = BOOK_TOPICS[bookName] || ["faith", "love", "hope"];
    return topics.slice(0, 3).map((id) => ({ id, ...TOPIC_INFO[id] })).filter(Boolean);
  }, [bookName]);

  const hasContext = (contextCards?.length ?? 0) > 0;
  const hasCommentary = (commentary?.length ?? 0) > 0;
  const nearbyChapters = useMemo(() => {
    const chs: number[] = [];
    for (let c = Math.max(1, chapter - 2); c <= Math.min(totalChapters, chapter + 2); c++) {
      if (c !== chapter) chs.push(c);
    }
    return chs;
  }, [chapter, totalChapters]);

  return (
    <View style={relatedStyles.wrapper}>
      <View style={[relatedStyles.divider, { backgroundColor: theme.border }]} />

      <View style={relatedStyles.header}>
        <Text style={[relatedStyles.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Study {bookName} {chapter}
        </Text>
        <Text style={[relatedStyles.headerSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Dive deeper with the 4-Layer Study Model
        </Text>
      </View>

      <View style={relatedStyles.studyGrid}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(
              `/passage-context?bookId=${bookId}&chapter=${chapter}&bookName=${encodeURIComponent(bookName)}`
            );
          }}
          style={({ pressed }) => [
            relatedStyles.studyLayerCard,
            { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
          ]}
          testID="related-context"
        >
          <LinearGradient colors={["#2E7D32", "#1B5E20"]} style={relatedStyles.studyLayerIcon}>
            <Ionicons name="time-outline" size={18} color="#fff" />
          </LinearGradient>
          <Text style={[relatedStyles.studyLayerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Context</Text>
          <Text style={[relatedStyles.studyLayerDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {hasContext ? `${contextCards!.length} cards` : "Historical"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/(tabs)/study?tab=voices&bookId=${bookId}&chapter=${chapter}&bookName=${encodeURIComponent(bookName)}`);
          }}
          style={({ pressed }) => [
            relatedStyles.studyLayerCard,
            { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
          ]}
          testID="related-voices"
        >
          <LinearGradient colors={["#3B6CB5", "#2A4F8F"]} style={relatedStyles.studyLayerIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
          </LinearGradient>
          <Text style={[relatedStyles.studyLayerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Historic Voices</Text>
          <Text style={[relatedStyles.studyLayerDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {hasCommentary ? `${commentary!.length} entries` : "Commentary"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/(tabs)/study?tab=word&bookId=${bookId}&chapter=${chapter}&bookName=${encodeURIComponent(bookName)}`);
          }}
          style={({ pressed }) => [
            relatedStyles.studyLayerCard,
            { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
          ]}
          testID="related-word"
        >
          <LinearGradient colors={["#C9933A", "#A87828"]} style={relatedStyles.studyLayerIcon}>
            <Ionicons name="language-outline" size={18} color="#fff" />
          </LinearGradient>
          <Text style={[relatedStyles.studyLayerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Word Study</Text>
          <Text style={[relatedStyles.studyLayerDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Greek & Hebrew</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/(tabs)/study?tab=application&bookId=${bookId}&chapter=${chapter}&bookName=${encodeURIComponent(bookName)}`);
          }}
          style={({ pressed }) => [
            relatedStyles.studyLayerCard,
            { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
          ]}
          testID="related-application"
        >
          <LinearGradient colors={["#8B5CF6", "#6D3BD4"]} style={relatedStyles.studyLayerIcon}>
            <Ionicons name="heart-outline" size={18} color="#fff" />
          </LinearGradient>
          <Text style={[relatedStyles.studyLayerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Application</Text>
          <Text style={[relatedStyles.studyLayerDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Then & Now</Text>
        </Pressable>
      </View>

      {relatedTopics.length > 0 && (
        <>
          <Text style={[relatedStyles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            TOPICS
          </Text>
          <View style={relatedStyles.topicsRow}>
            {relatedTopics.map((topic) => (
              <Pressable
                key={topic.id}
                onPress={() => router.push(`/topic/${topic.id}`)}
                style={({ pressed }) => [relatedStyles.topicChip, { opacity: pressed ? 0.8 : 1 }]}
              >
                <LinearGradient
                  colors={topic.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={relatedStyles.topicChipGradient}
                >
                  <Ionicons name={topic.icon} size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={[relatedStyles.topicChipText, { fontFamily: "Inter_600SemiBold" }]}>
                    {topic.title}
                  </Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {plans && plans.length > 0 && (
        <>
          <Text style={[relatedStyles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            DEVOTIONAL PLANS
          </Text>
          {plans.slice(0, 2).map((plan) => (
            <Pressable
              key={plan.id}
              onPress={() => router.push("/devotionals")}
              style={({ pressed }) => [
                relatedStyles.planRow,
                { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="flame" size={18} color={theme.accent} />
              <View style={relatedStyles.planInfo}>
                <Text style={[relatedStyles.planTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                  {plan.title}
                </Text>
                <Text style={[relatedStyles.planMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {plan.totalDays} days
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>
          ))}
        </>
      )}

      {nearbyChapters.length > 0 && (
        <>
          <Text style={[relatedStyles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            SEE ALSO
          </Text>
          {nearbyChapters.map((ch) => (
            <Pressable
              key={ch}
              onPress={() => router.replace(`/read/${bookId}/${ch}?translation=${translation}`)}
              style={({ pressed }) => [
                relatedStyles.seeAlsoRow,
                { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={relatedStyles.seeAlsoInfo}>
                <Text style={[relatedStyles.seeAlsoLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {bookName}
                </Text>
                <Text style={[relatedStyles.seeAlsoTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  Chapter {ch}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

const relatedStyles = StyleSheet.create({
  wrapper: {
    marginTop: 40,
    paddingBottom: 20,
  },
  divider: {
    height: 1,
    marginBottom: 28,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: { fontSize: 22, marginBottom: 4 },
  headerSub: { fontSize: 13 },
  studyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  studyLayerCard: {
    width: "48%",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    flexGrow: 1,
    flexBasis: "45%",
  },
  studyLayerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  studyLayerTitle: { fontSize: 14, marginBottom: 1 },
  studyLayerDesc: { fontSize: 11 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },
  topicsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  topicChip: {},
  topicChipGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  topicChipText: { color: "#fff", fontSize: 13 },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  planInfo: { flex: 1 },
  planTitle: { fontSize: 14, marginBottom: 2 },
  planMeta: { fontSize: 12 },
  seeAlsoRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  seeAlsoInfo: { flex: 1 },
  seeAlsoLabel: { fontSize: 11, marginBottom: 2 },
  seeAlsoTitle: { fontSize: 15 },
});
