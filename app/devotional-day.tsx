import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
  Linking,
  Animated,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { safeGoBack } from "@/lib/safe-back";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import { useProStatus } from "@/contexts/ProContext";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "expo-haptics";
import { useStudyDepth } from "@/contexts/StudyDepthContext";
import StudyDepthSelector from "@/components/StudyDepthSelector";
import SDAVerifiedBadge from "@/components/SDAVerifiedBadge";

interface TodayResponse {
  today: DayContent | null;
  enrollment?: {
    id: string;
    planId: string;
  };
  completedCount?: number;
  totalDays?: number;
  planComplete?: boolean;
  message?: string;
}

interface DayContent {
  id: string;
  planId: string;
  dayNumber: number;
  title: string;
  bookId: number | null;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
  passageLabel: string | null;
  contextNote: string | null;
  reflectionQuestions: string[] | null;
  prayerPrompt: string | null;
  thenContext: string | null;
  nowApplication: string | null;
  historicVoiceExcerpt: string | null;
}

interface Verse {
  id: string;
  verse: number;
  text: string;
}

interface PassageResponse {
  book: { id: number; name: string };
  chapter: number;
  verses: Verse[];
}

interface ReflectionExchange {
  question: string;
  answer: string;
  response: string;
  followUp: string | null;
}

