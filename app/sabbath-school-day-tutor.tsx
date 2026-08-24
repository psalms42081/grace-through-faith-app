import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { safeGoBack } from "@/lib/safe-back";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildSabbathSchoolDayRoute,
  canAskStudyTutor,
  isFreshTutorContextVerified,
} from "@/lib/sabbath-school-tutor";
import {
  sabbathSchoolTabBarClearance,
  useSabbathSchoolTabContainment,
} from "@/lib/sabbath-school-route-containment";

type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

type TutorContext = {
  quarterlyTitle: string;
  lessonTitle: string;
  lessonNumber: number;
  dayTitle: string | null;
  dayNumber: number;
};

type TutorResponse = {
  answer: string;
  context: TutorContext;
};

const theme = {
  background: "#FBF7EE",
  backgroundCard: "#FFFFFF",
  text: "#1F1A12",
  textSecondary: "#3F3A31",
  textMuted: "#6B6660",
  border: "#E7E0D2",
  accent: "#1F7A70",
};

export default function SabbathSchoolDayTutorScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: isAuthLoading, userId } = useAuth();
  const params = useLocalSearchParams<{
    lessonId?: string;
    dayId?: string;
    lessonNumber?: string;
    dayNumber?: string;
    quarterCode?: string;
  }>();
  const lessonId = typeof params.lessonId === "string" ? params.lessonId : "";
  const dayId = typeof params.dayId === "string" ? params.dayId : "";
  const isTabContained = useSabbathSchoolTabContainment(
    "sabbath-school-day-tutor",
    {
      lessonId,
      dayId,
      lessonNumber: params.lessonNumber,
      dayNumber: params.dayNumber,
      quarterCode: params.quarterCode,
    },
    !!lessonId && !!dayId,
  );
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState<TutorContext | null>(null);

  const {
    data: loadedContext,
    isLoading: isContextLoading,
    isError: isContextError,
    isFetching: isContextFetching,
    isFetchedAfterMount,
    refetch: refetchContext,
  } = useQuery<TutorContext>({
    queryKey: ["/api/sabbath-school/day-tutor/context", userId, lessonId, dayId],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/sabbath-school/day-tutor/context?lessonId=${encodeURIComponent(lessonId)}&dayId=${encodeURIComponent(dayId)}`
      );
      return response.json();
    },
    enabled: isAuthenticated && !!lessonId && !!dayId,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const requestMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest("POST", "/api/sabbath-school/day-tutor", {
        lessonId,
        dayId,
        question,
        conversationHistory: messages.slice(-8),
      });
      return (await response.json()) as TutorResponse;
    },
    onSuccess: (result, question) => {
      setContext(result.context);
      setMessages((current) => [
        ...current,
        { role: "user", content: question },
        { role: "assistant", content: result.answer },
      ]);
    },
  });

  const verificationState = {
    hasLoadedContext: !!loadedContext,
    isFetchedAfterMount,
    isFetching: isContextFetching,
    isError: isContextError,
  };
  const isContextVerified = isFreshTutorContextVerified(verificationState);
  const activeContext = context || (isContextVerified ? loadedContext : null);
  const canAsk = canAskStudyTutor({
    ...verificationState,
    isAuthenticated,
    lessonId,
    dayId,
    isRequestPending: requestMutation.isPending,
  });
  const readerFallback =
    buildSabbathSchoolDayRoute({
      lessonNumber: params.lessonNumber,
      dayNumber: params.dayNumber,
      quarterCode: params.quarterCode,
    }) || "/(tabs)/explore";

  const contextLabel = useMemo(() => {
    if (!activeContext) return "Today’s official Sabbath School lesson";
    return `Lesson ${activeContext.lessonNumber} · Day ${activeContext.dayNumber}${activeContext.dayTitle ? ` · ${activeContext.dayTitle}` : ""}`;
  }, [activeContext]);

  const sendQuestion = () => {
    const question = input.trim();
    if (!question || !canAsk) return;
    setInput("");
    requestMutation.mutate(question);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad =
    (Platform.OS === "web" ? 34 : insets.bottom) +
    sabbathSchoolTabBarClearance(isTabContained, Platform.OS);
  const requestError = requestMutation.error instanceof Error
    ? requestMutation.error.message
    : "The Study Tutor could not answer right now. Please try again.";

  if (!isTabContained) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable
          onPress={() => safeGoBack(router, readerFallback)}
          hitSlop={12}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to daily lesson"
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Study Tutor</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{contextLabel}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <View style={styles.contextCard}>
        <View style={styles.contextIcon}>
          <Ionicons name="book-outline" size={18} color={theme.accent} />
        </View>
        <View style={styles.contextCopy}>
          <Text style={styles.contextTitle}>
            {activeContext?.quarterlyTitle ||
              (!isAuthenticated && !isAuthLoading
                ? "Member Study Tutor"
                : "Today’s lesson is in context")}
          </Text>
          {isAuthLoading ? (
            <Text style={styles.contextText}>Checking your membership…</Text>
          ) : !isAuthenticated ? (
            <Text style={styles.contextText}>
              Sign in to load the official lesson source and ask questions.
            </Text>
          ) : isContextLoading || isContextFetching || !isFetchedAfterMount ? (
            <Text style={styles.contextText}>Verifying the official lesson source…</Text>
          ) : isContextError ? (
            <View style={styles.contextErrorRow}>
              <Text style={styles.contextErrorText}>The lesson source could not be verified.</Text>
              <Pressable
                onPress={() => refetchContext()}
                accessibilityRole="button"
                accessibilityLabel="Retry lesson source verification"
              >
                <Text style={styles.contextRetryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.contextText}>
              {activeContext
                ? `Lesson ${activeContext.lessonNumber}: ${activeContext.lessonTitle} · Day ${activeContext.dayNumber}${activeContext.dayTitle ? `: ${activeContext.dayTitle}` : ""}. Official source loaded.`
                : "Your questions are answered with the current quarterly, lesson, day, and official source material in view."}
            </Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[styles.messages, { paddingBottom: 18 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && !requestMutation.isPending && (
            <View style={styles.welcomeCard}>
              <Ionicons
                name={isAuthenticated ? "chatbubbles-outline" : "lock-closed-outline"}
                size={28}
                color={theme.accent}
              />
              <Text style={styles.welcomeTitle}>
                {isAuthenticated ? "What would you like to explore?" : "Sign in to ask the Study Tutor"}
              </Text>
              <Text style={styles.welcomeText}>
                {isAuthenticated
                  ? "Ask about a theme, a Scripture reference, or something that stood out in today’s reading."
                  : "The Study Tutor is available to members so your questions stay connected to your study experience."}
              </Text>
              {!isAuthLoading && !isAuthenticated ? (
                <Pressable
                  onPress={() => router.push("/(auth)/login")}
                  style={styles.signInButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </Pressable>
              ) : (
                <View style={styles.promptList}>
                  {[
                    "What is the main point of today’s lesson?",
                    "How does this connect with the Bible passages?",
                    "What could this look like in daily life?",
                  ].map((prompt) => (
                    <Pressable
                      key={prompt}
                      onPress={() => requestMutation.mutate(prompt)}
                      style={({ pressed }) => [styles.promptChip, { opacity: pressed ? 0.72 : 1 }]}
                      disabled={!canAsk}
                    >
                      <Text style={styles.promptText}>{prompt}</Text>
                      <Ionicons name="arrow-forward" size={14} color={theme.accent} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {isContextError && isAuthenticated && messages.length === 0 && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                The official lesson context could not be confirmed. Retry verification before asking a question.
              </Text>
              <Pressable
                onPress={() => refetchContext()}
                accessibilityRole="button"
                accessibilityLabel="Retry official lesson context"
              >
                <Text style={styles.dismissText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {messages.map((message, index) => (
            <View
              key={`${message.role}-${index}`}
              style={[
                styles.messageBubble,
                message.role === "assistant" ? styles.assistantBubble : styles.userBubble,
              ]}
            >
              {message.role === "assistant" && (
                <View style={styles.messageLabel}>
                  <Ionicons name="school-outline" size={13} color={theme.accent} />
                  <Text style={styles.messageLabelText}>STUDY TUTOR</Text>
                </View>
              )}
              {message.content.split(/\n\n+/).filter(Boolean).map((paragraph, paragraphIndex) => (
                <Text
                  key={paragraphIndex}
                  style={[
                    styles.messageText,
                    message.role === "assistant" ? styles.assistantText : styles.userText,
                    paragraphIndex > 0 && styles.messageParagraph,
                  ]}
                >
                  {paragraph.trim()}
                </Text>
              ))}
            </View>
          ))}

          {requestMutation.isPending && (
            <View style={styles.thinking}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={styles.thinkingText}>Study Tutor is reading the lesson…</Text>
            </View>
          )}

          {requestMutation.isError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{requestError}</Text>
              <Pressable
                onPress={() => requestMutation.reset()}
                accessibilityRole="button"
                accessibilityLabel="Dismiss Study Tutor error"
              >
                <Text style={styles.dismissText}>Dismiss</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputArea, { paddingBottom: bottomPad + 10 }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={isAuthenticated ? "Ask about today’s lesson…" : "Sign in to ask a question"}
            placeholderTextColor={theme.textMuted}
            multiline
            maxLength={1500}
            editable={canAsk}
            testID="ss-day-tutor-input"
          />
          <Pressable
            onPress={sendQuestion}
            disabled={!input.trim() || !canAsk}
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || !canAsk) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send question to Study Tutor"
            accessibilityState={{ disabled: !input.trim() || !canAsk }}
            testID="ss-day-tutor-send"
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 6 },
  headerTitle: { color: theme.text, fontFamily: "Lora_700Bold", fontSize: 18 },
  headerSubtitle: { color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  contextCard: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(31, 122, 112, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(31, 122, 112, 0.18)",
  },
  contextIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(31, 122, 112, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  contextCopy: { flex: 1 },
  contextTitle: { color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 2 },
  contextText: { color: theme.textSecondary, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
  contextErrorRow: { gap: 4 },
  contextErrorText: { color: "#8A3A2A", fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 16 },
  contextRetryText: { color: theme.accent, fontFamily: "Inter_700Bold", fontSize: 11 },
  chatArea: { flex: 1 },
  messages: { paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  welcomeCard: {
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 22,
  },
  welcomeTitle: { color: theme.text, fontFamily: "Lora_600SemiBold", fontSize: 20, marginTop: 10 },
  welcomeText: {
    color: theme.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  promptList: { width: "100%", gap: 8, marginTop: 20 },
  signInButton: {
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 18,
  },
  signInButtonText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14 },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.backgroundCard,
    borderWidth: 1,
    borderColor: theme.border,
  },
  promptText: { color: theme.text, flex: 1, fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  messageBubble: { maxWidth: "92%", borderRadius: 14, padding: 13 },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: theme.backgroundCard,
    borderWidth: 1,
    borderColor: theme.border,
  },
  userBubble: { alignSelf: "flex-end", backgroundColor: "rgba(31, 122, 112, 0.14)" },
  messageLabel: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 7 },
  messageLabelText: { color: theme.accent, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.6 },
  messageText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  assistantText: { color: theme.text },
  userText: { color: theme.text },
  messageParagraph: { marginTop: 9 },
  thinking: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.backgroundCard,
    borderWidth: 1,
    borderColor: theme.border,
  },
  thinkingText: { color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 },
  errorCard: {
    alignSelf: "stretch",
    backgroundColor: "#FDF0ED",
    borderColor: "#E7B4A9",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: "#8A3A2A", fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 18 },
  dismissText: { color: theme.accent, fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 8 },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: theme.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 104,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    color: theme.text,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: theme.background,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
    backgroundColor: theme.accent,
  },
  sendButtonDisabled: { backgroundColor: "#B9B5AD" },
  sendButtonPressed: { opacity: 0.82 },
});