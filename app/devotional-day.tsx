import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  ActivityIndicator,
  TextInput,
  Linking,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import Colors from "@/constants/colors";

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

export default function DevotionalDayScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [journalText, setJournalText] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: todayData, isLoading } = useQuery<TodayResponse>({
    queryKey: ["/api/devotionals/today?userId=guest"],
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
      setCompleted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/devotionals/today?userId=guest"] });
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
                router.back();
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

        {day.contextNote && (
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

        {day.thenContext && (
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

        {day.nowApplication && (
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

        {day.historicVoiceExcerpt && (
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

        {day.reflectionQuestions && day.reflectionQuestions.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="help-circle-outline" size={16} color={theme.bookmarkBlue} />
              <Text style={[styles.cardLabel, { color: theme.bookmarkBlue, fontFamily: "Inter_600SemiBold" }]}>
                Reflection Questions
              </Text>
            </View>
            {day.reflectionQuestions.map((q, i) => (
              <View key={i} style={styles.questionRow}>
                <Text style={[styles.questionNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  {i + 1}.
                </Text>
                <Text style={[styles.questionText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                  {q}
                </Text>
              </View>
            ))}
          </View>
        )}

        {day.prayerPrompt && (
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
          <View style={[styles.doneCard, { backgroundColor: theme.success + "15", borderColor: theme.success + "30" }]}>
            <Ionicons name="checkmark-circle" size={28} color={theme.success} />
            <Text style={[styles.doneTitle, { color: theme.success, fontFamily: "Lora_600SemiBold" }]}>
              Day {day.dayNumber} Complete
            </Text>
            <Text style={[styles.doneBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Come back tomorrow for your next reading.
            </Text>
          </View>
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
  cardLabel: { fontSize: 12, letterSpacing: 0.3 },
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
});