function ReflectionQuestion({
  question,
  index,
  theme,
  isDark,
  passageLabel,
  dayTitle,
  previousExchanges,
}: {
  question: string;
  index: number;
  theme: any;
  isDark: boolean;
  passageLabel?: string;
  dayTitle?: string;
  previousExchanges: ReflectionExchange[];
}) {
  const [answer, setAnswer] = useState("");
  const [exchanges, setExchanges] = useState<ReflectionExchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [followUpAnswer, setFollowUpAnswer] = useState("");

  const handleSubmitAnswer = useCallback(async (questionText: string, answerText: string) => {
    if (!answerText.trim()) return;
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const allPrev = [...previousExchanges, ...exchanges];
      const res = await apiRequest("POST", "/api/devotionals/reflect", {
        question: questionText,
        userAnswer: answerText.trim(),
        passageLabel,
        dayTitle,
        previousExchanges: allPrev.map((e) => ({
          question: e.question,
          answer: e.answer,
          response: e.response,
        })),
      });
      const data = await res.json();
      setExchanges((prev) => [
        ...prev,
        {
          question: questionText,
          answer: answerText.trim(),
          response: data.response,
          followUp: data.followUp,
        },
      ]);
      setAnswer("");
      setFollowUpAnswer("");
    } catch {
      setExchanges((prev) => [
        ...prev,
        {
          question: questionText,
          answer: answerText.trim(),
          response: "Thank you for your reflection. Keep seeking God's truth in His Word.",
          followUp: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [exchanges, previousExchanges, passageLabel, dayTitle]);

  const lastExchange = exchanges[exchanges.length - 1];
  const hasAnswered = exchanges.length > 0;

  return (
    <View style={rStyles.questionContainer}>
      <View style={rStyles.questionRow}>
        <Text style={[rStyles.questionNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
          {index + 1}.
        </Text>
        <Text style={[rStyles.questionText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
          {question}
        </Text>
      </View>

      {exchanges.map((ex, i) => (
        <View key={i} style={rStyles.exchangeBlock}>
          <View style={[rStyles.userBubble, { backgroundColor: theme.accent + "20" }]}>
            <Text style={[rStyles.bubbleLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              Your Reflection
            </Text>
            <Text style={[rStyles.bubbleText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
              {ex.answer}
            </Text>
          </View>
          <View style={[rStyles.aiBubble, { backgroundColor: isDark ? "#1A2030" : "#EEF0F5" }]}>
            <View style={rStyles.aiHeader}>
              <Ionicons name="sparkles" size={14} color="#8B5CF6" />
              <Text style={[rStyles.bubbleLabel, { color: "#8B5CF6", fontFamily: "Inter_600SemiBold" }]}>
                AI-assisted reflection
              </Text>
            </View>
            <Text style={[rStyles.bubbleText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
              {ex.response}
            </Text>
          </View>
        </View>
      ))}

      {loading ? (
        <View style={rStyles.loadingRow}>
          <ActivityIndicator size="small" color="#8B5CF6" />
          <Text style={[rStyles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Reflecting on your answer...
          </Text>
        </View>
      ) : lastExchange?.followUp ? (
        <View style={rStyles.followUpBlock}>
          <View style={rStyles.questionRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#8B5CF6" style={{ marginTop: 2 }} />
            <Text style={[rStyles.followUpText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              {lastExchange.followUp}
            </Text>
          </View>
          <View style={rStyles.answerRow}>
            <TextInput
              value={followUpAnswer}
              onChangeText={setFollowUpAnswer}
              placeholder="Share your thoughts..."
              placeholderTextColor={theme.textMuted}
              multiline
              style={[rStyles.answerInput, {
                color: theme.text,
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
                fontFamily: "Inter_400Regular",
              }]}
            />
            <Pressable
              onPress={() => handleSubmitAnswer(lastExchange.followUp!, followUpAnswer)}
              disabled={!followUpAnswer.trim()}
              style={({ pressed }) => [
                rStyles.sendBtn,
                { backgroundColor: "#8B5CF6", opacity: !followUpAnswer.trim() ? 0.4 : pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      ) : !hasAnswered ? (
        <View style={rStyles.answerRow}>
          <TextInput
            value={answer}
            onChangeText={setAnswer}
            placeholder="Type your answer..."
            placeholderTextColor={theme.textMuted}
            multiline
            style={[rStyles.answerInput, {
              color: theme.text,
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
              fontFamily: "Inter_400Regular",
            }]}
          />
          <Pressable
            onPress={() => handleSubmitAnswer(question, answer)}
            disabled={!answer.trim()}
            style={({ pressed }) => [
              rStyles.sendBtn,
              { backgroundColor: theme.accent, opacity: !answer.trim() ? 0.4 : pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const rStyles = StyleSheet.create({
  questionContainer: { gap: 8 },
  questionRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  questionNum: { fontSize: 14, width: 20, textAlign: "right" },
  questionText: { fontSize: 14, lineHeight: 22, flex: 1 },
  exchangeBlock: { gap: 8, marginLeft: 28 },
  userBubble: { borderRadius: 12, padding: 12, gap: 4 },
  aiBubble: { borderRadius: 12, padding: 12, gap: 6 },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  bubbleLabel: { fontSize: 11, letterSpacing: 0.3, textTransform: "uppercase" as const },
  bubbleText: { fontSize: 14, lineHeight: 22 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 28, paddingVertical: 8 },
  loadingText: { fontSize: 13 },
  followUpBlock: { gap: 8, marginLeft: 20 },
  followUpText: { fontSize: 14, lineHeight: 20, flex: 1, fontStyle: "italic" as const },
  answerRow: { flexDirection: "row", gap: 8, alignItems: "flex-end", marginLeft: 28 },
  answerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 44,
    maxHeight: 100,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top" as const,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});

export default function DevotionalDayScreen() {
  const { planId, groupId, depth: depthParam } = useLocalSearchParams<{ planId?: string; groupId?: string; depth?: string }>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { depth, setDepth } = useStudyDepth();

  useEffect(() => {
    if (depthParam === "quick" || depthParam === "standard" || depthParam === "deep") {
      setDepth(depthParam);
    }
  }, []);
  const { triggerMissionInvite } = useProStatus();
  const [journalText, setJournalText] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [shareToGroup, setShareToGroup] = useState(false);
  const [shared, setShared] = useState(false);
  const doneAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const todayQueryKey = planId
    ? `/api/devotionals/today?userId=${userId}&planId=${planId}`
    : `/api/devotionals/today?userId=${userId}`;

  const { data: todayData, isLoading } = useQuery<TodayResponse>({
    queryKey: [todayQueryKey],
  });

  const day = todayData?.today;
  const enrollment = todayData?.enrollment;

  const passageQuery = day?.bookId && day?.chapter
    ? `/api/passage?book=${day.bookId}&chapter=${day.chapter}&translation=KJV`
    : null;

  const { data: passageData } = useQuery<PassageResponse>({
    queryKey: [passageQuery],
    enabled: !!passageQuery,
  });

  const verses = passageData?.verses;

  const filteredVerses = React.useMemo(() => {
    if (!verses || !day) return [];
    if (day.verseStart && day.verseEnd) {
      return verses.filter((v) => v.verse >= day.verseStart! && v.verse <= day.verseEnd!);
    }
    return verses;
  }, [verses, day]);

  const handleComplete = async () => {
    if (!enrollment || !day) return;
    setCompleting(true);
    try {
      await apiRequest("POST", "/api/devotionals/complete", {
        enrollmentId: enrollment.id,
        dayId: day.id,
        journalEntry: journalText.trim() || null,
      });
      if (shareToGroup && groupId && journalText.trim()) {
        try {
          await apiRequest("POST", `/api/groups/${groupId}/share-reflection`, {
            content: journalText.trim(),
            dayTitle: day.title,
            passageLabel: day.passageLabel || null,
          });
          setShared(true);
        } catch {}
      }
      setCompleted(true);
      triggerMissionInvite();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.timing(doneAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
      ]).start();
      queryClient.invalidateQueries({ queryKey: [todayQueryKey] });
      queryClient.invalidateQueries({ queryKey: [`/api/devotionals/today?userId=${userId}`] });
    } catch {
      setCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Today's Reading" }} />
        <View style={[styles.centered, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </>
    );
  }

  if (!day || todayData?.planComplete) {
    return (
      <>
        <Stack.Screen options={{ title: "Devotional" }} />
        <View style={[styles.centered, { backgroundColor: theme.background }]}>
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <Ionicons
              name={todayData?.planComplete ? "checkmark-circle" : "flame-outline"}
              size={40}
              color={todayData?.planComplete ? theme.success : theme.textMuted}
            />
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              {todayData?.planComplete ? "Plan Complete!" : "No Active Plan"}
            </Text>
            <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {todayData?.planComplete
                ? "Congratulations! You have completed your devotional plan."
                : "Enroll in a devotional plan from the home screen to start your daily readings."}
            </Text>
            <Pressable
              onPress={() => {
                safeGoBack(router);
                setTimeout(() => router.push("/devotionals"), 300);
              }}
              style={[styles.browseBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.browseBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                {todayData?.planComplete ? "Start Another Plan" : "Browse Plans"}
              </Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  const progress = todayData?.completedCount ?? 0;
  const total = todayData?.totalDays ?? 1;
  const progressPct = Math.round((progress / total) * 100);

  return (
    <>
      <Stack.Screen options={{ title: `Day ${day.dayNumber}` }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: theme.accent }]} />
        </View>
        <Text style={[styles.progressLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
          Day {day.dayNumber} of {total} ({progress} completed)
        </Text>

        <StudyDepthSelector compact />

        <View style={[styles.dayHeader, { backgroundColor: theme.primary }]}>
          <Text style={[styles.dayHeaderTitle, { fontFamily: "Lora_700Bold" }]}>
            {day.title}
          </Text>
          {day.passageLabel && (
            <View style={styles.passageBadge}>
              <Ionicons name="book-outline" size={12} color={Colors.light.accent} />
              <Text style={[styles.passageBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                {day.passageLabel}
              </Text>
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <SDAVerifiedBadge variant="compact" />
        </View>

        {filteredVerses.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="book-outline" size={16} color={theme.accent} />
              <Text style={[styles.cardLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                Scripture Reading
              </Text>
            </View>
            {filteredVerses.map((v) => (
              <View key={v.id} style={styles.verseLine}>
                <Text style={[styles.verseNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  {v.verse}
                </Text>
                <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                  {v.text}
                </Text>
              </View>
            ))}
          </View>
        )}

        {depth === "quick" && day.contextNote && (
          <View style={[styles.card, { backgroundColor: theme.accent + "10", borderColor: theme.accent + "30" }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="flash" size={16} color={theme.accent} />
              <Text style={[styles.cardLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                Key Insight
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
              {day.contextNote}
            </Text>
            {day.nowApplication && (
              <View style={[styles.quickActionItem, { backgroundColor: theme.success + "12", borderColor: theme.success + "25" }]}>
                <Ionicons name="arrow-forward-circle" size={16} color={theme.success} />
                <Text style={[styles.quickActionText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  {day.nowApplication.length > 200 ? day.nowApplication.substring(0, 200).trim() + "..." : day.nowApplication}
                </Text>
              </View>
            )}
          </View>
        )}

        {depth !== "quick" && day.contextNote && (
          <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="information-circle-outline" size={16} color={theme.accent} />
              <Text style={[styles.cardLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                Context Note
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {day.contextNote}
            </Text>
          </View>
        )}

        {depth !== "quick" && day.thenContext && (
          <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="time-outline" size={16} color={theme.accent} />
              <Text style={[styles.cardLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                Then (Historical Context)
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {day.thenContext}
            </Text>
          </View>
        )}

        {depth !== "quick" && day.nowApplication && (
          <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="today-outline" size={16} color={theme.success} />
              <Text style={[styles.cardLabel, { color: theme.success, fontFamily: "Inter_600SemiBold" }]}>
                Now (Modern Application)
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {day.nowApplication}
            </Text>
          </View>
        )}

        {day.historicVoiceExcerpt && (depth === "deep" || depth === "standard") && (
          <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="library-outline" size={16} color="#8B5CF6" />
              <Text style={[styles.cardLabel, { color: "#8B5CF6", fontFamily: "Inter_600SemiBold" }]}>
                Further Reading
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {day.historicVoiceExcerpt.replace(/\(https:\/\/egwwritings\.org\S*/g, "").replace(/\s+/g, " ").trim().replace(/[—\-,.\s]+$/, ".")}
            </Text>
            {day.historicVoiceExcerpt.includes("egwwritings.org") ? (
              <Pressable
                onPress={() => {
                  const url = day.historicVoiceExcerpt!.match(/https:\/\/egwwritings\.org\S*/)?.[0]?.replace(/[).]+$/, "");
                  if (url) Linking.openURL(url);
                }}
                style={[styles.egwLink, { backgroundColor: "#8B5CF6" + "15" }]}
                testID="egw-link"
                accessibilityRole="link"
                accessibilityLabel="Read on Ellen G. White Writings"
              >
                <Ionicons name="open-outline" size={14} color="#8B5CF6" />
                <Text style={[styles.egwLinkText, { color: "#8B5CF6", fontFamily: "Inter_600SemiBold" }]}>
                  Read on Ellen G. White Writings
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {depth === "deep" && day.passageLabel && (
          <View style={[styles.card, { backgroundColor: "#6D28D9" + "10", borderColor: "#6D28D9" + "30" }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="language-outline" size={16} color="#8B5CF6" />
              <Text style={[styles.cardLabel, { color: "#8B5CF6", fontFamily: "Inter_600SemiBold" }]}>
                Word Studies & Cross-References
              </Text>
            </View>
            <Pressable
              onPress={() => {
                if (day.bookId && day.chapter) {
                  router.push(`/word-study?book=${day.bookId}&chapter=${day.chapter}${day.verseStart ? `&verse=${day.verseStart}` : ""}`);
                }
              }}
              style={[styles.deepStudyLink, { backgroundColor: "#8B5CF6" + "12" }]}
            >
              <Ionicons name="search" size={14} color="#8B5CF6" />
              <Text style={[styles.deepStudyLinkText, { color: "#8B5CF6", fontFamily: "Inter_600SemiBold" }]}>
                Explore Greek/Hebrew Word Studies
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (day.passageLabel) {
                  router.push(`/passage-context?passage=${encodeURIComponent(day.passageLabel)}`);
                }
              }}
              style={[styles.deepStudyLink, { backgroundColor: "#8B5CF6" + "12" }]}
            >
              <Ionicons name="git-network-outline" size={14} color="#8B5CF6" />
              <Text style={[styles.deepStudyLinkText, { color: "#8B5CF6", fontFamily: "Inter_600SemiBold" }]}>
                View Cross-References & Context
              </Text>
            </Pressable>
          </View>
        )}

        {depth !== "quick" && day.reflectionQuestions && day.reflectionQuestions.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="help-circle-outline" size={16} color={theme.bookmarkBlue} />
              <Text style={[styles.cardLabel, { color: theme.bookmarkBlue, fontFamily: "Inter_600SemiBold" }]}>
                Reflection Questions
              </Text>
            </View>
            <Text style={[{ color: theme.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 }]}>
              Answer each question to start a discussion
            </Text>
            {day.reflectionQuestions.map((q, i) => (
              <ReflectionQuestion
                key={i}
                question={q}
                index={i}
                theme={theme}
                isDark={isDark}
                passageLabel={day.passageLabel || undefined}
                dayTitle={day.title}
                previousExchanges={[]}
              />
            ))}
          </View>
        )}

        {depth !== "quick" && day.prayerPrompt && (
          <View style={[styles.card, { backgroundColor: theme.primary + "12", borderColor: theme.primary + "30" }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="hand-left-outline" size={16} color={theme.primary} />
              <Text style={[styles.cardLabel, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
                Prayer Prompt
              </Text>
            </View>
            <Text style={[styles.prayerText, { color: theme.text, fontFamily: "Lora_400Regular_Italic" }]}>
              {day.prayerPrompt}
            </Text>
          </View>
        )}

        {!completed ? (
          <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            {depth !== "quick" && (
              <>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="journal-outline" size={16} color={theme.accent} />
                  <Text style={[styles.cardLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                    Journal (optional)
                  </Text>
                </View>
                <TextInput
                  value={journalText}
                  onChangeText={setJournalText}
                  placeholder="Write your reflections here..."
                  placeholderTextColor={theme.textMuted}
                  multiline
                  style={[styles.journalInput, {
                    color: theme.text,
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                    fontFamily: "Inter_400Regular",
                  }]}
                />
              </>
            )}
            {groupId ? (
              <Pressable
                onPress={() => setShareToGroup(!shareToGroup)}
                style={[styles.shareToggleRow, { backgroundColor: shareToGroup ? theme.accent + "15" : "transparent", borderColor: theme.border }]}
              >
                <Ionicons
                  name={shareToGroup ? "checkbox" : "square-outline"}
                  size={20}
                  color={shareToGroup ? theme.accent : theme.textMuted}
                />
                <Text style={[styles.shareToggleText, { color: shareToGroup ? theme.accent : theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Share reflection with group
                </Text>
                <Ionicons name="people" size={16} color={shareToGroup ? theme.accent : theme.textMuted} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleComplete}
              disabled={completing}
              style={({ pressed }) => [
                styles.completeBtn,
                { backgroundColor: theme.accent, opacity: pressed || completing ? 0.7 : 1 },
              ]}
            >
              {completing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={[styles.completeBtnText, { fontFamily: "Inter_700Bold" }]}>
                    Mark Day Complete
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <Animated.View style={[styles.doneCard, { backgroundColor: theme.success + "15", borderColor: theme.success + "30", opacity: doneAnim, transform: [{ scale: doneAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <Ionicons name="checkmark-circle" size={28} color={theme.success} />
            </Animated.View>
            <Text style={[styles.doneTitle, { color: theme.success, fontFamily: "Lora_600SemiBold" }]}>
              Day {day.dayNumber} Complete
            </Text>
            <Text style={[styles.doneBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {shared ? "Your reflection was shared with your group. " : ""}Come back tomorrow for your next reading.
            </Text>
            {progress + 1 < total && (
              <View style={styles.doneProgressRow}>
                <View style={[styles.doneProgressBar, { backgroundColor: theme.success + "25" }]}>
                  <View style={[styles.doneProgressFill, { backgroundColor: theme.success, width: `${Math.round(((progress + 1) / total) * 100)}%` as any }]} />
                </View>
                <Text style={[styles.doneProgressText, { color: theme.success, fontFamily: "Inter_600SemiBold" }]}>
                  {progress + 1}/{total} days
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 14 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: { fontSize: 12, textAlign: "center", marginTop: 4 },
  dayHeader: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  dayHeaderTitle: { color: "#EDE5D5", fontSize: 20, textAlign: "center" },
  passageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  passageBadgeText: { color: "#C9933A", fontSize: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  cardLabel: { fontSize: 15, letterSpacing: 0.3 },
  cardBody: { fontSize: 14, lineHeight: 22 },
  verseLine: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  verseNum: { fontSize: 10, width: 18, textAlign: "right", marginTop: 4 },
  verseText: { fontSize: 15, lineHeight: 24, flex: 1 },
  questionRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  questionNum: { fontSize: 14, width: 20, textAlign: "right" },
  questionText: { fontSize: 14, lineHeight: 22, flex: 1 },
  prayerText: { fontSize: 15, lineHeight: 24, fontStyle: "italic" },
  journalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    minHeight: 100,
    fontSize: 14,
    lineHeight: 22,
    textAlignVertical: "top",
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  completeBtnText: { color: "#fff", fontSize: 15 },
  doneCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  doneTitle: { fontSize: 18 },
  doneBody: { fontSize: 14, textAlign: "center" },
  doneProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    width: "100%",
  },
  doneProgressBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  doneProgressFill: {
    height: 5,
    borderRadius: 3,
  },
  doneProgressText: {
    fontSize: 12,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 14,
    maxWidth: 340,
  },
  emptyTitle: { fontSize: 18, textAlign: "center" },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  browseBtn: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 4,
  },
  browseBtnText: { color: "#fff", fontSize: 14 },
  shareToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  shareToggleText: { fontSize: 13, flex: 1 },
  egwLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  egwLinkText: { fontSize: 13 },
  quickActionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 6,
  },
  quickActionText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  deepStudyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  deepStudyLinkText: {
    fontSize: 13,
  },
});
