import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PathB } from "@/constants/colors";
import { SWEEP_LIGHT } from "@/constants/light-sweep";
import { apiRequest } from "@/lib/query-client";
import {
  AI_REPORT_LIMITS,
  AI_REPORT_LINK_LABEL,
  AI_REPORT_REASONS,
  AI_REPORT_THANKS,
  aiReportText,
  type AiReportReason,
} from "@/lib/ai-report";

const INK = PathB.ink;
const INK_MUTED = "#6B6660";
const SURFACE = PathB.surface;
const CARD = PathB.surfaceCard;
const CORAL = PathB.coral;
const BORDER = SWEEP_LIGHT.border;
/** Chrome text stops scaling here so the sheet stays usable at the largest system size. */
const FONT_CAP = 1.6;
const THANKS_VISIBLE_MS = 1400;

export type ReportAiAnswerProps = {
  /** Which AI feature produced the answer, e.g. "Explain this verse". */
  feature: string;
  /** Scripture or lesson reference the answer was about, e.g. "Matthew 5:1". */
  reference?: string | null;
  /** Bible version the answer used, e.g. "KJV". */
  version?: string | null;
  /** The AI output as rendered: a string, a list, or a structured answer. */
  responseText: unknown;
  style?: StyleProp<ViewStyle>;
  /** Link text colour for dark surfaces; defaults to the reader's muted ink. */
  color?: string;
  testID?: string;
};

/**
 * "Report this answer" link for AI-generated content, with the report sheet it opens
 * (Google Play AI-generated content policy). Works for guests and signed-in users.
 */
export function ReportAiAnswer({ feature, reference, version, responseText, style, color, testID }: ReportAiAnswerProps) {
  const [open, setOpen] = useState(false);
  const linkColor = color ?? INK_MUTED;
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }, style]}
        accessibilityRole="button"
        accessibilityLabel={reference ? `${AI_REPORT_LINK_LABEL} about ${reference}` : AI_REPORT_LINK_LABEL}
        testID={testID ?? "report-ai-answer"}
      >
        <Ionicons name="flag-outline" size={12} color={linkColor} />
        <Text style={[styles.linkText, { color: linkColor }]} maxFontSizeMultiplier={FONT_CAP}>
          {AI_REPORT_LINK_LABEL}
        </Text>
      </Pressable>
      {open ? (
        <ReportAiAnswerSheet
          feature={feature}
          reference={reference ?? null}
          version={version ?? null}
          responseText={responseText}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

type SheetProps = {
  feature: string;
  reference: string | null;
  version: string | null;
  responseText: unknown;
  onClose: () => void;
};

export function ReportAiAnswerSheet({ feature, reference, version, responseText, onClose }: SheetProps) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<AiReportReason | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const canSend = reason !== null && !submitting && !sent;

  const submit = async () => {
    if (!reason || submitting || sent) return;
    setSubmitting(true);
    setError("");
    try {
      await apiRequest("POST", "/api/ai-reports", {
        feature,
        reference,
        version,
        responseText: aiReportText(responseText),
        reason,
        comment: comment.trim() || undefined,
      });
      setSent(true);
      closeTimer.current = setTimeout(onClose, THANKS_VISIBLE_MS);
    } catch {
      setError("We couldn't send that just now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const about = [reference, version].filter(Boolean).join(" · ");

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View
          style={[styles.sheet, { paddingBottom: Platform.OS === "web" ? 28 : Math.max(insets.bottom, 12) + 16 }]}
          testID="report-ai-answer-sheet"
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} maxFontSizeMultiplier={FONT_CAP}>
              {AI_REPORT_LINK_LABEL}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" accessibilityRole="button" testID="report-ai-answer-close">
              <Ionicons name="close" size={24} color={INK_MUTED} />
            </Pressable>
          </View>
          {sent ? (
            <Text style={styles.thanks} testID="report-ai-answer-thanks" accessibilityLiveRegion="polite">
              {AI_REPORT_THANKS}
            </Text>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.context} maxFontSizeMultiplier={FONT_CAP}>
                {feature}
                {about ? ` · ${about}` : ""}
              </Text>
              <Text style={styles.label} maxFontSizeMultiplier={FONT_CAP}>
                What's wrong with it?
              </Text>
              <View accessibilityRole="radiogroup">
                {AI_REPORT_REASONS.map((option) => {
                  const selected = option === reason;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setReason(option)}
                      style={[styles.reason, selected && styles.reasonOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      testID={`report-ai-answer-reason-${option}`}
                    >
                      <Ionicons
                        name={selected ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={selected ? CORAL : INK_MUTED}
                      />
                      <Text style={[styles.reasonText, selected && styles.reasonTextOn]} maxFontSizeMultiplier={FONT_CAP}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.label} maxFontSizeMultiplier={FONT_CAP}>
                Comment (optional)
              </Text>
              <TextInput
                style={styles.input}
                value={comment}
                onChangeText={setComment}
                placeholder="Anything that helps us review it"
                placeholderTextColor={INK_MUTED}
                multiline
                maxLength={AI_REPORT_LIMITS.comment}
                maxFontSizeMultiplier={FONT_CAP}
                testID="report-ai-answer-comment"
              />
              {error ? (
                <Text style={styles.error} maxFontSizeMultiplier={FONT_CAP}>
                  {error}
                </Text>
              ) : null}
              <Pressable
                onPress={() => void submit()}
                disabled={!canSend}
                style={[styles.send, !canSend && { opacity: 0.5 }]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSend }}
                testID="report-ai-answer-send"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.sendText} maxFontSizeMultiplier={FONT_CAP}>
                    Send
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
  },
  linkText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
    textDecorationLine: "underline",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(31,26,18,0.4)",
  },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "90%",
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8D0BE",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    color: INK,
    fontSize: 18,
    fontFamily: "Lora_700Bold",
    flexShrink: 1,
    paddingRight: 12,
  },
  context: {
    color: INK_MUTED,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    marginBottom: 14,
  },
  label: {
    color: INK_MUTED,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
  },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    marginBottom: 8,
  },
  reasonOn: {
    borderColor: CORAL,
  },
  reasonText: {
    flex: 1,
    color: INK,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  reasonTextOn: {
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    backgroundColor: SURFACE,
    color: INK,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: BORDER,
    minHeight: 72,
    textAlignVertical: "top",
    marginTop: 2,
    marginBottom: 12,
  },
  error: {
    color: "#B42318",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 8,
  },
  send: {
    backgroundColor: CORAL,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 4,
  },
  sendText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  thanks: {
    color: INK,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: "Lora_700Bold",
    marginTop: 8,
    marginBottom: 16,
  },
});
