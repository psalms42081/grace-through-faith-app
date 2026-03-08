import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useShareInsight, ShareInsightButton } from "@/components/ShareCard";

interface Message {
  role: "user" | "assistant";
  content: string;
  phase: string;
  timestamp: string;
}

interface StageProgress {
  completed: boolean;
  responses: string[];
  meaningfulCount: number;
  completedAt: string | null;
}

interface Progression {
  observe: StageProgress;
  interpret: StageProgress;
  apply: StageProgress;
}

type Persona = "scholarly" | "pastoral" | "ancient";

const PERSONAS: { id: Persona; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { id: "scholarly", label: "Scholarly", icon: "school-outline", desc: "Academic depth with Greek & Hebrew focus" },
  { id: "pastoral", label: "Pastoral", icon: "heart-circle-outline", desc: "Warm, life-focused spiritual guidance" },
  { id: "ancient", label: "Ancient", icon: "library-outline", desc: "Patristic wisdom from the early church" },
];

const PHASES = [
  { id: "observe", label: "Observe", icon: "eye-outline" as const },
  { id: "interpret", label: "Interpret", icon: "bulb-outline" as const },
  { id: "apply", label: "Apply", icon: "heart-outline" as const },
];

function AnimatedPhaseDot({
  isActive,
  isDone,
  icon,
  accentColor,
  mutedColor,
}: {
  isActive: boolean;
  isDone: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  mutedColor: string;
}) {
  const scaleAnim = useRef(new Animated.Value(isDone ? 1 : isActive ? 1 : 0.85)).current;
  const opacityAnim = useRef(new Animated.Value(isDone ? 0.7 : isActive ? 1 : 0.5)).current;
  const prevDone = useRef(isDone);
  const prevActive = useRef(isActive);

  useEffect(() => {
    if (isDone && !prevDone.current) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      Animated.timing(opacityAnim, { toValue: 0.7, duration: 200, useNativeDriver: true }).start();
    } else if (isActive && !prevActive.current) {
      Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
    prevDone.current = isDone;
    prevActive.current = isActive;
  }, [isDone, isActive]);

  const bgColor = isDone ? "#2E7D32" : isActive ? accentColor : mutedColor + "40";

  return (
    <Animated.View
      style={[
        styles.phaseDot,
        { backgroundColor: bgColor, transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}
    >
      {isDone ? (
        <Ionicons name="checkmark" size={12} color="#fff" />
      ) : (
        <Ionicons name={icon} size={10} color={isActive ? "#fff" : mutedColor} />
      )}
    </Animated.View>
  );
}

export default function StudyGuideScreen() {
  const { theme } = useTheme();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    verseReference: string;
    verseText: string;
    bookName: string;
    chapter: string;
    verse: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState("observe");
  const [isComplete, setIsComplete] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const [isResumed, setIsResumed] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona>("scholarly");
  const [showPersonaPicker, setShowPersonaPicker] = useState(true);
  const [checkingResume, setCheckingResume] = useState(true);
  const [progression, setProgression] = useState<Progression | null>(null);
  const [studySummary, setStudySummary] = useState<string | null>(null);
  const initRef = useRef(false);
  const { triggerShare, ShareCardRenderer, isSharing } = useShareInsight();

  const restoreSession = (data: { session: any; aiMessage?: string; resumed?: boolean }) => {
    setSessionId(data.session.id);
    setMessages(data.session.messages);
    setCurrentPhase(data.session.phase);
    setIsComplete(data.session.phase === "complete" || !!data.session.completedAt);
    setIsResumed(!!data.resumed);
    setSelectedPersona(data.session.persona || "scholarly");
    if (data.session.progression) setProgression(data.session.progression);
    if (data.session.summary) setStudySummary(data.session.summary);
    setShowPersonaPicker(false);
    setIsStarting(false);
    setCheckingResume(false);
  };

  const startMutation = useMutation({
    mutationFn: async (persona: Persona) => {
      const res = await apiRequest("POST", "/api/study-guide/start", {
        verseReference: params.verseReference,
        verseText: params.verseText,
        bookName: params.bookName,
        chapter: parseInt(params.chapter || "1"),
        verse: parseInt(params.verse || "1"),
        persona,
        forceNew: true,
      });
      return res.json();
    },
    onSuccess: (data) => {
      restoreSession(data);
    },
    onError: () => {
      setIsStarting(false);
      setStartError(true);
    },
  });

  const respondMutation = useMutation({
    mutationFn: async (userResponse: string) => {
      const res = await apiRequest("POST", "/api/study-guide/respond", {
        sessionId,
        userResponse,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages(data.messages);
      setCurrentPhase(data.phase);
      setIsComplete(data.isComplete);
      setIsResumed(false);
      if (data.progression) setProgression(data.progression);
      if (data.summary) setStudySummary(data.summary);
    },
  });

  useEffect(() => {
    if (initRef.current || !params.verseReference || !params.verseText) return;
    initRef.current = true;

    (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/study-guide/active?verseReference=${encodeURIComponent(params.verseReference)}&userId=${userId}`
        );
        const data = await res.json();
        if (data.found && data.session) {
          restoreSession({ session: data.session, resumed: true });
          return;
        }
      } catch {}
      setCheckingResume(false);
      setShowPersonaPicker(true);
    })();
  }, [params.verseReference, params.verseText]);

  const handleRetry = () => {
    setStartError(false);
    setIsStarting(true);
    startMutation.mutate(selectedPersona);
  };

  const handleStartWithPersona = (persona: Persona) => {
    setSelectedPersona(persona);
    setShowPersonaPicker(false);
    setIsStarting(true);
    startMutation.mutate(persona);
  };

  const handleNewSession = () => {
    const oldSessionId = sessionId;
    setIsResumed(false);
    setMessages([]);
    setSessionId(null);
    setCurrentPhase("observe");
    setIsComplete(false);
    setShowPersonaPicker(true);
    setIsStarting(false);
    setProgression(null);
    setStudySummary(null);

    if (oldSessionId) {
      apiRequest("POST", `/api/study-guide/complete/${oldSessionId}`, {}).catch(() => {});
    }
  };

  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const handleSend = () => {
    if (!input.trim() || respondMutation.isPending || !sessionId) return;
    const userMsg: Message = {
      role: "user",
      content: input.trim(),
      phase: currentPhase,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    respondMutation.mutate(input.trim());
    setInput("");
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const hasVerseParams = !!(params.verseReference && params.verseText);

  const { data: recentSessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: [`/api/study-guide/sessions?userId=${userId}`],
    enabled: !hasVerseParams,
  });

  if (!hasVerseParams) {
    const activeSessions = (recentSessions || []).filter((s: any) => !s.completedAt);
    const completedSessions = (recentSessions || []).filter((s: any) => !!s.completedAt);

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              Guided Study
            </Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.hubContent, { paddingBottom: bottomPadding + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.hubPromptCard, { backgroundColor: theme.backgroundCard }]}>
            <Ionicons name="book-outline" size={32} color={theme.accent} />
            <Text style={[styles.hubPromptTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              Start a New Study
            </Text>
            <Text style={[styles.hubPromptDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Open a passage in the Bible reader, select a verse, and choose "Guided Study" to begin an inductive study session.
            </Text>
            <Pressable
              style={[styles.hubOpenReaderBtn, { backgroundColor: theme.accent }]}
              onPress={() => router.push("/(tabs)/read" as any)}
            >
              <Ionicons name="book" size={16} color="#fff" />
              <Text style={[styles.hubOpenReaderText, { fontFamily: "Inter_600SemiBold" }]}>Open Bible Reader</Text>
            </Pressable>
          </View>

          {sessionsLoading && (
            <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 24 }} />
          )}

          {activeSessions.length > 0 && (
            <View style={styles.hubSection}>
              <Text style={[styles.hubSectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Active Sessions
              </Text>
              {activeSessions.map((s: any) => (
                <Pressable
                  key={s.id}
                  style={[styles.hubSessionCard, { backgroundColor: theme.backgroundCard, borderLeftColor: "#C9933A" }]}
                  onPress={() => router.push({
                    pathname: "/study-guide" as any,
                    params: { verseReference: s.verseReference, verseText: s.verseText, bookName: s.bookName, chapter: String(s.chapter), verse: String(s.verse) },
                  })}
                >
                  <View style={styles.hubSessionTop}>
                    <Text style={[styles.hubSessionRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      {s.verseReference}
                    </Text>
                    <View style={[styles.hubPhaseBadge, { backgroundColor: "#C9933A20" }]}>
                      <Text style={[styles.hubPhaseText, { color: "#C9933A", fontFamily: "Inter_600SemiBold" }]}>
                        Continue
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.hubSessionVerse, { color: theme.textSecondary, fontFamily: "Lora_400Regular" }]} numberOfLines={2}>
                    "{s.verseText}"
                  </Text>
                  <Text style={[styles.hubSessionPhaseLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Phase: {s.phase}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {completedSessions.length > 0 && (
            <View style={styles.hubSection}>
              <Text style={[styles.hubSectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Completed Studies
              </Text>
              {completedSessions.slice(0, 10).map((s: any) => (
                <Pressable
                  key={s.id}
                  style={[styles.hubSessionCard, { backgroundColor: theme.backgroundCard, borderLeftColor: "#2E7D32" }]}
                  onPress={() => router.push({
                    pathname: "/study-guide" as any,
                    params: { verseReference: s.verseReference, verseText: s.verseText, bookName: s.bookName, chapter: String(s.chapter), verse: String(s.verse) },
                  })}
                >
                  <View style={styles.hubSessionTop}>
                    <Text style={[styles.hubSessionRef, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                      {s.verseReference}
                    </Text>
                    <View style={styles.hubCompletedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
                      <Text style={[styles.hubCompletedText, { fontFamily: "Inter_600SemiBold" }]}>Completed</Text>
                    </View>
                  </View>
                  <Text style={[styles.hubSessionVerse, { color: theme.textSecondary, fontFamily: "Lora_400Regular" }]} numberOfLines={2}>
                    "{s.verseText}"
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {!sessionsLoading && activeSessions.length === 0 && completedSessions.length === 0 && (
            <View style={styles.hubEmptyState}>
              <Ionicons name="chatbubbles-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.hubEmptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                No study sessions yet. Open a passage to begin your first inductive Bible study.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  const getPhaseIndex = () => {
    if (isComplete) return 3;
    if (progression) {
      const stageKey = currentPhase as keyof Progression;
      const idx = PHASES.findIndex((p) => p.id === currentPhase);
      return idx >= 0 ? idx : 0;
    }
    const idx = PHASES.findIndex((p) => p.id === currentPhase);
    return idx >= 0 ? idx : 0;
  };

  const isStageComplete = (stageId: string): boolean => {
    if (!progression) return false;
    const stage = progression[stageId as keyof Progression];
    return stage?.completed || false;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isAI = item.role === "assistant";
    return (
      <View
        style={[
          styles.messageBubble,
          isAI
            ? [styles.aiBubble, { backgroundColor: theme.backgroundCard }]
            : [styles.userBubble, { backgroundColor: theme.accent + "20" }],
        ]}
      >
        {isAI && (
          <View style={styles.aiAvatar}>
            <Ionicons name={PERSONAS.find((p) => p.id === selectedPersona)?.icon || "school-outline"} size={16} color={theme.accent} />
          </View>
        )}
        <View style={styles.messageContent}>
          {isAI && (
            <Text style={[styles.messageRole, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {PERSONAS.find((p) => p.id === selectedPersona)?.label || "Scholarly"} Tutor
            </Text>
          )}
          {isAI ? (
            item.content.split(/\n\n+/).filter(Boolean).map((para, idx) => (
              <Text
                key={idx}
                style={[
                  styles.messageText,
                  { color: theme.text, fontFamily: "Inter_400Regular", marginTop: idx > 0 ? 10 : 0 },
                ]}
              >
                {para.trim()}
              </Text>
            ))
          ) : (
            <Text style={[styles.messageText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
              {item.content}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="study-guide-back">
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
            Inductive Study
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
            {params.verseReference}
          </Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <View style={[styles.phaseBar, { backgroundColor: theme.backgroundCard }]}>
        {PHASES.map((phase, i) => {
          const phaseIdx = getPhaseIndex();
          const isActive = i === phaseIdx;
          const isDone = isStageComplete(phase.id) || i < phaseIdx;
          return (
            <View key={phase.id} style={styles.phaseItem}>
              <AnimatedPhaseDot
                isActive={isActive}
                isDone={isDone}
                icon={phase.icon}
                accentColor={theme.accent}
                mutedColor={theme.textMuted}
              />
              <Text
                style={[
                  styles.phaseLabel,
                  {
                    color: isActive ? theme.accent : isDone ? "#2E7D32" : theme.textMuted + "80",
                    fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                    opacity: isDone ? 0.7 : isActive ? 1 : 0.5,
                  },
                ]}
              >
                {phase.label}
              </Text>
              {i < PHASES.length - 1 && (
                <View style={[styles.phaseLine, { backgroundColor: isDone ? "#2E7D32" : theme.textMuted + "20" }]} />
              )}
            </View>
          );
        })}
      </View>

      <View style={[styles.verseCard, { backgroundColor: theme.backgroundCard }]}>
        <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]} numberOfLines={3}>
          "{params.verseText}"
        </Text>
        <Text style={[styles.verseRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
          {params.verseReference}
        </Text>
      </View>

      {isResumed && !isComplete && (
        <View style={[styles.resumedBanner, { backgroundColor: theme.accent + "15" }]}>
          <View style={styles.resumedBannerLeft}>
            <Ionicons name="chatbubbles-outline" size={16} color={theme.accent} />
            <Text style={[styles.resumedText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
              Session resumed
            </Text>
          </View>
          <Pressable onPress={handleNewSession} hitSlop={8} testID="start-fresh-btn">
            <Text style={[styles.startFreshText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              Start Fresh
            </Text>
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {checkingResume ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Checking for active session...
            </Text>
          </View>
        ) : showPersonaPicker ? (
          <View style={styles.personaContainer}>
            <Text style={[styles.personaTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              Choose Your Tutor
            </Text>
            <Text style={[styles.personaSubtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Each tutor brings a unique perspective to your study
            </Text>
            <View style={styles.personaList}>
              {PERSONAS.map((p) => {
                const isSelected = selectedPersona === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelectedPersona(p.id)}
                    style={[
                      styles.personaCard,
                      {
                        backgroundColor: theme.backgroundCard,
                        borderColor: isSelected ? theme.accent : "transparent",
                        borderWidth: 2,
                      },
                    ]}
                    testID={`persona-${p.id}`}
                  >
                    <View style={[styles.personaIconWrap, { backgroundColor: isSelected ? theme.accent + "20" : theme.textMuted + "10" }]}>
                      <Ionicons name={p.icon} size={24} color={isSelected ? theme.accent : theme.textMuted} />
                    </View>
                    <View style={styles.personaInfo}>
                      <Text style={[styles.personaLabel, { color: isSelected ? theme.accent : theme.text, fontFamily: "Inter_600SemiBold" }]}>
                        {p.label}
                      </Text>
                      <Text style={[styles.personaDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {p.desc}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => handleStartWithPersona(selectedPersona)}
              style={[styles.beginBtn, { backgroundColor: theme.accent }]}
              testID="begin-study-btn"
            >
              <Text style={[styles.beginBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                Begin Study
              </Text>
            </Pressable>
          </View>
        ) : isStarting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Preparing your study session...
            </Text>
          </View>
        ) : startError ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="cloud-offline-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Could not start study session
            </Text>
            <Pressable
              onPress={handleRetry}
              style={[styles.retryBtn, { backgroundColor: theme.accent }]}
              testID="study-retry-btn"
            >
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={[styles.retryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <FlatList
              inverted
              data={invertedMessages}
              renderItem={renderMessage}
              keyExtractor={(_, i) => i.toString()}
              extraData={selectedPersona}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                respondMutation.isPending ? (
                  <View style={[styles.typingIndicator, { backgroundColor: theme.backgroundCard }]}>
                    <ActivityIndicator size="small" color={theme.accent} />
                    <Text style={[styles.typingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      Thinking...
                    </Text>
                  </View>
                ) : null
              }
              testID="messages-list"
            />

            {isComplete ? (
              <View style={[styles.completeBar, { backgroundColor: "#2E7D32" + "20", paddingBottom: bottomPadding + 10 }]}>
                <View style={styles.completeTopRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
                  <Text style={[styles.completeText, { color: "#2E7D32", fontFamily: "Inter_600SemiBold" }]}>
                    Study Complete
                  </Text>
                </View>
                {studySummary ? (
                  <Text style={[styles.summaryText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                    {studySummary}
                  </Text>
                ) : null}
                <View style={styles.completeActions}>
                  <ShareInsightButton
                    onPress={() => {
                      const lastAi = [...messages].reverse().find((m) => m.role === "assistant");
                      triggerShare({
                        verseReference: params.verseReference || "",
                        verseText: params.verseText || "",
                        insightLabel: "Socratic Study Insight",
                        insightText: lastAi
                          ? lastAi.content.length > 180
                            ? lastAi.content.slice(0, 177) + "..."
                            : lastAi.content
                          : undefined,
                      });
                    }}
                    isSharing={isSharing}
                    theme={theme}
                  />
                  <Pressable
                    onPress={() => router.back()}
                    style={[styles.doneBtn, { backgroundColor: theme.accent }]}
                    testID="study-done-btn"
                  >
                    <Text style={[styles.doneBtnText, { fontFamily: "Inter_600SemiBold" }]}>Done</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={[styles.inputBar, { backgroundColor: theme.backgroundCard, paddingBottom: bottomPadding + 10 }]}>
                <TextInput
                  style={[styles.textInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
                  placeholder="Share your thoughts..."
                  placeholderTextColor={theme.textMuted}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  maxLength={1000}
                  testID="study-input"
                />
                <Pressable
                  onPress={handleSend}
                  disabled={!input.trim() || respondMutation.isPending}
                  style={[
                    styles.sendBtn,
                    { backgroundColor: input.trim() ? theme.accent : theme.textMuted + "30" },
                  ]}
                  testID="study-send-btn"
                  accessibilityRole="button"
                  accessibilityLabel="Send"
                >
                  <Ionicons name="arrow-up" size={18} color={input.trim() ? "#fff" : theme.textMuted} />
                </Pressable>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
      {ShareCardRenderer}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: { width: 34, height: 34, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18 },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  phaseBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    borderRadius: 12,
    gap: 4,
  },
  phaseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  phaseDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  phaseLabel: { fontSize: 11 },
  phaseLine: { width: 24, height: 2, borderRadius: 1, marginHorizontal: 4 },
  verseCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
  },
  verseText: { fontSize: 14, lineHeight: 22, fontStyle: "italic" },
  verseRef: { fontSize: 12, marginTop: 6 },
  resumedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resumedBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resumedText: { fontSize: 13 },
  startFreshText: { fontSize: 13, textDecorationLine: "underline" as const },
  chatArea: { flex: 1 },
  messagesList: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    flexDirection: "row",
    maxWidth: "85%",
    borderRadius: 14,
    padding: 12,
  },
  aiBubble: {
    alignSelf: "flex-start",
    gap: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  messageContent: { flex: 1 },
  messageRole: { fontSize: 11, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  messageText: { fontSize: 14, lineHeight: 22 },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
  },
  typingText: { fontSize: 13 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  personaContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  personaTitle: { fontSize: 22, textAlign: "center" as const },
  personaSubtitle: { fontSize: 13, textAlign: "center" as const, marginBottom: 16 },
  personaList: { gap: 10 },
  personaCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  personaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  personaInfo: { flex: 1 },
  personaLabel: { fontSize: 15 },
  personaDesc: { fontSize: 12, marginTop: 2 },
  beginBtn: {
    alignItems: "center" as const,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 20,
  },
  beginBtnText: { color: "#fff", fontSize: 15 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  retryBtnText: { color: "#fff", fontSize: 14 },
  completeBar: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  completeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  completeText: { fontSize: 14 },
  summaryText: { fontSize: 13, lineHeight: 20, textAlign: "center" as const, paddingHorizontal: 8 },
  completeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  doneBtnText: { color: "#fff", fontSize: 13 },
  hubContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  hubPromptCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center" as const,
    gap: 10,
  },
  hubPromptTitle: {
    fontSize: 20,
    marginTop: 4,
  },
  hubPromptDesc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center" as const,
  },
  hubOpenReaderBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  hubOpenReaderText: {
    color: "#fff",
    fontSize: 14,
  },
  hubSection: {
    marginTop: 28,
    gap: 10,
  },
  hubSectionTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  hubSessionCard: {
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    gap: 6,
  },
  hubSessionTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  hubSessionRef: {
    fontSize: 14,
  },
  hubPhaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  hubPhaseText: {
    fontSize: 11,
    textTransform: "capitalize" as const,
  },
  hubSessionVerse: {
    fontSize: 13,
    lineHeight: 19,
  },
  hubSessionPhaseLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  hubCompletedBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  hubCompletedText: {
    fontSize: 11,
    color: "#2E7D32",
  },
  hubEmptyState: {
    alignItems: "center" as const,
    marginTop: 40,
    gap: 12,
    paddingHorizontal: 20,
  },
  hubEmptyText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center" as const,
  },
});
