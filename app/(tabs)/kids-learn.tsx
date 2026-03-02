import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  FadeInDown,
  interpolate,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { KidsColors } from "@/constants/colors";
import { useKidsMode } from "@/context/KidsModeContext";
import { apiRequest } from "@/lib/query-client";

interface QuizQuestion {
  id: string;
  storyId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
}

interface Story {
  id: string;
  title: string;
  scriptureRef: string | null;
  memoryVerse: string | null;
  memoryVerseRef: string | null;
  ageGroup: string;
  collectionId: string | null;
}

type LearnTab = "quiz" | "memory";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function BouncyQuizOption({
  opt,
  idx,
  theme,
  onPress,
}: {
  opt: string;
  idx: number;
  theme: any;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      testID={`quiz-option-${idx}`}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 12, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
      onPress={onPress}
      style={[
        animStyle,
        styles.quizOption,
        { backgroundColor: theme.backgroundCard, borderColor: theme.border },
      ]}
    >
      <View style={[styles.optionLetter, { backgroundColor: theme.accent + "20" }]}>
        <Text style={[styles.optionLetterText, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
          {String.fromCharCode(65 + idx)}
        </Text>
      </View>
      <Text style={[styles.optionText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
        {opt}
      </Text>
    </AnimatedPressable>
  );
}

function BouncyStoryItem({
  story,
  idx,
  theme,
  onPress,
}: {
  story: Story;
  idx: number;
  theme: any;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      testID={`quiz-story-${idx}`}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 12, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
      onPress={onPress}
      style={[
        animStyle,
        styles.storyItem,
        { backgroundColor: theme.backgroundCard, borderColor: theme.border },
      ]}
    >
      <Ionicons name="help-circle" size={22} color={theme.accent} />
      <View style={styles.storyItemInfo}>
        <Text style={[styles.storyItemTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {story.title}
        </Text>
        {story.scriptureRef && (
          <Text style={[styles.storyItemRef, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {story.scriptureRef}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </AnimatedPressable>
  );
}

function StarBurst({ theme }: { theme: any }) {
  const starColor = (theme as any).starGold || theme.accent;

  return (
    <View style={styles.starBurstContainer}>
      {[0, 1, 2, 3, 4].map((i) => (
        <StarBurstItem key={i} index={i} color={starColor} />
      ))}
    </View>
  );
}

function StarBurstItem({ index, color }: { index: number; color: string }) {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    const delay = index * 80;
    const timer = setTimeout(() => {
      scale.value = withSequence(
        withSpring(1.4, { damping: 6, stiffness: 150 }),
        withSpring(1, { damping: 8, stiffness: 120 })
      );
      rotation.value = withSequence(
        withTiming(30, { duration: 200 }),
        withTiming(-15, { duration: 150 }),
        withTiming(0, { duration: 100 })
      );
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const angle = (index * 72) * (Math.PI / 180);
    const radius = interpolate(scale.value, [0, 1], [0, 50]);
    return {
      transform: [
        { translateX: Math.cos(angle) * radius },
        { translateY: Math.sin(angle) * radius },
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
      opacity: scale.value,
    };
  });

  return (
    <Animated.View style={[styles.burstStar, animStyle]}>
      <Ionicons name="star" size={22} color={color} />
    </Animated.View>
  );
}

function BouncyMemorizeBtn({
  storyId,
  theme,
  onPress,
  idx,
}: {
  storyId: string;
  theme: any;
  onPress: () => void;
  idx: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      testID={`memorize-${idx}`}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 12, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
      onPress={onPress}
      style={[
        animStyle,
        styles.memorizeBtn,
        { backgroundColor: theme.success + "20", borderColor: theme.success },
      ]}
    >
      <Ionicons name="checkmark-circle" size={18} color={theme.success} />
      <Text style={[styles.memorizeBtnText, { color: theme.success, fontFamily: "Inter_600SemiBold" }]}>
        I Memorized This
      </Text>
    </AnimatedPressable>
  );
}

export default function KidsLearnScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? KidsColors.dark : KidsColors.light;
  const insets = useSafeAreaInsets();
  const { ageGroup, activeChildProfileId } = useKidsMode();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<LearnTab>("quiz");
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [quizState, setQuizState] = useState<{ currentQ: number; answers: number[]; done: boolean }>({
    currentQ: 0,
    answers: [],
    done: false,
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: collections } = useQuery<{ id: string; title: string }[]>({
    queryKey: [`/api/kids/collections?ageGroup=${ageGroup}`],
  });

  const firstCollectionId = collections?.[0]?.id;
  const { data: stories } = useQuery<Story[]>({
    queryKey: [`/api/kids/collections/${firstCollectionId}/stories`],
    enabled: !!firstCollectionId,
  });

  const { data: quizQuestions } = useQuery<QuizQuestion[]>({
    queryKey: [`/api/kids/stories/${selectedStory?.id}/quiz`],
    enabled: !!selectedStory && activeTab === "quiz",
  });

  const progressUserId = activeChildProfileId || "guest";

  const submitQuiz = useMutation({
    mutationFn: async (score: number) => {
      await apiRequest("POST", "/api/kids/progress/quiz", {
        userId: progressUserId,
        storyId: selectedStory!.id,
        score,
        childProfileId: activeChildProfileId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/kids/progress/${progressUserId}`] });
    },
  });

  const memorizeMutation = useMutation({
    mutationFn: async (storyId: string) => {
      await apiRequest("POST", "/api/kids/progress/memorize", {
        userId: progressUserId,
        storyId,
        childProfileId: activeChildProfileId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/kids/progress/${progressUserId}`] });
    },
  });

  const handleAnswer = (optionIdx: number) => {
    if (!quizQuestions) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newAnswers = [...quizState.answers, optionIdx];
    const nextQ = quizState.currentQ + 1;
    if (nextQ >= quizQuestions.length) {
      const correct = newAnswers.filter((a, i) => a === quizQuestions[i].correctIndex).length;
      const score = Math.round((correct / quizQuestions.length) * 100);
      setQuizState({ currentQ: quizState.currentQ, answers: newAnswers, done: true });
      submitQuiz.mutate(score);
    } else {
      setQuizState({ currentQ: nextQ, answers: newAnswers, done: false });
    }
  };

  const resetQuiz = () => {
    setQuizState({ currentQ: 0, answers: [], done: false });
    setSelectedStory(null);
  };

  const currentQuestion = quizQuestions?.[quizState.currentQ];
  const quizScore = quizState.done && quizQuestions
    ? quizState.answers.filter((a, i) => a === quizQuestions[i].correctIndex).length
    : 0;
  const isPerfectScore = quizState.done && quizQuestions && quizScore === quizQuestions.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Learn
        </Text>
        <View style={styles.tabToggle}>
          {(["quiz", "memory"] as LearnTab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => { setActiveTab(tab); setSelectedStory(null); setQuizState({ currentQ: 0, answers: [], done: false }); }}
              style={[styles.tabBtn, { backgroundColor: activeTab === tab ? theme.accent : theme.backgroundCard, borderColor: theme.border }]}
            >
              <Ionicons
                name={tab === "quiz" ? "help-circle-outline" : "bookmark-outline"}
                size={16}
                color={activeTab === tab ? "#fff" : theme.textSecondary}
              />
              <Text style={[styles.tabBtnText, { color: activeTab === tab ? "#fff" : theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                {tab === "quiz" ? "Quizzes" : "Memory Verses"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "quiz" && !selectedStory && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              Choose a Story to Quiz
            </Text>
            {stories?.map((s, idx) => (
              <Animated.View key={s.id} entering={FadeInDown.delay(idx * 60).springify()}>
                <BouncyStoryItem
                  story={s}
                  idx={idx}
                  theme={theme}
                  onPress={() => { setSelectedStory(s); setQuizState({ currentQ: 0, answers: [], done: false }); }}
                />
              </Animated.View>
            ))}
          </>
        )}

        {activeTab === "quiz" && selectedStory && !quizState.done && currentQuestion && (
          <View style={styles.quizContainer}>
            <Pressable onPress={resetQuiz} style={styles.backRow}>
              <Ionicons name="chevron-back" size={16} color={theme.accent} />
              <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>Back</Text>
            </Pressable>
            <Text style={[styles.quizProgress, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Question {quizState.currentQ + 1} of {quizQuestions?.length}
            </Text>
            <Text style={[styles.quizQuestion, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              {currentQuestion.question}
            </Text>
            {currentQuestion.options.map((opt, idx) => (
              <Animated.View key={idx} entering={FadeInDown.delay(idx * 80).springify()}>
                <BouncyQuizOption
                  opt={opt}
                  idx={idx}
                  theme={theme}
                  onPress={() => handleAnswer(idx)}
                />
              </Animated.View>
            ))}
          </View>
        )}

        {activeTab === "quiz" && quizState.done && quizQuestions && (
          <View style={styles.quizResult}>
            {isPerfectScore && <StarBurst theme={theme} />}
            <Ionicons
              name={quizScore === quizQuestions.length ? "trophy" : quizScore > 0 ? "star" : "refresh"}
              size={56}
              color={(theme as any).starGold || theme.accent}
            />
            <Text style={[styles.resultTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              {quizScore === quizQuestions.length ? "Perfect Score!" : quizScore > 0 ? "Great Job!" : "Keep Trying!"}
            </Text>
            <Text style={[styles.resultScore, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              You got {quizScore} out of {quizQuestions.length} correct
            </Text>
            <Pressable
              onPress={resetQuiz}
              style={[styles.resultBtn, { backgroundColor: theme.accent }]}
              testID="try-another"
            >
              <Text style={[styles.resultBtnText, { fontFamily: "Inter_600SemiBold" }]}>Try Another</Text>
            </Pressable>
          </View>
        )}

        {activeTab === "memory" && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              Memory Verses
            </Text>
            {stories?.filter(s => s.memoryVerse).map((s, idx) => (
              <Animated.View key={s.id} entering={FadeInDown.delay(idx * 60).springify()}>
                <View
                  style={[styles.verseCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
                >
                  <View style={[styles.verseAccentBorder, { backgroundColor: theme.accent }]} />
                  <View style={styles.verseContent}>
                    <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                      "{s.memoryVerse}"
                    </Text>
                    <Text style={[styles.verseRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      {s.memoryVerseRef}
                    </Text>
                    <Text style={[styles.verseStory, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      From: {s.title}
                    </Text>
                    <BouncyMemorizeBtn
                      storyId={s.id}
                      theme={theme}
                      idx={idx}
                      onPress={() => memorizeMutation.mutate(s.id)}
                    />
                  </View>
                </View>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, marginBottom: 12 },
  tabToggle: { flexDirection: "row", gap: 8 },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  tabBtnText: { fontSize: 14 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, marginBottom: 12, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  storyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  storyItemInfo: { flex: 1 },
  storyItemTitle: { fontSize: 15 },
  storyItemRef: { fontSize: 12, marginTop: 2 },
  quizContainer: {},
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  backText: { fontSize: 14 },
  quizProgress: { fontSize: 13, marginBottom: 8 },
  quizQuestion: { fontSize: 22, lineHeight: 30, marginBottom: 20 },
  quizOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  optionLetter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLetterText: { fontSize: 16 },
  optionText: { flex: 1, fontSize: 15, lineHeight: 21 },
  quizResult: { alignItems: "center", paddingTop: 40, gap: 12 },
  resultTitle: { fontSize: 24, marginTop: 8 },
  resultScore: { fontSize: 16 },
  resultBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, marginTop: 16 },
  resultBtnText: { color: "#fff", fontSize: 15 },
  starBurstContainer: {
    position: "absolute",
    top: 20,
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    height: 120,
  },
  burstStar: {
    position: "absolute",
  },
  verseCard: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
  },
  verseAccentBorder: {
    width: 4,
  },
  verseContent: {
    flex: 1,
    padding: 18,
  },
  verseText: { fontSize: 16, lineHeight: 24, fontStyle: "italic", marginBottom: 8 },
  verseRef: { fontSize: 14, marginBottom: 4 },
  verseStory: { fontSize: 12, marginBottom: 12 },
  memorizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  memorizeBtnText: { fontSize: 14 },
});
