import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";

const FEEDBACK_TYPES = [
  { id: "bug", label: "Bug", icon: "bug-outline" as const },
  { id: "feature", label: "Suggestion", icon: "bulb-outline" as const },
  { id: "content", label: "Content Issue", icon: "book-outline" as const },
  { id: "performance", label: "Performance", icon: "speedometer-outline" as const },
  { id: "other", label: "Other", icon: "chatbubble-outline" as const },
];

export default function FeedbackScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [feedbackType, setFeedbackType] = useState("bug");
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await apiRequest("POST", "/api/feedback", {
        userId,
        topic: feedbackType,
        message: message.trim(),
        context: context.trim() || undefined,
        email: email.trim() || undefined,
        platform: Platform.OS,
        appVersion: "1.0.0",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("We couldn't send your feedback right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [message, feedbackType, context, email, userId]);

  if (submitted) {
    return (
      <View style={[st.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[st.successContainer, { paddingTop: topPad + 60 }]}>
          <View style={[st.successIcon, { backgroundColor: theme.accent + "20" }]}>
            <Ionicons name="checkmark-circle" size={56} color={theme.accent} />
          </View>
          <Text style={[st.successTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Thank You
          </Text>
          <Text style={[st.successDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Thanks for your feedback. Your input helps us improve Grace Through Faith.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[st.doneBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={[st.doneBtnText, { fontFamily: "Inter_600SemiBold" }]}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[st.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={st.headerCenter}>
          <Text style={[st.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Share Feedback
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={st.scrollView}
        contentContainerStyle={[st.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[st.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Tell us what's working, what feels broken, or what you'd love to see improved.
        </Text>

        <Text style={[st.label, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          Feedback Type
        </Text>
        <View style={st.typeRow}>
          {FEEDBACK_TYPES.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setFeedbackType(t.id)}
              style={[
                st.typeChip,
                {
                  backgroundColor: feedbackType === t.id ? theme.accent + "20" : (theme.backgroundCard || "#1A1A24"),
                  borderColor: feedbackType === t.id ? theme.accent : theme.border,
                },
              ]}
            >
              <Ionicons
                name={t.icon}
                size={14}
                color={feedbackType === t.id ? theme.accent : theme.textMuted}
              />
              <Text
                style={[
                  st.typeLabel,
                  {
                    color: feedbackType === t.id ? theme.accent : theme.textSecondary,
                    fontFamily: feedbackType === t.id ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[st.label, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          Your Message
        </Text>
        <TextInput
          style={[st.input, st.inputLarge, {
            color: theme.text,
            backgroundColor: theme.backgroundCard || "#0A0A0F",
            borderColor: theme.border,
            fontFamily: "Inter_400Regular",
          }]}
          placeholder="Describe the issue or idea in as much detail as possible."
          placeholderTextColor={theme.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          testID="feedback-message"
        />

        <Text style={[st.label, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          Context (optional)
        </Text>
        <TextInput
          style={[st.input, {
            color: theme.text,
            backgroundColor: theme.backgroundCard || "#0A0A0F",
            borderColor: theme.border,
            fontFamily: "Inter_400Regular",
          }]}
          placeholder="What screen were you on? What were you trying to do?"
          placeholderTextColor={theme.textMuted}
          value={context}
          onChangeText={setContext}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
          testID="feedback-context"
        />

        <Text style={[st.label, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          Email (optional)
        </Text>
        <TextInput
          style={[st.input, {
            color: theme.text,
            backgroundColor: theme.backgroundCard || "#0A0A0F",
            borderColor: theme.border,
            fontFamily: "Inter_400Regular",
          }]}
          placeholder="Your email (optional if you'd like a reply)"
          placeholderTextColor={theme.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          testID="feedback-email"
        />

        {error ? (
          <View style={st.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={[st.errorText, { fontFamily: "Inter_400Regular" }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting || !message.trim()}
          style={[
            st.submitBtn,
            { opacity: submitting || !message.trim() ? 0.5 : 1 },
          ]}
          testID="feedback-submit"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={16} color="#fff" />
              <Text style={[st.submitText, { fontFamily: "Inter_700Bold" }]}>
                Send Feedback
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
  },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  typeLabel: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    marginBottom: 4,
  },
  inputLarge: {
    minHeight: 120,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: "#C9933A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 12,
  },
  submitText: {
    color: "#fff",
    fontSize: 15,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
  },
  successDesc: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  doneBtn: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    marginTop: 12,
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 15,
  },
});
