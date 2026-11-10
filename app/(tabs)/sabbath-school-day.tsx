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
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { safeGoBack } from "@/lib/safe-back";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { readingScreenBottomPad } from "@/lib/reading-screen-inset";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { sabbathSchoolAudioUrl } from "@/lib/sabbath-school-media";
import { useTheme } from "@/hooks/useTheme";
import { getSabbathSchoolQuarterTheme } from "@/lib/sabbath-school-quarter-theme";
import { useAuth } from "@/contexts/AuthContext";
import { useSabbathSchoolTrack } from "@/hooks/useSabbathSchoolTrack";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { addPlaybackStatusListener } from "@/lib/audio-playback";
import {
  SABBATH_SCHOOL_AUDIO_UNAVAILABLE_MESSAGE,
  sabbathSchoolPlaybackHasStarted,
  toggleSabbathSchoolAudio,
  waitForSabbathSchoolPlaybackStart,
  type SabbathSchoolPlaybackStatus,
  type SabbathSchoolSound,
} from "@/lib/sabbath-school-audio";
import { MemoryVerseCard } from "@/components/sabbath-school/MemoryVerseCard";
import { LessonDayBody } from "@/components/sabbath-school/LessonDayBody";
import { extractMemoryText } from "@/lib/sabbath-school-memory-text";
import { loadLocalLessonAnswers, saveLocalLessonAnswer } from "@/lib/sabbath-school-answers";
import { buildStudyTutorRoute } from "@/lib/sabbath-school-tutor";
import {
  buildSabbathSchoolDayNavigator,
  buildSabbathSchoolDayRoute,
  getSabbathSchoolDayPickerOffset,
  weekdayNameForSabbathSchoolDay,
} from "@/lib/sabbath-school-day-navigation";
import {
  sabbathSchoolTabBarClearance,
  SABBATH_SCHOOL_TAB_ROOT,
  useSabbathSchoolTabContainment,
} from "@/lib/sabbath-school-route-containment";
import { useSabbathSchoolLastRead } from "@/lib/sabbath-school-continue";

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
    colorPrimary: string | null;
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

