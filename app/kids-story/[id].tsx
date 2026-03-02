import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { KidsColors } from "@/constants/colors";
import { useKidsMode } from "@/context/KidsModeContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";

interface Story {
  id: string;
  title: string;
  scriptureRef: string | null;
  bookId: number | null;
  chapter: number | null;
  ageGroup: string;
  imageUrl: string | null;
  storyText: string;
  memoryVerse: string | null;
  memoryVerseRef: string | null;
  thinkQuestions: string[];
  prayerPrompt: string | null;
  activitySuggestion: string | null;
  estimatedMinutes: number;
}

interface WonderMoment {
  afterParagraph: number;
  question: string;
  options: { emoji: string; label: string }[];
  correctIndex: number;
}

function useImageBaseUrl() {
  return React.useMemo(() => {
    try { return getApiUrl().replace(/\/$/, ""); } catch { return ""; }
  }, []);
}

function WonderCard({
  moment,
  momentIndex,
  theme,
  isLittleLambs,
  answered,
  onAnswer,
}: {
  moment: WonderMoment;
  momentIndex: number;
  theme: any;
  isLittleLambs: boolean;
  answered: boolean;
  onAnswer: (momentIndex: number, choiceIndex: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const starScale = useRef(new Animated.Value(0)).current;
  const entranceScale = useRef(new Animated.Value(0.85)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(entranceScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSelect = useCallback(
    (choiceIndex: number) => {
      if (selected !== null || answered) return;
      setSelected(choiceIndex);

      Animated.sequence([
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 3,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.delay(200),
      ]).start();

      Animated.spring(starScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      onAnswer(momentIndex, choiceIndex);
    },
    [selected, answered, momentIndex, onAnswer]
  );

  const hasAnswered = selected !== null || answered;

  return (
    <Animated.View
      style={[
        styles.wonderCard,
        {
          backgroundColor: theme.starGold + "12",
          borderColor: theme.starGold + "40",
          transform: [{ scale: entranceScale }],
          opacity: entranceOpacity,
        },
      ]}
    >
      <View style={styles.wonderHeader}>
        <Ionicons name="sparkles" size={20} color={theme.starGold || "#F5A623"} />
        <Text style={[styles.wonderLabel, { color: theme.starGold || "#F5A623", fontFamily: "Inter_700Bold" }]}>
          Pause & Wonder
        </Text>
      </View>

      <Text
        style={[
          styles.wonderQuestion,
          {
            color: theme.text,
            fontFamily: "Lora_600SemiBold",
            fontSize: isLittleLambs ? 19 : 17,
            lineHeight: isLittleLambs ? 28 : 26,
          },
        ]}
      >
        {moment.question}
      </Text>

      <View style={styles.wonderOptions}>
        {moment.options.map((opt, i) => {
          const isSelected = selected === i;
          const optBg = isSelected
            ? theme.starGold + "25"
            : theme.backgroundCard;
          const optBorder = isSelected
            ? theme.starGold
            : theme.border;

          return (
            <Pressable
              key={i}
              onPress={() => handleSelect(i)}
              disabled={hasAnswered}
              style={[
                styles.wonderOption,
                {
                  backgroundColor: optBg,
                  borderColor: optBorder,
                  opacity: hasAnswered && !isSelected ? 0.5 : 1,
                },
              ]}
              testID={`wonder-option-${momentIndex}-${i}`}
            >
              <Text style={styles.wonderEmoji}>{opt.emoji}</Text>
              <Text
                style={[
                  styles.wonderOptionLabel,
                  {
                    color: theme.text,
                    fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_500Medium",
                    fontSize: isLittleLambs ? 15 : 14,
                  },
                ]}
              >
                {opt.label}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={20} color={theme.starGold || "#F5A623"} />
              )}
            </Pressable>
          );
        })}
      </View>

      {hasAnswered && (
        <Animated.View
          style={[
            styles.wonderReward,
            {
              transform: [{ scale: starScale }],
              backgroundColor: theme.starGold + "15",
            },
          ]}
        >
          <Ionicons name="star" size={22} color={theme.starGold || "#F5A623"} />
          <Text style={[styles.wonderRewardText, { color: theme.starGold || "#F5A623", fontFamily: "Inter_700Bold" }]}>
            +10 points!
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function CompletionStarBurst({ theme }: { theme: any }) {
  const mainScale = useRef(new Animated.Value(0)).current;
  const mainRotate = useRef(new Animated.Value(0)).current;
  const star1Scale = useRef(new Animated.Value(0)).current;
  const star1TransX = useRef(new Animated.Value(0)).current;
  const star1TransY = useRef(new Animated.Value(0)).current;
  const star2Scale = useRef(new Animated.Value(0)).current;
  const star2TransX = useRef(new Animated.Value(0)).current;
  const star2TransY = useRef(new Animated.Value(0)).current;
  const star3Scale = useRef(new Animated.Value(0)).current;
  const star3TransX = useRef(new Animated.Value(0)).current;
  const star3TransY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(mainScale, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }),
      Animated.timing(mainRotate, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.spring(star1Scale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
          Animated.spring(star1TransX, { toValue: -40, friction: 5, tension: 80, useNativeDriver: true }),
          Animated.spring(star1TransY, { toValue: -30, friction: 5, tension: 80, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.spring(star2Scale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
          Animated.spring(star2TransX, { toValue: 40, friction: 5, tension: 80, useNativeDriver: true }),
          Animated.spring(star2TransY, { toValue: -25, friction: 5, tension: 80, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.spring(star3Scale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
          Animated.spring(star3TransX, { toValue: 0, friction: 5, tension: 80, useNativeDriver: true }),
          Animated.spring(star3TransY, { toValue: -50, friction: 5, tension: 80, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const rotate = mainRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const starColor = (theme as any).starGold || theme.accent;

  return (
    <View style={styles.starBurstContainer}>
      <Animated.View style={{ transform: [{ scale: star1Scale }, { translateX: star1TransX }, { translateY: star1TransY }] }}>
        <Ionicons name="star" size={20} color={starColor} style={{ opacity: 0.7 }} />
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: star2Scale }, { translateX: star2TransX }, { translateY: star2TransY }] }}>
        <Ionicons name="star" size={16} color={starColor} style={{ opacity: 0.6 }} />
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: star3Scale }, { translateX: star3TransX }, { translateY: star3TransY }] }}>
        <Ionicons name="star" size={14} color={starColor} style={{ opacity: 0.5 }} />
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: mainScale }, { rotate }] }}>
        <Ionicons name="star" size={52} color={starColor} />
      </Animated.View>
    </View>
  );
}

export default function KidsStoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? KidsColors.dark : KidsColors.light;
  const insets = useSafeAreaInsets();
  const { ageGroup } = useKidsMode();
  const queryClient = useQueryClient();
  const [completed, setCompleted] = useState(false);
  const [answeredMoments, setAnsweredMoments] = useState<Set<number>>(new Set());
  const initializedRef = useRef(false);
  const baseUrl = useImageBaseUrl();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const isLittleLambs = ageGroup === "little_lambs";

  const { data: story, isLoading } = useQuery<Story>({
    queryKey: [`/api/kids/stories/${id}`],
    enabled: !!id,
  });

  const { data: progressData } = useQuery<{ wonderAnswers: number[]; completed: boolean }[]>({
    queryKey: [`/api/kids/progress/guest`],
    enabled: !!id,
  });

  React.useEffect(() => {
    if (!progressData || !id || initializedRef.current) return;
    const storyProgress = progressData.find((p: any) => p.storyId === id);
    if (storyProgress) {
      const answers = (storyProgress.wonderAnswers || []) as number[];
      if (answers.length > 0) {
        setAnsweredMoments(new Set(answers));
      }
      if (storyProgress.completed) {
        setCompleted(true);
      }
    }
    initializedRef.current = true;
  }, [progressData, id]);

  const { data: wonderData } = useQuery<{ moments: WonderMoment[] }>({
    queryKey: [`/api/kids/stories/${id}/wonder?ageGroup=${ageGroup}`],
    enabled: !!id && !!story,
  });

  const paragraphs = useMemo(() => {
    if (!story) return [];
    return story.storyText.split(/\n\n+/).filter((p) => p.trim());
  }, [story?.storyText]);

  const wonderMoments = wonderData?.moments || [];

  const answerMutation = useMutation({
    mutationFn: async (data: { momentIndex: number; choiceIndex: number }) => {
      await apiRequest("POST", "/api/kids/wonder/answer", {
        userId: "guest",
        storyId: id,
        momentIndex: data.momentIndex,
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/kids/progress/complete", {
        userId: "guest",
        storyId: id,
      });
      await apiRequest("POST", "/api/kids/streak/update", {
        userId: "guest",
      });
    },
    onSuccess: () => {
      setCompleted(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/kids/progress/guest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kids/streak/guest"] });
    },
  });

  const handleWonderAnswer = useCallback(
    (momentIndex: number, choiceIndex: number) => {
      setAnsweredMoments((prev) => new Set(prev).add(momentIndex));
      answerMutation.mutate({ momentIndex, choiceIndex });
    },
    []
  );

  if (isLoading || !story) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={{ paddingTop: topPad + 20 }}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </View>
    );
  }

  const renderStoryContent = () => {
    const elements: React.ReactNode[] = [];

    paragraphs.forEach((para, idx) => {
      elements.push(
        <Text
          key={`p-${idx}`}
          style={[
            styles.storyParagraph,
            {
              color: theme.text,
              fontFamily: "Lora_400Regular",
              fontSize: isLittleLambs ? 19 : 17,
              lineHeight: isLittleLambs ? 34 : 30,
            },
          ]}
        >
          {para}
        </Text>
      );

      const wonder = wonderMoments.find((m) => m.afterParagraph === idx);
      if (wonder) {
        const mIdx = wonderMoments.indexOf(wonder);
        elements.push(
          <WonderCard
            key={`w-${idx}`}
            moment={wonder}
            momentIndex={mIdx}
            theme={theme}
            isLittleLambs={isLittleLambs}
            answered={answeredMoments.has(mIdx)}
            onAnswer={handleWonderAnswer}
          />
        );
      }
    });

    return elements;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.headerBar, { paddingTop: topPad + 8, backgroundColor: theme.background }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
          testID="story-back"
        >
          <Ionicons name="chevron-back" size={24} color={theme.accent} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
            {story.title}
          </Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 120, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.storyTitle, { color: theme.text, fontFamily: "Lora_700Bold", fontSize: isLittleLambs ? 26 : 24 }]}>
          {story.title}
        </Text>
        {story.scriptureRef && (
          <Text style={[styles.scriptureRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            {story.scriptureRef}
          </Text>
        )}
        <View style={[styles.timeBadge, { backgroundColor: theme.accent + "15" }]}>
          <Ionicons name="time-outline" size={14} color={theme.accent} />
          <Text style={[styles.timeText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
            ~{story.estimatedMinutes} min read
          </Text>
        </View>

        {story.imageUrl && baseUrl ? (
          <Image
            source={{ uri: `${baseUrl}${story.imageUrl}` }}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
        ) : null}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {renderStoryContent()}

        {story.memoryVerse && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={[styles.memoryCard, { backgroundColor: theme.accent + "10", borderColor: theme.accent + "30" }]}>
              <View style={styles.memoryHeader}>
                <Ionicons name="bookmark" size={18} color={theme.accent} />
                <Text style={[styles.memoryLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  Memory Verse
                </Text>
              </View>
              <Text style={[styles.memoryText, { color: theme.text, fontFamily: "Lora_400Regular_Italic", fontSize: isLittleLambs ? 18 : 16 }]}>
                "{story.memoryVerse}"
              </Text>
              {story.memoryVerseRef && (
                <Text style={[styles.memoryRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  - {story.memoryVerseRef}
                </Text>
              )}
            </View>
          </>
        )}

        {story.thinkQuestions && story.thinkQuestions.length > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bulb-outline" size={22} color={(theme as any).starGold || theme.accent} />
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  Think About It
                </Text>
              </View>
              {story.thinkQuestions.map((q, idx) => (
                <View key={idx} style={[styles.questionItem, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                  <Text style={[styles.questionNum, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
                    {idx + 1}
                  </Text>
                  <Text style={[styles.questionText, { color: theme.text, fontFamily: "Inter_400Regular", fontSize: isLittleLambs ? 16 : 15 }]}>
                    {q}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {story.prayerPrompt && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={[styles.prayerCard, { backgroundColor: (theme as any).purple ? (theme as any).purple + "12" : theme.accent + "12", borderColor: (theme as any).purple ? (theme as any).purple + "30" : theme.accent + "30" }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.endCardIconBg, { backgroundColor: ((theme as any).purple || theme.accent) + "20" }]}>
                  <Ionicons name="hand-left-outline" size={22} color={(theme as any).purple || theme.accent} />
                </View>
                <Text style={[styles.sectionTitle, { color: (theme as any).purple || theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  Let's Pray
                </Text>
              </View>
              <Text style={[styles.prayerText, { color: theme.text, fontFamily: "Inter_400Regular", fontSize: isLittleLambs ? 16 : 15 }]}>
                {story.prayerPrompt}
              </Text>
            </View>
          </>
        )}

        {story.activitySuggestion && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={[styles.activityCard, { backgroundColor: theme.success + "12", borderColor: theme.success + "30" }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.endCardIconBg, { backgroundColor: theme.success + "20" }]}>
                  <Ionicons name="flash-outline" size={22} color={theme.success} />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.success, fontFamily: "Inter_600SemiBold" }]}>
                  Activity
                </Text>
              </View>
              <Text style={[styles.activityText, { color: theme.text, fontFamily: "Inter_400Regular", fontSize: isLittleLambs ? 16 : 15 }]}>
                {story.activitySuggestion}
              </Text>
            </View>
          </>
        )}

        <View style={{ marginTop: 24 }}>
          {!completed ? (
            <Pressable
              onPress={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              style={[styles.completeBtn, { backgroundColor: theme.accent }]}
              testID="complete-story"
            >
              {completeMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={[styles.completeBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                    I Finished This Story
                  </Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={styles.completedBox}>
              <CompletionStarBurst theme={theme} />
              <Text style={[styles.completedText, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                You earned a star!
              </Text>
              <Pressable
                onPress={() => router.back()}
                style={[styles.doneBtn, { backgroundColor: theme.accent }]}
                testID="done-btn"
              >
                <Text style={[styles.doneBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Back to Stories
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 14 },
  scroll: { flex: 1 },
  storyTitle: { marginTop: 8, marginBottom: 4 },
  scriptureRef: { fontSize: 15, marginBottom: 8 },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 8,
  },
  timeText: { fontSize: 12 },
  heroImage: {
    width: "100%" as any,
    height: 220,
    borderRadius: 16,
    marginTop: 12,
  },
  divider: { height: 1, marginVertical: 24 },
  storyParagraph: {
    marginBottom: 22,
  },
  wonderCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
    marginVertical: 16,
  },
  wonderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  wonderLabel: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  wonderQuestion: {
    marginBottom: 16,
  },
  wonderOptions: {
    gap: 10,
  },
  wonderOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  wonderEmoji: {
    fontSize: 24,
  },
  wonderOptionLabel: {
    flex: 1,
  },
  wonderReward: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  wonderRewardText: {
    fontSize: 15,
  },
  memoryCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
  },
  memoryHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  memoryLabel: { fontSize: 14 },
  memoryText: { lineHeight: 26 },
  memoryRef: { fontSize: 14, marginTop: 8, textAlign: "right" },
  section: {},
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 17 },
  questionItem: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  questionNum: { fontSize: 16, minWidth: 20 },
  questionText: { flex: 1, lineHeight: 24 },
  prayerCard: { padding: 22, borderRadius: 20, borderWidth: 1 },
  prayerText: { lineHeight: 26 },
  activityCard: { padding: 22, borderRadius: 20, borderWidth: 1 },
  activityText: { lineHeight: 26 },
  endCardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 28,
  },
  completeBtnText: { color: "#fff", fontSize: 16 },
  completedBox: { alignItems: "center", paddingVertical: 24, gap: 14 },
  completedText: { fontSize: 22 },
  starBurstContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 80,
    width: 120,
  },
  doneBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  doneBtnText: { color: "#fff", fontSize: 15 },
});
