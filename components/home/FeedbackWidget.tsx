import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

interface FeedbackWidgetProps {
  theme: any;
  isDark: boolean;
}

const TOPICS = [
  { id: "bug", label: "Bug Report", icon: "bug-outline" as const },
  { id: "feature", label: "Feature Request", icon: "bulb-outline" as const },
  { id: "content", label: "Content", icon: "book-outline" as const },
  { id: "other", label: "Other", icon: "chatbubble-outline" as const },
];

export default function FeedbackWidget({ theme, isDark }: FeedbackWidgetProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("other");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { userId } = useAuth();

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/feedback", {
        userId,
        topic: selectedTopic,
        message: message.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
      setTimeout(() => {
        setModalVisible(false);
        setSubmitted(false);
        setMessage("");
        setSelectedTopic("other");
      }, 2000);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  }, [message, selectedTopic, userId]);

  const handleClose = useCallback(() => {
    setModalVisible(false);
    setSubmitted(false);
    setMessage("");
    setSelectedTopic("other");
  }, []);

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={[ms.card, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", borderColor: theme.border }]}
        testID="feedback-widget"
      >
        <View style={[ms.iconWrap, { backgroundColor: theme.accent + "15" }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.accent} />
        </View>
        <View style={ms.cardContent}>
          <Text style={[ms.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Share Feedback
          </Text>
          <Text style={[ms.cardDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Help us improve your experience
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={ms.overlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {Platform.OS !== "web" ? (
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.75)" }]} />
          )}

          {submitted ? (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={[ms.modalCard, { backgroundColor: isDark ? "#111116" : "#FFFDF6", alignItems: "center" }]}
            >
              <View style={[ms.thankIcon, { backgroundColor: theme.accent + "20" }]}>
                <Ionicons name="checkmark-circle" size={40} color={theme.accent} />
              </View>
              <Text style={[ms.thankTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                Thank You
              </Text>
              <Text style={[ms.thankDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Your feedback helps shape this ministry. We read every message.
              </Text>
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeInDown.duration(400).springify()}
              style={[ms.modalCard, { backgroundColor: isDark ? "#111116" : "#FFFDF6" }]}
            >
              <Pressable onPress={handleClose} style={ms.closeBtn} testID="feedback-close">
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </Pressable>

              <Text style={[ms.modalTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                Share Your Thoughts
              </Text>
              <Text style={[ms.modalDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Your feedback helps us serve you and others better.
              </Text>

              <View style={ms.topicRow}>
                {TOPICS.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => setSelectedTopic(t.id)}
                    style={[
                      ms.topicChip,
                      {
                        backgroundColor: selectedTopic === t.id ? theme.accent + "20" : (isDark ? "#1A1A24" : "#F0EBE0"),
                        borderColor: selectedTopic === t.id ? theme.accent : "transparent",
                      },
                    ]}
                  >
                    <Ionicons
                      name={t.icon}
                      size={14}
                      color={selectedTopic === t.id ? theme.accent : theme.textMuted}
                    />
                    <Text
                      style={[
                        ms.topicLabel,
                        {
                          color: selectedTopic === t.id ? theme.accent : theme.textSecondary,
                          fontFamily: selectedTopic === t.id ? "Inter_600SemiBold" : "Inter_400Regular",
                        },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={[
                  ms.input,
                  {
                    color: theme.text,
                    backgroundColor: isDark ? "#0A0A0F" : "#F8F6F0",
                    borderColor: theme.border,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
                placeholder="Tell us what's on your mind..."
                placeholderTextColor={theme.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                testID="feedback-input"
              />

              <Pressable
                onPress={handleSubmit}
                disabled={submitting || !message.trim()}
                style={[
                  ms.submitBtn,
                  { opacity: submitting || !message.trim() ? 0.5 : 1 },
                ]}
                testID="feedback-submit"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={[ms.submitText, { fontFamily: "Inter_700Bold" }]}>
                      Send Feedback
                    </Text>
                  </>
                )}
              </Pressable>
            </Animated.View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const ms = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    paddingTop: 40,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  topicRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
    justifyContent: "center",
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  topicLabel: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    minHeight: 110,
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: "#C9933A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitText: {
    color: "#fff",
    fontSize: 15,
  },
  thankIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  thankTitle: {
    fontSize: 22,
    marginBottom: 8,
  },
  thankDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
});
