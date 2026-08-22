import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { safeGoBack } from "@/lib/safe-back";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Audio } from "expo-av";
import {
  SABBATH_SCHOOL_AUDIO_UNAVAILABLE_MESSAGE,
  toggleSabbathSchoolAudio,
  type SabbathSchoolPlaybackStatus,
  type SabbathSchoolSound,
} from "@/lib/sabbath-school-audio";
import { MemoryVerseCard } from "@/components/sabbath-school/MemoryVerseCard";
import { extractMemoryText } from "@/lib/sabbath-school-memory-text";

interface DayData {
  id: string;
  dayNumber: number;
  title: string | null;
  date: string | null;
  contentMarkdown: string | null;
  audioUrl?: string | null;
  completed: boolean;
  journalEntry: string | null;
}

interface LessonResponse {
  lesson: {
    id: string;
    lessonNumber: number;
    title: string;
    days: DayData[];
  };
  quarterly: {
    title: string;
  };
}

const REFLECTION_PROMPTS: Record<string, string[]> = {
  prayer: [
    "What challenged your prayer life today?",
    "Who comes to mind as someone you should pray for?",
    "What will you take into prayer from this lesson?",
  ],
  relationship: [
    "What relationship needs more grace or patience?",
    "What part of this lesson feels most personal today?",
    "What change could strengthen your home or church relationships?",
  ],
  faith: [
    "What truth from today's lesson do you want to carry into the day?",
    "What practical step stands out most?",
    "What is God asking you to do with what you read?",
  ],
  study: [
    "What insight from this passage surprised you?",
    "How does this connect to your experience this week?",
    "What would it look like to live this truth out today?",
  ],
  default: [
    "What stood out to you most in today's reading?",
    "What is one thing you want to remember from this lesson?",
    "How does today's lesson speak to where you are right now?",
  ],
};

function getReflectionPrompt(title: string | null, dayNumber: number): string {
  const t = (title || "").toLowerCase();
  let category = "default";
  if (/pray|prayer|intercession|supplication/.test(t)) category = "prayer";
  else if (/family|marriage|husband|wife|children|parent|relationship|living with/.test(t)) category = "relationship";
  else if (/faith|trust|believe|confidence|hope|standing/.test(t)) category = "faith";
  else if (/study|wisdom|knowledge|truth|scripture|word/.test(t)) category = "study";

  const prompts = REFLECTION_PROMPTS[category];
  return prompts[(dayNumber - 1) % prompts.length];
}

