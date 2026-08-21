import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { safeGoBack } from "@/lib/safe-back";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { SWEEP_LIGHT } from "@/constants/light-sweep";
import { useProStatus } from "@/contexts/ProContext";
import { useAuth } from "@/contexts/AuthContext";
import { useShareInsight, ShareInsightButton } from "@/components/ShareCard";
import { useTranslation } from "@/context/TranslationContext";

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

type Persona = "pastoral" | "ellen-white";

const PERSONAS: { id: Persona; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { id: "pastoral", label: "Pastoral", icon: "heart-circle-outline", desc: "Warm, life-focused spiritual guidance" },
  { id: "ellen-white", label: "Ellen White", icon: "book-outline", desc: "Spirit of Prophecy insights from her writings" },
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
  }, [isDone, isActive, scaleAnim, opacityAnim]);

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
  useTheme(); // Path B light sweep: screen is pinned light
  const theme = SWEEP_LIGHT;
  const { userId } = useAuth();
  const { triggerMissionInvite } = useProStatus();
  const insets = useSafeAreaInsets();
  const { translation } = useTranslation();
  const params = useLocalSearchParams<{
    verseReference: string;
    verseText?: string;
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
  const [selectedPersona, setSelectedPersona] = useState<Persona>("pastoral");
  const [showPersonaPicker, setShowPersonaPicker] = useState(true);
  const [checkingResume, setCheckingResume] = useState(true);
  const [progression, setProgression] = useState<Progression | null>(null);
  const [studySummary, setStudySummary] = useState<string | null>(null);
  const studyContractKey = `${params.verseReference || ""}::${userId}::${translation}`;
  const activeStudyContractRef = useRef(studyContractKey);
  activeStudyContractRef.current = studyContractKey;
  const { triggerShare, ShareCardRenderer, isSharing } = useShareInsight();

  const restoreSession = useCallback((data: { session: any; aiMessage?: string; resumed?: boolean }) => {
    setSessionId(data.session.id);
    setMessages(data.session.messages);
    setCurrentPhase(data.session.phase);
    setIsComplete(data.session.phase === "complete" || !!data.session.completedAt);
    setIsResumed(!!data.resumed);
    setSelectedPersona(data.session.persona === "ellen-white" ? "ellen-white" : "pastoral");
    if (data.session.progression) setProgression(data.session.progression);
    if (data.session.summary) setStudySummary(data.session.summary);
    setShowPersonaPicker(false);
    setIsStarting(false);
    setCheckingResume(false);
  }, []);

  const startMutation = useMutation({
    mutationFn: async (persona: Persona) => {
      // Send verseReference + translation only. Server resolves canonical text
      // via resolveReference; client verseText is ignored server-side.
      const res = await apiRequest("POST", "/api/study-guide/start", {
        verseReference: params.verseReference,
        persona,
        forceNew: true,
        translation,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Study guide start failed (${res.status})`);
      }
      return {
        data: await res.json(),
        contractKey: studyContractKey,
      };
    },
    onSuccess: ({ data, contractKey }) => {
      if (contractKey !== activeStudyContractRef.current) return;
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
      return {
        data: await res.json(),
        contractKey: studyContractKey,
      };
    },
    onSuccess: ({ data, contractKey }) => {
      if (contractKey !== activeStudyContractRef.current) return;
      setMessages(data.messages);
      setCurrentPhase(data.phase);
      setIsComplete(data.isComplete);
      setIsResumed(false);
      if (data.progression) setProgression(data.progression);
      if (data.summary) setStudySummary(data.summary);
      if (data.isComplete) {
        triggerMissionInvite();
      }
    },
  });

  useEffect(() => {
    // Gate on verseReference only — server resolves the text; client verseText
    // is no longer used as authority for session resume or AI input.
    if (!params.verseReference) return;
    const contractKey = studyContractKey;
    let cancelled = false;

    // A mounted translation/reference change must never keep rendering or
    // responding through the previous translation's generated study session.
    setSessionId(null);
    setMessages([]);
    setCurrentPhase("observe");
    setIsComplete(false);
    setIsStarting(false);
    setStartError(false);
    setIsResumed(false);
    setProgression(null);
    setStudySummary(null);
    setShowPersonaPicker(false);
    setCheckingResume(true);

    (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/study-guide/active?verseReference=${encodeURIComponent(params.verseReference)}&userId=${userId}&translation=${encodeURIComponent(translation)}`
        );
        const data = await res.json();
        if (cancelled || contractKey !== activeStudyContractRef.current) return;
        if (data.found && data.session) {
          restoreSession({ session: data.session, resumed: true });
          return;
        }
      } catch {}
      if (cancelled || contractKey !== activeStudyContractRef.current) return;
      setCheckingResume(false);
      setShowPersonaPicker(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [studyContractKey, params.verseReference, userId, translation, restoreSession]);

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

  // Only verseReference is required — server resolves text server-side.
  const hasVerseParams = !!params.verseReference;
  const canonicalRef = useMemo(() => {
    const fromParams = {
      bookName: params.bookName?.trim(),
      chapter: Number(params.chapter),
      verse: Number(params.verse),
    };
    if (
      fromParams.bookName &&
      Number.isInteger(fromParams.chapter) &&
      fromParams.chapter > 0 &&
      Number.isInteger(fromParams.verse) &&
      fromParams.verse > 0
    ) {
      return fromParams;
    }

    const match = String(params.verseReference || "").match(
      /^(.*?)\s+(\d+):(\d+)(?:-\d+)?$/,
    );
    if (!match) return null;
    return {
      bookName: match[1].trim(),
      chapter: Number(match[2]),
      verse: Number(match[3]),
    };
  }, [
    params.bookName,
    params.chapter,
    params.verse,
    params.verseReference,
  ]);

  const {
    data: canonicalVerse,
    isLoading: canonicalVerseLoading,
    isError: canonicalVerseError,
  } = useQuery<{
    id: string;
    text: string;
    translation: string;
    translationName?: string;
  }>({
    queryKey: [
      "/api/verse",
      canonicalRef?.bookName,
      canonicalRef?.chapter,
      canonicalRef?.verse,
      translation,
    ],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/verse?book=${encodeURIComponent(canonicalRef!.bookName!)}&chapter=${canonicalRef!.chapter}&verse=${canonicalRef!.verse}&translation=${encodeURIComponent(translation)}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Verse fetch failed (${res.status})`);
      }
      return res.json();
    },
    enabled: hasVerseParams && !!canonicalRef,
    retry: false,
  });

  const { data: recentSessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: [`/api/study-guide/sessions?userId=${userId}`],
    enabled: !hasVerseParams,
  });

  const { data: allBooks } = useQuery<{ id: number; name: string; abbreviation: string; testament: string; chapterCount: number }[]>({
    queryKey: ["/api/books"],
    enabled: !hasVerseParams,
  });

  const [pickerStep, setPickerStep] = useState<"book" | "chapter">("book");
  const [pickerBook, setPickerBook] = useState<{ id: number; name: string; chapterCount: number } | null>(null);
  const [launchingPassage, setLaunchingPassage] = useState(false);

  const handlePickChapter = async (chapterNum: number) => {
    if (!pickerBook || launchingPassage) return;
    setLaunchingPassage(true);
    try {
      const verseReference = `${pickerBook.name} ${chapterNum}:1`;
      router.replace({
        pathname: "/study-guide" as any,
        params: {
          verseReference,
          bookName: pickerBook.name,
          chapter: String(chapterNum),
          verse: "1",
          translation,
        },
      });
    } catch {
      setLaunchingPassage(false);
    }
  };

  if (!hasVerseParams) {
    const activeSessions = (recentSessions || []).filter((s: any) => !s.completedAt);
    const completedSessions = (recentSessions || []).filter((s: any) => !!s.completedAt);

    const otBooks = allBooks?.filter((b) => b.testament === "OT") ?? [];
    const ntBooks = allBooks?.filter((b) => b.testament === "NT") ?? [];

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
          <Pressable onPress={() => {
            if (pickerStep === "chapter") { setPickerStep("book"); setPickerBook(null); }
            else safeGoBack(router, "/(tabs)/explore");
          }} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              Guided Study
            </Text>
            {pickerStep === "chapter" && pickerBook && (
              <Text style={[styles.headerSubtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {pickerBook.name}
              </Text>
            )}
          </View>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.hubContent, { paddingBottom: bottomPadding + 40 }]} showsVerticalScrollIndicator={false}>
          {pickerStep === "chapter" && pickerBook ? (
            <View>
              <Text style={[styles.hubPromptTitle, { color: theme.text, fontFamily: "Lora_600SemiBold", textAlign: "center", marginBottom: 4 }]}>
                Choose a Chapter
              </Text>
              <Text style={[styles.hubPromptDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 8 }]}>
                Walk through this passage step by step
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 12, backgroundColor: theme.accent + "10", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: "center" }}>
                <Ionicons name="sparkles" size={11} color={theme.accent} />
                <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: "Inter_400Regular" }}>AI-assisted study aid -- always verify with Scripture</Text>
              </View>
              {launchingPassage ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.accent} />
                  <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Preparing your guided study...
                  </Text>
                </View>
              ) : (
                <View style={styles.chapterGrid}>
                  {Array.from({ length: pickerBook.chapterCount }, (_, i) => i + 1).map((ch) => (
                    <Pressable
                      key={ch}
                      onPress={() => handlePickChapter(ch)}
                      style={({ pressed }) => [
                        styles.chapterCell,
                        { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{ch}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
              <View style={[styles.hubPromptCard, { backgroundColor: theme.backgroundCard }]}>
                <Ionicons name="chatbubbles-outline" size={32} color={theme.accent} />
                <Text style={[styles.hubPromptTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  Start a Guided Study
                </Text>
                <Text style={[styles.hubPromptDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Choose a passage and walk through observation, meaning, and response.
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, backgroundColor: theme.accent + "10", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" }}>
                  <Ionicons name="sparkles" size={11} color={theme.accent} />
                  <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: "Inter_400Regular" }}>AI-assisted study aid</Text>
                </View>
              </View>

              <View style={styles.hubSection}>
                <Text style={[styles.hubSectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  New Testament
                </Text>
                <View style={styles.bookGrid}>
                  {ntBooks.map((b) => (
                    <Pressable
                      key={b.id}
                      onPress={() => { setPickerBook(b); setPickerStep("chapter"); }}
                      style={({ pressed }) => [
                        styles.bookChip,
                        { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text style={[styles.bookChipText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                        {b.abbreviation}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.hubSection}>
                <Text style={[styles.hubSectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  Old Testament
                </Text>
                <View style={styles.bookGrid}>
                  {otBooks.map((b) => (
                    <Pressable
                      key={b.id}
                      onPress={() => { setPickerBook(b); setPickerStep("chapter"); }}
                      style={({ pressed }) => [
                        styles.bookChip,
                        { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text style={[styles.bookChipText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                        {b.abbreviation}
                      </Text>
                    </Pressable>
                  ))}
                </View>
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
                      style={[styles.hubSessionCard, { backgroundColor: theme.backgroundCard, borderLeftColor: "#E8604C" }]}
                      onPress={() => router.replace({
                        pathname: "/study-guide" as any,
                        params: { verseReference: s.verseReference, bookName: s.bookName, chapter: String(s.chapter), verse: String(s.verse) },
                      })}
                    >
                      <View style={styles.hubSessionTop}>
                        <Text style={[styles.hubSessionRef, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
                          {s.verseReference}
                        </Text>
                        <View style={[styles.hubPhaseBadge, { backgroundColor: "rgba(232,96,76,0.14)" }]}>
                          <Text style={[styles.hubPhaseText, { color: "#C24431", fontFamily: "Inter_600SemiBold" }]}>
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
                      onPress={() => router.replace({
                        pathname: "/study-guide" as any,
                        params: { verseReference: s.verseReference, bookName: s.bookName, chapter: String(s.chapter), verse: String(s.verse) },
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
            </>
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
            <Text style={[styles.messageRole, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
              {PERSONAS.find((p) => p.id === selectedPersona)?.label || "Pastoral"} Tutor
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
        <Pressable onPress={() => safeGoBack(router, "/(tabs)/explore")} style={styles.backBtn} testID="study-guide-back">
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
            Guided Study
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
                    color: isActive ? theme.accentDark : isDone ? "#2E7D32" : theme.textMuted + "80",
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
          {canonicalVerseLoading
            ? "Loading Scripture…"
            : canonicalVerseError || !canonicalVerse?.text
              ? `Scripture is unavailable in ${translation}.`
              : `"${canonicalVerse.text}"`}
        </Text>
        <Text style={[styles.verseRef, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
          {params.verseReference}
          {canonicalVerse?.translation
            ? ` · ${canonicalVerse.translation}`
            : ` · ${translation}`}
        </Text>
      </View>

      {isResumed && !isComplete && (
        <View style={[styles.resumedBanner, { backgroundColor: theme.accent + "15" }]}>
          <View style={styles.resumedBannerLeft}>
            <Ionicons name="chatbubbles-outline" size={16} color={theme.accent} />
            <Text style={[styles.resumedText, { color: theme.accentDark, fontFamily: "Inter_500Medium" }]}>
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
              Tap to select, then begin
            </Text>
            <View style={styles.personaList}>
              {PERSONAS.map((p) => {
                const isSelected = selectedPersona === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      if (isSelected) {
                        handleStartWithPersona(p.id);
                      } else {
                        setSelectedPersona(p.id);
                      }
                    }}
                    style={[
                      styles.personaCard,
                      {
                        backgroundColor: isSelected ? theme.accent + "12" : theme.backgroundCard,
                        borderColor: isSelected ? theme.accent : theme.backgroundCard,
                        borderWidth: 1.5,
                      },
                    ]}
                    testID={`persona-${p.id}`}
                  >
                    <View style={[styles.personaIconWrap, { backgroundColor: isSelected ? theme.accent + "20" : theme.textMuted + "10" }]}>
                      <Ionicons name={p.icon} size={22} color={isSelected ? theme.accent : theme.textMuted} />
                    </View>
                    <View style={styles.personaInfo}>
                      <Text style={[styles.personaLabel, { color: isSelected ? theme.accentDark : theme.text, fontFamily: "Inter_600SemiBold" }]}>
                        {p.label}
                      </Text>
                      <Text style={[styles.personaDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {p.desc}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.personaStartHint}>
                        <Ionicons name="arrow-forward-circle" size={22} color={theme.accent} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => handleStartWithPersona(selectedPersona)}
              style={[styles.beginBtn, { backgroundColor: theme.accentDark }]}
              testID="begin-study-btn"
            >
              <Ionicons name="chatbubbles-outline" size={16} color="#fff" />
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
              style={[styles.retryBtn, { backgroundColor: theme.accentDark }]}
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
              <View style={[styles.completeBar, { backgroundColor: theme.backgroundCard, paddingBottom: bottomPadding + 10 }]}>
                <View style={styles.completeGlow}>
                  <Ionicons name="sparkles" size={28} color={theme.accent} />
                </View>
                <Text style={[styles.completeTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  Study Complete
                </Text>
                <Text style={[styles.completeVerse, { color: theme.accentDark, fontFamily: "Inter_500Medium" }]}>
                  {params.verseReference}
                </Text>
                {studySummary ? (
                  <Text style={[styles.summaryText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {studySummary}
                  </Text>
                ) : null}
                <View style={styles.completeActions}>
                  <ShareInsightButton
                    onPress={() => {
                      const lastAi = [...messages].reverse().find((m) => m.role === "assistant");
                      triggerShare({
                        verseReference: params.verseReference || "",
                        verseText: canonicalVerse?.text || "",
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
                    onPress={() => safeGoBack(router, "/(tabs)/explore")}
                    style={[styles.doneBtn, { backgroundColor: theme.accentDark }]}
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
                    { backgroundColor: input.trim() ? theme.accentDark : theme.textMuted + "30" },
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
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 19, letterSpacing: -0.1 },
  headerSubtitle: { fontSize: 12, marginTop: 3, opacity: 0.8 },
  phaseBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginHorizontal: 18,
    borderRadius: 14,
    gap: 4,
  },
  phaseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  phaseDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  phaseLabel: { fontSize: 11, letterSpacing: 0.2 },
  phaseLine: { width: 24, height: 2, borderRadius: 1, marginHorizontal: 5 },
  verseCard: {
    marginHorizontal: 18,
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
  },
  verseText: { fontSize: 14, lineHeight: 23, fontStyle: "italic" },
  verseRef: { fontSize: 12, marginTop: 8 },
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
    paddingHorizontal: 28,
    gap: 10,
  },
  personaTitle: { fontSize: 22, textAlign: "center" as const, letterSpacing: -0.2 },
  personaSubtitle: { fontSize: 13, textAlign: "center" as const, marginBottom: 16, lineHeight: 19, opacity: 0.7 },
  personaList: { gap: 10 },
  personaCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  personaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  personaInfo: { flex: 1 },
  personaLabel: { fontSize: 15, letterSpacing: 0.1 },
  personaDesc: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  personaStartHint: {
    marginLeft: 4,
  },
  beginBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 18,
  },
  beginBtnText: { color: "#fff", fontSize: 14, letterSpacing: 0.2 },
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
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  completeGlow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(232,96,76,0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 4,
  },
  completeTitle: { fontSize: 20, letterSpacing: -0.2 },
  completeVerse: { fontSize: 13, marginBottom: 4 },
  summaryText: { fontSize: 13, lineHeight: 20, textAlign: "center" as const, paddingHorizontal: 12, opacity: 0.85 },
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
    borderRadius: 20,
    padding: 28,
    alignItems: "center" as const,
    gap: 12,
  },
  hubPromptTitle: {
    fontSize: 22,
    marginTop: 6,
    letterSpacing: -0.1,
  },
  hubPromptDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center" as const,
    opacity: 0.85,
  },
  hubOpenReaderBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 12,
  },
  hubOpenReaderText: {
    color: "#fff",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  hubSection: {
    marginTop: 32,
    gap: 12,
  },
  hubSectionTitle: {
    fontSize: 15,
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  hubSessionCard: {
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    gap: 7,
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
  bookGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
  },
  bookChip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    minWidth: 54,
    alignItems: "center" as const,
  },
  bookChipText: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  chapterGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
    justifyContent: "center" as const,
  },
  chapterCell: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  chapterNum: {
    fontSize: 16,
  },
});
