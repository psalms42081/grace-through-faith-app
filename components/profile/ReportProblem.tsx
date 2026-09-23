import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { SWEEP_LIGHT } from "@/constants/light-sweep";
import ListItem from "@/components/ui/ListItem";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { PROBLEM_REPORT_SCREENS, type ProblemReportScreen } from "@/lib/problem-report";

const C = {
  surface: PathB.surface,
  card: PathB.surfaceCard,
  ink: PathB.ink,
  inkMuted: HV2.inkMutedText,
  coral: PathB.coral,
  border: SWEEP_LIGHT.border,
};

function deviceLabel(): string {
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.userAgent) {
    return navigator.userAgent;
  }
  return `${Platform.OS} ${String(Platform.Version ?? "")}`.trim();
}

export default function ReportProblem() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [screen, setScreen] = useState<ProblemReportScreen | "">("");
  const [device, setDevice] = useState(deviceLabel);
  const [email, setEmail] = useState("");
  const [screenOpen, setScreenOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setOpen(false);
    setThanks(false);
    setError("");
    setSubmitting(false);
    setScreenOpen(false);
  };

  const openForm = () => {
    setMessage("");
    setScreen("");
    setDevice(deviceLabel());
    setEmail("");
    setThanks(false);
    setError("");
    setScreenOpen(false);
    setOpen(true);
  };

  const submit = async () => {
    if (!message.trim() || !screen || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await apiRequest("POST", "/api/feedback", {
        message: message.trim(),
        screen,
        device: device.trim(),
        email: isAuthenticated ? undefined : email.trim() || undefined,
      });
      setThanks(true);
    } catch {
      setError("We couldn't send that just now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ListItem
        icon="alert-circle-outline"
        iconColor={C.coral}
        title="Report a problem"
        onPress={openForm}
        testID="profile-report-problem"
        style={{ marginBottom: 6 }}
      />
      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: C.card, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}>
            <View style={s.header}>
              <Text style={s.title}>Report a problem</Text>
              <Pressable onPress={close} hitSlop={8} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={C.inkMuted} />
              </Pressable>
            </View>
            {thanks ? (
              <Text style={s.thanks} testID="profile-report-thanks">
                Thanks — we read every one
              </Text>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={s.label}>What happened</Text>
                <TextInput
                  style={[s.input, s.message]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Tell us what went wrong"
                  placeholderTextColor={C.inkMuted}
                  multiline
                  testID="profile-report-message"
                />
                <Text style={s.label}>Which screen</Text>
                {Platform.OS === "web" ? (
                  React.createElement(
                    "select",
                    {
                      "data-testid": "profile-report-screen",
                      "aria-label": "Which screen",
                      value: screen,
                      onChange: (event: { target: { value: string } }) => {
                        setScreen(event.target.value as ProblemReportScreen | "");
                      },
                      style: {
                        width: "100%",
                        marginBottom: 12,
                        padding: 12,
                        borderRadius: 10,
                        border: `1px solid ${C.border}`,
                        backgroundColor: C.surface,
                        color: C.ink,
                        fontSize: 15,
                        fontFamily: "Inter_400Regular",
                      },
                    },
                    React.createElement("option", { value: "" }, "Choose a screen"),
                    PROBLEM_REPORT_SCREENS.map((option) =>
                      React.createElement("option", { key: option, value: option }, option),
                    ),
                  )
                ) : (
                  <View style={{ marginBottom: 12 }}>
                    <Pressable
                      onPress={() => setScreenOpen((current) => !current)}
                      style={s.input}
                      testID="profile-report-screen"
                      accessibilityRole="button"
                      accessibilityLabel="Which screen"
                    >
                      <Text style={{ color: screen ? C.ink : C.inkMuted, fontFamily: "Inter_400Regular", fontSize: 15 }}>
                        {screen || "Choose a screen"}
                      </Text>
                    </Pressable>
                    {screenOpen
                      ? PROBLEM_REPORT_SCREENS.map((option) => (
                          <Pressable
                            key={option}
                            onPress={() => {
                              setScreen(option);
                              setScreenOpen(false);
                            }}
                            style={s.option}
                            testID={`profile-report-screen-${option}`}
                          >
                            <Text style={{ color: C.ink, fontFamily: "Inter_500Medium", fontSize: 15 }}>{option}</Text>
                          </Pressable>
                        ))
                      : null}
                  </View>
                )}
                <Text style={s.label}>Device and browser</Text>
                <TextInput
                  style={[s.input, s.message]}
                  value={device}
                  onChangeText={setDevice}
                  placeholder="Device and browser"
                  placeholderTextColor={C.inkMuted}
                  multiline
                  testID="profile-report-device"
                />
                {isAuthenticated ? null : (
                  <>
                    <Text style={s.label}>Email (optional)</Text>
                    <TextInput
                      style={s.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="So we can reply"
                      placeholderTextColor={C.inkMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      testID="profile-report-email"
                    />
                  </>
                )}
                {error ? <Text style={s.error}>{error}</Text> : null}
                <Pressable
                  onPress={() => void submit()}
                  disabled={!message.trim() || !screen || submitting}
                  style={[s.submit, (!message.trim() || !screen || submitting) && { opacity: 0.5 }]}
                  testID="profile-report-submit"
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.submitText}>Send</Text>
                  )}
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: C.ink,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  label: {
    color: C.inkMuted,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.surface,
    color: C.ink,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  message: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  error: {
    color: "#B42318",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 8,
  },
  submit: {
    backgroundColor: C.coral,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  submitText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  thanks: {
    color: C.ink,
    fontSize: 18,
    fontFamily: "Lora_700Bold",
    marginBottom: 12,
  },
});