function MarkdownRenderer({
  content,
  theme,
}: {
  content: string;
  theme: any;
}) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let blockquote: string[] = [];

  const flushBlockquote = () => {
    if (blockquote.length > 0) {
      const text = blockquote
        .map((l) => l.replace(/^>\s*/, "").replace(/<p>|<\/p>/g, ""))
        .join(" ")
        .trim();
      elements.push(
        <View
          key={`bq-${elements.length}`}
          style={[styles.blockquote, { borderLeftColor: theme.accent }]}
        >
          <Text style={[styles.blockquoteText, { color: theme.text }]}>
            {formatInlineText(text, theme)}
          </Text>
        </View>
      );
      blockquote = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trimStart();

    if (trimmedLine.startsWith(">")) {
      blockquote.push(line);
      continue;
    }
    flushBlockquote();

    if (trimmedLine.startsWith("#### ")) {
      elements.push(
        <Text key={i} style={[styles.mdH4, { color: theme.text }]}>
          {trimmedLine.replace(/^####\s*/, "")}
        </Text>
      );
    } else if (trimmedLine.startsWith("### ")) {
      elements.push(
        <Text key={i} style={[styles.mdH3, { color: theme.text }]}>
          {trimmedLine.replace(/^###\s*/, "")}
        </Text>
      );
    } else if (trimmedLine.startsWith("## ")) {
      elements.push(
        <Text key={i} style={[styles.mdH2, { color: theme.text }]}>
          {trimmedLine.replace(/^##\s*/, "")}
        </Text>
      );
    } else if (trimmedLine.startsWith("# ")) {
      elements.push(
        <Text key={i} style={[styles.mdH1, { color: theme.text }]}>
          {trimmedLine.replace(/^#\s*/, "")}
        </Text>
      );
    } else if (trimmedLine.startsWith("---")) {
      elements.push(
        <View
          key={i}
          style={[styles.mdHr, { backgroundColor: theme.border }]}
        />
      );
    } else if (line.trim() === "") {
      elements.push(<View key={i} style={{ height: 8 }} />);
    } else {
      const cleaned = line
        .replace(/<p>|<\/p>/g, "")
        .replace(/\\\s*$/, "")
        .trim();
      if (cleaned) {
        elements.push(
          <Text key={i} style={[styles.mdParagraph, { color: theme.textSecondary }]}>
            {formatInlineText(cleaned, theme)}
          </Text>
        );
      }
    }
  }
  flushBlockquote();

  return <View style={styles.mdContainer}>{elements}</View>;
}

function formatInlineText(text: string, theme: any): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Normalize *italic* to _italic_ so both common styles render.
  let remaining = text.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1_$2_");
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/_(.+?)_/);
    const firstMatch =
      boldMatch && italicMatch
        ? (boldMatch.index || 0) <= (italicMatch.index || 0)
          ? boldMatch
          : italicMatch
        : boldMatch || italicMatch;

    if (!firstMatch || firstMatch.index === undefined) {
      parts.push(remaining);
      break;
    }

    if (firstMatch.index > 0) {
      parts.push(remaining.substring(0, firstMatch.index));
    }

    if (firstMatch === boldMatch) {
      parts.push(
        <Text key={key++} style={{ fontFamily: "Inter_700Bold" }}>
          {firstMatch[1]}
        </Text>
      );
    } else {
      parts.push(
        <Text key={key++} style={{ fontStyle: "italic" }}>
          {firstMatch[1]}
        </Text>
      );
    }

    remaining = remaining.substring(
      (firstMatch.index || 0) + firstMatch[0].length
    );
  }

  return parts;
}

function sanitizeContent(content: string): string {
  console.log("[sanitize] input snippet:", content.slice(0, 200));
  const result = content
    .replace(/<\/?code\b[^>]*>/gi, "")
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<\/?[^>]+>/g, "");
  console.log("[sanitize] output snippet:", result.slice(0, 200));
  return result;
}

export default function SabbathSchoolDayScreen() {
  useTheme(); // Path B light sweep: pinned light; teal = Sabbath School category token
  const theme = {
    background: "#FBF7EE",
    backgroundCard: "#FFFFFF",
    text: "#1F1A12",
    textSecondary: "#3F3A31",
    textMuted: "#6B6660",
    border: "#E7E0D2",
    accent: "#1F7A70",
  };
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    lessonNumber: string;
    dayNumber: string;
    quarterCode?: string;
  }>();

  const lessonNumber = parseInt(params.lessonNumber || "1");
  const dayNumber = parseInt(params.dayNumber || "1");
  const quarterCode = params.quarterCode || "";

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const queryPath = quarterCode
    ? `/api/sabbath-school/lesson/${lessonNumber}?userId=${userId}&quarterCode=${quarterCode}`
    : `/api/sabbath-school/lesson/${lessonNumber}?userId=${userId}`;

  const { data, isLoading } = useQuery<LessonResponse>({
    queryKey: [queryPath],
  });

  const day = data?.lesson?.days?.find((d) => d.dayNumber === dayNumber);
  const totalDays = data?.lesson?.days?.length || 7;

  const [journalText, setJournalText] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionState, setShowCompletionState] = useState(false);
  const audioSoundRef = useRef<Audio.Sound | null>(null);
  const audioAttemptRef = useRef(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasAudioFinished, setHasAudioFinished] = useState(false);
  const [isAudioUnavailable, setIsAudioUnavailable] = useState(false);

  React.useEffect(() => {
    const attemptRef = audioAttemptRef;
    const soundRef = audioSoundRef;
    return () => {
      attemptRef.current++;
      const current = soundRef.current;
      soundRef.current = null;
      current?.unloadAsync().catch(() => {});
    };
  }, []);

  React.useEffect(() => {
    audioAttemptRef.current++;
    const current = audioSoundRef.current;
    audioSoundRef.current = null;
    current?.unloadAsync().catch(() => {});
    setIsAudioPlaying(false);
    setIsAudioLoading(false);
    setHasAudioFinished(false);
    setIsAudioUnavailable(false);
  }, [day?.id, day?.audioUrl]);

  const markAudioUnavailable = React.useCallback(() => {
    const current = audioSoundRef.current;
    audioSoundRef.current = null;
    current?.unloadAsync().catch(() => {});
    setIsAudioLoading(false);
    setIsAudioPlaying(false);
    setHasAudioFinished(false);
    setIsAudioUnavailable(true);
  }, []);

  const toggleAudioPlayback = async () => {
    if (!day?.audioUrl || isAudioUnavailable || isAudioLoading) return;

    const attempt = audioAttemptRef.current;
    const existingSound = audioSoundRef.current;
    if (!existingSound) setIsAudioLoading(true);

    const result = await toggleSabbathSchoolAudio({
      url: day.audioUrl,
      sound: existingSound as SabbathSchoolSound | null,
      hasFinished: hasAudioFinished,
      prepareAudio: () =>
        Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
        }),
      createSound: async (url, onStatus) => {
        const created = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          (status) => onStatus(status as SabbathSchoolPlaybackStatus)
        );
        return {
          sound: created.sound as SabbathSchoolSound,
          status: created.status as SabbathSchoolPlaybackStatus,
        };
      },
      onStatus: (status) => {
        if (attempt !== audioAttemptRef.current) return;
        if (!status.isLoaded) {
          if (status.error) markAudioUnavailable();
          return;
        }
        setIsAudioPlaying(status.isPlaying ?? false);
        if (status.didJustFinish) {
          setIsAudioPlaying(false);
          setHasAudioFinished(true);
        }
      },
    });

    if (attempt !== audioAttemptRef.current) {
      if (result.sound) await result.sound.unloadAsync().catch(() => {});
      return;
    }

    setIsAudioLoading(false);
    if (result.kind === "unavailable") {
      markAudioUnavailable();
      return;
    }

    audioSoundRef.current = result.sound as Audio.Sound;
    setIsAudioPlaying(result.kind === "playing");
    if (result.kind === "playing") setHasAudioFinished(false);
  };

  // Keep the latest day record in a ref so the identity-change effect below can
  // snapshot the current completed/journal values WITHOUT re-running (and
  // clobbering in-progress edits) every time the query refetches.
  const dayRef = useRef(day);
  dayRef.current = day;

  React.useEffect(() => {
    const current = dayRef.current;
    if (current) {
      setIsCompleted(current.completed);
      setShowCompletionState(false);
      setJournalText(current.journalEntry || "");
    }
    // Re-sync local state only when the day identity changes.
  }, [day?.id]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/sabbath-school/complete", {
        userId,
        dayId: day!.id,
        journalEntry: journalText || null,
      });
    },
    onSuccess: () => {
      setIsCompleted(true);
      setShowCompletionState(true);
      queryClient.invalidateQueries({
        queryKey: [queryPath],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/sabbath-school/current?userId=${userId}`],
      });
    },
  });

  const DAY_NAMES_FALLBACK = ["Sabbath", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sabbath"];
  const dateMatch = (day?.date || "").match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  let currentDayName = DAY_NAMES_FALLBACK[dayNumber - 1] || `Day ${dayNumber}`;
  if (dateMatch) {
    const [, dd, mm, yyyy] = dateMatch;
    const parsed = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
    if (!isNaN(parsed.getTime())) {
      currentDayName = WEEKDAY_NAMES[parsed.getUTCDay()];
    }
  }
  const hasNextDay = dayNumber < totalDays;
  const completedDays = data?.lesson?.days?.filter(d => d.completed).length || 0;
  const newCompletedCount = isCompleted ? Math.max(completedDays, (data?.lesson?.days?.filter(d => d.completed || d.dayNumber === dayNumber).length || 0)) : completedDays;

  const reflectionPrompt = useMemo(
    () => getReflectionPrompt(day?.title || data?.lesson?.title || null, dayNumber),
    [day?.title, data?.lesson?.title, dayNumber]
  );
  const memoryTextExtraction = useMemo(
    () => extractMemoryText(day?.contentMarkdown),
    [day?.contentMarkdown]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => safeGoBack(router, "/(tabs)/explore")} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {currentDayName}
          </Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            Lesson {lessonNumber}
          </Text>
        </View>
        <View style={styles.navBtns}>
          {dayNumber > 1 && (
            <Pressable
              onPress={() =>
                router.replace(
                  `/sabbath-school-day?lessonNumber=${lessonNumber}&dayNumber=${dayNumber - 1}${quarterCode ? `&quarterCode=${quarterCode}` : ''}` as any
                )
              }
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={22} color={theme.textMuted} />
            </Pressable>
          )}
          {dayNumber < totalDays && (
            <Pressable
              onPress={() =>
                router.replace(
                  `/sabbath-school-day?lessonNumber=${lessonNumber}&dayNumber=${dayNumber + 1}${quarterCode ? `&quarterCode=${quarterCode}` : ''}` as any
                )
              }
              hitSlop={8}
            >
              <Ionicons name="chevron-forward" size={22} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : !day ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Day content not available.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {day.title && (
            <Text style={[styles.dayMainTitle, { color: theme.text }]}>
              {day.title}
            </Text>
          )}

          {day.audioUrl && !isAudioUnavailable && (
            <Pressable
              onPress={toggleAudioPlayback}
              disabled={isAudioLoading}
              accessibilityRole="button"
              accessibilityLabel={
                isAudioPlaying
                  ? "Pause today's Sabbath School lesson"
                  : "Listen to today's Sabbath School lesson"
              }
              accessibilityState={{
                disabled: isAudioLoading,
                busy: isAudioLoading,
              }}
              style={({ pressed }) => [
                styles.audioRow,
                pressed && !isAudioLoading ? styles.audioRowPressed : null,
              ]}
            >
              {isAudioLoading ? (
                <ActivityIndicator size="small" color="#1F7A70" />
              ) : (
                <Ionicons
                  name={isAudioPlaying ? "pause-circle-outline" : "play-circle-outline"}
                  size={32}
                  color="#1F7A70"
                />
              )}
              <Text style={styles.audioLabel}>
                {isAudioLoading ? "Loading audio..." : "Listen to Today's Lesson"}
              </Text>
            </Pressable>
          )}

          {isAudioUnavailable && (
            <View
              style={styles.audioUnavailableRow}
              accessibilityRole="alert"
            >
              <Ionicons name="alert-circle-outline" size={20} color="#8A5A44" />
              <Text style={styles.audioUnavailableText}>
                {SABBATH_SCHOOL_AUDIO_UNAVAILABLE_MESSAGE}
              </Text>
            </View>
          )}

          {memoryTextExtraction.memoryText && (
            <MemoryVerseCard
              memoryText={memoryTextExtraction.memoryText}
              testID="ss-day-memory-verse"
            />
          )}

          {memoryTextExtraction.remainingContent && (
            <MarkdownRenderer
              content={sanitizeContent(memoryTextExtraction.remainingContent)}
              theme={theme}
            />
          )}

          <View style={[styles.sourceAttribution, { borderTopColor: theme.border }]}>
            <Ionicons name="library-outline" size={13} color={theme.textMuted} />
            <Text style={[styles.sourceText, { color: theme.textMuted }]}>
              Official Sabbath School lesson content provided via Adventech.
            </Text>
          </View>

          <View style={[styles.journalSection, { borderTopColor: theme.border }]}>
            <View style={styles.journalHeader}>
              <Ionicons name="journal-outline" size={18} color={theme.accent} />
              <Text style={[styles.journalLabel, { color: theme.accent }]}>
                Personal Reflection
              </Text>
            </View>
            <TextInput
              style={[
                styles.journalInput,
                {
                  backgroundColor: theme.backgroundCard,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder={reflectionPrompt}
              placeholderTextColor={theme.textMuted}
              multiline
              value={journalText}
              onChangeText={setJournalText}
              textAlignVertical="top"
            />
          </View>

          {!showCompletionState ? (
            <Pressable
              onPress={() => {
                if (isCompleted) {
                  setShowCompletionState(true);
                } else {
                  completeMutation.mutate();
                }
              }}
              disabled={completeMutation.isPending}
              style={({ pressed }) => [
                styles.completeBtn,
                {
                  backgroundColor: isCompleted
                    ? "rgba(34, 197, 94, 0.15)"
                    : theme.accent,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {completeMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={isCompleted ? "checkmark-circle" : "checkmark-circle-outline"}
                  size={22}
                  color={isCompleted ? "#22C55E" : "#FFFFFF"}
                />
              )}
              <Text
                style={[
                  styles.completeBtnText,
                  { color: isCompleted ? "#22C55E" : "#FFFFFF" },
                ]}
              >
                {isCompleted ? "Completed" : "Mark as Complete"}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.completionCard, { borderColor: "rgba(34, 197, 94, 0.2)" }]}>
              <View style={styles.completionTop}>
                <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                <Text style={[styles.completionTitle, { color: theme.text }]}>
                  {currentDayName} Completed
                </Text>
              </View>

              <View style={styles.completionMeta}>
                {journalText.trim().length > 0 && (
                  <View style={styles.completionMetaItem}>
                    <Ionicons name="journal-outline" size={13} color="#8B5CF6" />
                    <Text style={[styles.completionMetaText, { color: "#8B5CF6" }]}>
                      Reflection saved
                    </Text>
                  </View>
                )}
                <View style={styles.completionMetaItem}>
                  <View style={styles.completionMiniBar}>
                    <View style={[styles.completionMiniFill, { width: `${(newCompletedCount / totalDays) * 100}%` }]} />
                  </View>
                  <Text style={[styles.completionMetaText, { color: theme.textMuted }]}>
                    {newCompletedCount} of {totalDays} days
                  </Text>
                </View>
              </View>

              {hasNextDay ? (
                <Pressable
                  onPress={() =>
                    router.replace(
                      `/sabbath-school-day?lessonNumber=${lessonNumber}&dayNumber=${dayNumber + 1}${quarterCode ? `&quarterCode=${quarterCode}` : ''}` as any
                    )
                  }
                  style={({ pressed }) => [
                    styles.completionPrimaryBtn,
                    { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.completionPrimaryText}>
                    Continue to {DAY_NAMES_FALLBACK[dayNumber] || `Day ${dayNumber + 1}`}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => safeGoBack(router, "/(tabs)/explore")}
                  style={({ pressed }) => [
                    styles.completionPrimaryBtn,
                    { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.completionPrimaryText}>
                    Back to Weekly Lesson
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() =>
                  router.push(
                    `/sabbath-school-discussion?lessonId=${data?.lesson?.id}&lessonTitle=${encodeURIComponent(data?.lesson?.title || "")}` as any
                  )
                }
                style={({ pressed }) => [
                  styles.completionSecondaryBtn,
                  { borderColor: "rgba(139, 92, 246, 0.25)", opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Ionicons name="chatbubbles-outline" size={16} color="#8B5CF6" />
                <Text style={[styles.completionSecondaryText, { color: "#8B5CF6" }]}>
                  Open Lesson Discussion Guide
                </Text>
              </Pressable>

              {hasNextDay && (
                <Pressable
                  onPress={() => safeGoBack(router, "/(tabs)/explore")}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: "center" as const, paddingVertical: 6 })}
                >
                  <Text style={[styles.completionLinkText, { color: theme.textMuted }]}>
                    Back to Lesson {lessonNumber}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontFamily: "Lora_700Bold", fontSize: 18 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  navBtns: { flexDirection: "row", gap: 8, width: 50, justifyContent: "flex-end" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 8 },
  dayMainTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 8,
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    alignSelf: "flex-start",
    paddingHorizontal: 4,
    paddingRight: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  audioRowPressed: {
    backgroundColor: "rgba(31, 122, 112, 0.08)",
    opacity: 0.82,
  },
  audioLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#6B6660",
  },
  audioUnavailableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F5EDE5",
    marginBottom: 8,
  },
  audioUnavailableText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: "#6F4937",
  },
  mdContainer: { gap: 4 },
  mdH1: { fontFamily: "Lora_700Bold", fontSize: 22, lineHeight: 30, marginTop: 16 },
  mdH2: { fontFamily: "Lora_600SemiBold", fontSize: 18, lineHeight: 26, marginTop: 14 },
  mdH3: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24, marginTop: 12 },
  mdH4: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22, marginTop: 10 },
  mdParagraph: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
  },
  mdHr: { height: 1, marginVertical: 16 },
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    paddingVertical: 8,
    marginVertical: 8,
  },
  blockquoteText: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 15,
    lineHeight: 24,
  },
  sourceAttribution: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 6,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  sourceText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  journalSection: {
    marginTop: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    gap: 10,
  },
  journalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  journalLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  journalInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    minHeight: 100,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 12,
  },
  completeBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  completionCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
    gap: 14,
    padding: 16,
    backgroundColor: "rgba(34, 197, 94, 0.04)",
  },
  completionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  completionTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 17,
  },
  completionMeta: {
    gap: 8,
  },
  completionMetaItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  completionMetaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  completionMiniBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    overflow: "hidden" as const,
  },
  completionMiniFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#22C55E",
  },
  completionPrimaryBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  completionPrimaryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  completionSecondaryBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  completionSecondaryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  completionLinkText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textDecorationLine: "underline" as const,
  },
});
