import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import Colors from "@/constants/colors";

interface Message {
  role: "user" | "assistant";
  content: string;
  phase: string;
  timestamp: string;
}

const PHASES = [
  { id: "observe", label: "Observe", icon: "eye-outline" as const },
  { id: "interpret", label: "Interpret", icon: "bulb-outline" as const },
  { id: "apply", label: "Apply", icon: "heart-outline" as const },
];

export default function StudyGuideScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;
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
  const [isStarting, setIsStarting] = useState(true);
  const [startError, setStartError] = useState(false);
  const [isResumed, setIsResumed] = useState(false);
  const initRef = useRef(false);

  const restoreSession = (data: { session: any; aiMessage?: string; resumed?: boolean }) => {
    setSessionId(data.session.id);
    setMessages(data.session.messages);
    setCurrentPhase(data.session.phase);
    setIsComplete(data.session.phase === "complete" || !!data.session.completedAt);
    setIsResumed(!!data.resumed);
    setIsStarting(false);
  };

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/study-guide/start", {
        verseReference: params.verseReference,
        verseText: params.verseText,
        bookName: params.bookName,
        chapter: parseInt(params.chapter || "1"),
        verse: parseInt(params.verse || "1"),
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
    },
  });

  useEffect(() => {
    if (initRef.current || !params.verseReference || !params.verseText) return;
    initRef.current = true;

    (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/study-guide/active?verseReference=${encodeURIComponent(params.verseReference)}&userId=guest`
        );
        const data = await res.json();
        if (data.found && data.session) {
          restoreSession({ session: data.session, resumed: true });
          return;
        }
      } catch {}
      startMutation.mutate();
    })();
  }, [params.verseReference, params.verseText]);

  const handleRetry = () => {
    setStartError(false);
    setIsStarting(true);
    startMutation.mutate();
  };

  const handleNewSession = () => {
    const oldSessionId = sessionId;
    setIsResumed(false);
    setIsStarting(true);
    setMessages([]);
    setSessionId(null);
    setCurrentPhase("observe");
    setIsComplete(false);

    (async () => {
      if (oldSessionId) {
        await apiRequest("POST", `/api/study-guide/complete/${oldSessionId}`, {}).catch(() => {});
      }

      const res = await apiRequest("POST", "/api/study-guide/start", {
        verseReference: params.verseReference,
        verseText: params.verseText,
        bookName: params.bookName,
        chapter: parseInt(params.chapter || "1"),
        verse: parseInt(params.verse || "1"),
        forceNew: true,
      });
      const data = await res.json();
      restoreSession(data);
    })().catch(() => {
      setIsStarting(false);
      setStartError(true);
    });
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

  const getPhaseIndex = () => {
    if (isComplete) return 3;
    const idx = PHASES.findIndex((p) => p.id === currentPhase);
    return idx >= 0 ? idx : 0;
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
            <Ionicons name="school-outline" size={16} color={theme.accent} />
          </View>
        )}
        <View style={styles.messageContent}>
          {isAI && (
            <Text style={[styles.messageRole, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              Study Guide
            </Text>
          )}
          <Text style={[styles.messageText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
            {item.content}
          </Text>
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
          const isDone = i < phaseIdx;
          const dotColor = isActive ? theme.accent : isDone ? "#2E7D32" : theme.textMuted + "40";
          return (
            <View key={phase.id} style={styles.phaseItem}>
              <View style={[styles.phaseDot, { backgroundColor: dotColor }]}>
                {isDone ? (
                  <Ionicons name="checkmark" size={10} color="#fff" />
                ) : (
                  <Ionicons name={phase.icon} size={10} color={isActive ? "#fff" : theme.textMuted} />
                )}
              </View>
              <Text
                style={[
                  styles.phaseLabel,
                  {
                    color: isActive ? theme.accent : isDone ? "#2E7D32" : theme.textMuted,
                    fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {phase.id === "apply" ? "Apply" : phase.label}
              </Text>
              {i < PHASES.length - 1 && (
                <View style={[styles.phaseLine, { backgroundColor: isDone ? "#2E7D32" : theme.textMuted + "30" }]} />
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
        {isStarting ? (
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
                <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
                <Text style={[styles.completeText, { color: "#2E7D32", fontFamily: "Inter_600SemiBold" }]}>
                  Study Complete
                </Text>
                <Pressable
                  onPress={() => router.back()}
                  style={[styles.doneBtn, { backgroundColor: theme.accent }]}
                  testID="study-done-btn"
                >
                  <Text style={[styles.doneBtnText, { fontFamily: "Inter_600SemiBold" }]}>Done</Text>
                </Pressable>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  completeText: { fontSize: 14 },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  doneBtnText: { color: "#fff", fontSize: 13 },
});