export default function SabbathSchoolDayScreen() {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [wideReading, setWideReading] = useState(false);
  useTheme(); // Path B light sweep: pinned light; teal = Sabbath School category token
  const insets = useSafeAreaInsets();
  const { userId, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    lessonNumber: string;
    dayNumber: string;
    quarterCode?: string;
  }>();

  const lessonNumber = parseInt(params.lessonNumber || "1");
  const dayNumber = parseInt(params.dayNumber || "1");
  const quarterCode = params.quarterCode || "";
  const { selectedTrack } = useSabbathSchoolTrack();
  const { recordLastRead } = useSabbathSchoolLastRead(userId);
  const isTabContained = useSabbathSchoolTabContainment(
    "sabbath-school-day",
    {
      lessonNumber: params.lessonNumber,
      dayNumber: params.dayNumber,
      quarterCode: params.quarterCode,
    },
    !!params.lessonNumber && !!params.dayNumber,
  );

  React.useEffect(() => {
    if (!params.lessonNumber || !params.dayNumber) return;
    recordLastRead({
      lessonNumber,
      dayNumber,
      quarterCode: quarterCode || undefined,
    });
  }, [
    params.lessonNumber,
    params.dayNumber,
    lessonNumber,
    dayNumber,
    quarterCode,
    recordLastRead,
  ]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = isTabContained
    ? (Platform.OS === "web" ? 34 : insets.bottom) +
      sabbathSchoolTabBarClearance(isTabContained, Platform.OS)
    : readingScreenBottomPad(Platform.OS === "web" ? 34 : insets.bottom);

  // `curriculum` lets the server open the chosen track when a deep link or
  // notification arrives without a quarter code.
  const queryPath = quarterCode
    ? `/api/sabbath-school/lesson/${lessonNumber}?userId=${userId}&quarterCode=${quarterCode}&curriculum=${selectedTrack}`
    : `/api/sabbath-school/lesson/${lessonNumber}?userId=${userId}&curriculum=${selectedTrack}`;

  const { data, isLoading } = useQuery<LessonResponse>({
    queryKey: [queryPath],
  });
  const quarterTheme = getSabbathSchoolQuarterTheme(data?.quarterly?.colorPrimary);
  const theme = {
    background: "#FBF7EE",
    backgroundCard: "#FFFFFF",
    text: "#1F1A12",
    textSecondary: "#3F3A31",
    textMuted: "#6B6660",
    border: "#E7E0D2",
    accent: quarterTheme.primary,
  };

  const day = data?.lesson?.days?.find((d) => d.dayNumber === dayNumber);
  const currentLessonId = data?.lesson?.id;
  const totalDays = data?.lesson?.days?.length || 7;

  const [journalText, setJournalText] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const scrollViewport = useRef(0);
  const scrollContentHeight = useRef(0);
  const answerTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [showCompletionState, setShowCompletionState] = useState(false);
  const audioSoundRef = useRef<SabbathSchoolSound | null>(null);
  const audioAttemptRef = useRef(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasAudioFinished, setHasAudioFinished] = useState(false);
  const [isAudioUnavailable, setIsAudioUnavailable] = useState(false);
  const dayPickerRef = useRef<ScrollView>(null);
  const [dayPickerViewportWidth, setDayPickerViewportWidth] = useState(0);

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
      url: sabbathSchoolAudioUrl(day.audioUrl, {
        platform: Platform.OS,
        baseUrl: getApiUrl(),
      }),
      sound: existingSound as SabbathSchoolSound | null,
      hasFinished: hasAudioFinished,
      prepareAudio: () =>
        setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldPlayInBackground: false,
        }),
      createSound: async (url, onStatus) => {
        const player: AudioPlayer = createAudioPlayer({ uri: url }, { updateInterval: 250 });
        const sound: SabbathSchoolSound = {
          getStatusAsync: async () => ({
            isLoaded: player.duration > 0 || player.currentTime > 0,
            isPlaying: player.playing,
            didJustFinish: false,
          }),
          pauseAsync: async () => {
            player.pause();
          },
          playAsync: async () => {
            player.play();
          },
          replayAsync: async () => {
            await player.seekTo(0);
            player.play();
          },
          unloadAsync: async () => {
            player.remove();
          },
        };
        addPlaybackStatusListener(player, (status) => {
          if (!status.isLoaded && (status as { error?: string }).error) {
            onStatus({ isLoaded: false, error: (status as { error?: string }).error });
            return;
          }
          onStatus({
            isLoaded: status.isLoaded,
            isPlaying: status.playing,
            didJustFinish: status.didJustFinish,
          });
        });
        player.play();
        const started = await waitForSabbathSchoolPlaybackStart(() =>
          sabbathSchoolPlaybackHasStarted({
            playing: player.playing,
            currentTime: player.currentTime,
            duration: player.duration,
          }),
        );
        if (!started) {
          player.remove();
          throw new Error("Sabbath School audio did not start");
        }
        return {
          sound,
          status: { isLoaded: true, isPlaying: true },
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

    audioSoundRef.current = result.sound;
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
    setReachedEnd(false);
    setAnswers({});
    // Re-sync local state only when the day identity changes.
  }, [day?.id]);

  React.useEffect(() => {
    const dayId = day?.id;
    if (!dayId) return;
    let cancelled = false;
    const apply = (next: Record<string, string>) => {
      if (!cancelled) setAnswers(next);
    };
    if (isAuthenticated) {
      apiRequest("GET", `/api/sabbath-school/answers?dayId=${encodeURIComponent(dayId)}`)
        .then((response) => response.json())
        .then((payload: { answers?: Record<string, string> }) => apply(payload.answers || {}))
        .catch(() => apply({}));
    } else {
      loadLocalLessonAnswers(dayId).then(apply).catch(() => apply({}));
    }
    return () => {
      cancelled = true;
    };
  }, [day?.id, isAuthenticated]);

  const saveAnswer = (questionKey: string, value: string) => {
    const dayId = day?.id;
    if (!dayId) return;
    setAnswers((current) => ({ ...current, [questionKey]: value }));
    const existing = answerTimers.current[questionKey];
    if (existing) clearTimeout(existing);
    answerTimers.current[questionKey] = setTimeout(() => {
      if (isAuthenticated) {
        void apiRequest("PUT", "/api/sabbath-school/answers", {
          dayId,
          questionKey,
          answer: value,
        }).catch(() => {});
      } else {
        void saveLocalLessonAnswer(dayId, questionKey, value).catch(() => {});
      }
    }, 400);
  };

  const noteReachedEnd = (offsetY: number, viewport: number, contentHeight: number) => {
    if (viewport <= 0 || contentHeight <= 0) return;
    if (offsetY + viewport >= contentHeight - 48) setReachedEnd(true);
  };

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
        predicate: (query) => {
          const head = query.queryKey[0];
          return (
            typeof head === "string" &&
            (head === "sabbath-school-current" ||
              head === "home-sabbath-school-current" ||
              head.includes("/api/sabbath-school/current"))
          );
        },
      });
    },
  });

  const dayNavigatorItems = useMemo(
    () => buildSabbathSchoolDayNavigator(data?.lesson?.days ?? []),
    [data?.lesson?.days],
  );
  React.useEffect(() => {
    const activeIndex = dayNavigatorItems.findIndex(
      (item) => item.dayNumber === dayNumber,
    );
    if (activeIndex < 0 || dayPickerViewportWidth <= 0) return;

    const frame = requestAnimationFrame(() => {
      dayPickerRef.current?.scrollTo({
        x: getSabbathSchoolDayPickerOffset({
          activeIndex,
          viewportWidth: dayPickerViewportWidth,
        }),
        animated: false,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [dayNavigatorItems, dayNumber, dayPickerViewportWidth]);
  const currentDayName = day
    ? weekdayNameForSabbathSchoolDay(day)
    : `Day ${dayNumber}`;
  const goToDay = (targetDayNumber: number) =>
    router.replace(
      buildSabbathSchoolDayRoute({
        lessonNumber,
        dayNumber: targetDayNumber,
        quarterCode,
      }) as any,
    );
  const hasNextDay = dayNumber < totalDays;
  const useWideReading = wideReading || (viewportWidth > viewportHeight && viewportWidth >= 700);
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

  if (!isTabContained) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => safeGoBack(router, SABBATH_SCHOOL_TAB_ROOT)} hitSlop={12} style={styles.backBtn}>
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
          <Pressable
            onPress={() => setWideReading((value) => !value)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={useWideReading ? "Use focused lesson width" : "Use wide lesson width"}
            accessibilityState={{ selected: useWideReading }}
          >
            <Ionicons
              name={useWideReading ? "contract-outline" : "expand-outline"}
              size={20}
              color={useWideReading ? quarterTheme.primary : theme.textMuted}
            />
          </Pressable>
          {dayNumber > 1 && (
            <Pressable
              onPress={() => goToDay(dayNumber - 1)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Previous lesson day"
            >
              <Ionicons name="chevron-back" size={22} color={theme.textMuted} />
            </Pressable>
          )}
          {dayNumber < totalDays && (
            <Pressable
              onPress={() => goToDay(dayNumber + 1)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Next lesson day"
            >
              <Ionicons name="chevron-forward" size={22} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {dayNavigatorItems.length > 0 && (
        <View
          style={[styles.dayPickerBar, { borderBottomColor: theme.border }]}
          testID="ss-day-picker"
        >
          <ScrollView
            ref={dayPickerRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayPickerContent}
            onLayout={(event) =>
              setDayPickerViewportWidth(event.nativeEvent.layout.width)
            }
          >
            {dayNavigatorItems.map((item) => {
              const isActive = item.dayNumber === dayNumber;
              const isComplete =
                data?.lesson?.days?.find(
                  (lessonDay) => lessonDay.dayNumber === item.dayNumber,
                )?.completed ?? false;

              return (
                <Pressable
                  key={item.dayNumber}
                  onPress={() => goToDay(item.dayNumber)}
                  accessibilityRole="tab"
                  accessibilityLabel={`Open ${item.label}'s lesson`}
                  accessibilityState={{ selected: isActive }}
                  testID={`ss-day-picker-${item.dayNumber}`}
                  style={({ pressed }) => [
                    styles.dayPickerItem,
                    {
                      backgroundColor: isActive
                        ? theme.accent
                        : theme.backgroundCard,
                      borderColor: isActive ? theme.accent : theme.border,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayPickerLabel,
                      { color: isActive ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {item.shortLabel}
                  </Text>
                  <View
                    style={[
                      styles.dayPickerStatus,
                      {
                        backgroundColor: isActive
                          ? "#FFFFFF"
                          : isComplete
                            ? theme.accent
                            : "transparent",
                        borderColor: isActive ? "#FFFFFF" : theme.border,
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

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
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: bottomPad + 40,
              width: "100%",
              maxWidth: useWideReading ? 1120 : 760,
              alignSelf: "center",
            },
          ]}
          showsVerticalScrollIndicator={false}
          testID="ss-day-reader"
          scrollEventThrottle={16}
          onLayout={(event) => {
            scrollViewport.current = event.nativeEvent.layout.height;
            noteReachedEnd(0, scrollViewport.current, scrollContentHeight.current);
          }}
          onContentSizeChange={(_width, height) => {
            scrollContentHeight.current = height;
            noteReachedEnd(0, scrollViewport.current, height);
          }}
          onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            scrollViewport.current = layoutMeasurement.height;
            noteReachedEnd(contentOffset.y, layoutMeasurement.height, contentSize.height);
          }}
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
              testID="ss-day-audio"
              style={({ pressed }) => [
                styles.audioRow,
                pressed && !isAudioLoading
                  ? { backgroundColor: quarterTheme.tint, opacity: 0.82 }
                  : null,
              ]}
            >
              {isAudioLoading ? (
                <ActivityIndicator size="small" color={quarterTheme.primary} />
              ) : (
                <Ionicons
                  name={isAudioPlaying ? "pause-circle-outline" : "play-circle-outline"}
                  size={32}
                  color={quarterTheme.primary}
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
            <LessonDayBody
              content={memoryTextExtraction.remainingContent}
              answers={answers}
              onAnswer={saveAnswer}
            />
          )}

          <View style={[styles.sourceAttribution, { borderTopColor: theme.border }]}>
            <Ionicons name="library-outline" size={13} color={theme.textMuted} />
            <Text style={[styles.sourceText, { color: theme.textMuted }]}>
              Official Sabbath School lesson content provided via Adventech.
            </Text>
          </View>

          {currentLessonId && (
            <Pressable
              onPress={() =>
                isAuthenticated
                  ? router.push(
                      buildStudyTutorRoute({
                        lessonId: currentLessonId,
                        dayId: day.id,
                        lessonNumber,
                        dayNumber,
                        quarterCode,
                      }) as any
                    )
                  : router.push("/(auth)/login")
              }
              disabled={isAuthLoading}
              style={({ pressed }) => [
                styles.tutorCta,
                {
                  backgroundColor: quarterTheme.tint,
                  borderColor: quarterTheme.border,
                  opacity: isAuthLoading ? 0.6 : pressed ? 0.84 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isAuthenticated
                  ? "Ask the Study Tutor about this daily lesson"
                  : "Sign in to ask the Study Tutor"
              }
              accessibilityState={{ disabled: isAuthLoading }}
              testID="ss-day-ask-tutor"
            >
              <View style={[styles.tutorIcon, { backgroundColor: quarterTheme.tint }]}>
                <Ionicons name="chatbubbles-outline" size={20} color={theme.accent} />
              </View>
              <View style={styles.tutorCopy}>
                <Text style={[styles.tutorTitle, { color: theme.text }]}>Ask the Study Tutor</Text>
                <Text style={[styles.tutorSubtitle, { color: theme.textSecondary }]}>
                  {isAuthenticated
                    ? "Explore today’s lesson with its official source in view."
                    : "Sign in to ask questions about today’s lesson."}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={theme.accent} />
            </Pressable>
          )}

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
              testID="ss-day-complete"
              accessibilityRole="button"
              accessibilityLabel={isCompleted ? "Completed" : "Mark day complete"}
              accessibilityState={{ disabled: !isCompleted && !reachedEnd }}
              onPress={() => {
                if (isCompleted) {
                  setShowCompletionState(true);
                  return;
                }
                if (!reachedEnd || completeMutation.isPending) return;
                completeMutation.mutate();
              }}
              disabled={completeMutation.isPending || (!isCompleted && !reachedEnd)}
              style={({ pressed }) => [
                styles.completeBtn,
                {
                  backgroundColor: isCompleted
                    ? "rgba(34, 197, 94, 0.15)"
                    : theme.accent,
                  opacity: !isCompleted && !reachedEnd ? 0.45 : pressed ? 0.85 : 1,
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
                {isCompleted ? "Completed" : "Mark day complete"}
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
                  onPress={() => goToDay(dayNumber + 1)}
                  style={({ pressed }) => [
                    styles.completionPrimaryBtn,
                    { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.completionPrimaryText}>
                    Continue to {dayNavigatorItems.find((item) => item.dayNumber === dayNumber + 1)?.label || `Day ${dayNumber + 1}`}
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
  dayPickerBar: {
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  dayPickerContent: {
    paddingLeft: 16,
    paddingRight: 32,
    gap: 8,
  },
  dayPickerItem: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 48,
    paddingVertical: 8,
    gap: 5,
  },
  dayPickerLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  dayPickerStatus: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 1,
  },
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
  tutorCta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  tutorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tutorCopy: { flex: 1, gap: 3 },
  tutorTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  tutorSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
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
