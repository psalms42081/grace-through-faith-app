import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useKidsMode } from "@/context/KidsModeContext";
import { useToast } from "@/contexts/ToastContext";

type Flow = "idle" | "set" | "change" | "remove";

export default function ParentControlsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { pin, setPin, removePin, verifyPin } = useKidsMode();

  const [flow, setFlow] = useState<Flow>("idle");
  const [step, setStep] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [newInput, setNewInput] = useState("");
  const [confirmInput, setConfirmInput] = useState("");

  const resetFlow = () => {
    setFlow("idle");
    setStep(0);
    setCurrentInput("");
    setNewInput("");
    setConfirmInput("");
  };

  const handleSetPin = async () => {
    if (step === 0) {
      if (newInput.length !== 4) {
        showToast("Please enter a 4-digit PIN.", "error");
        return;
      }
      setStep(1);
      return;
    }
    if (confirmInput !== newInput) {
      showToast("PINs do not match. Try again.", "error");
      setConfirmInput("");
      return;
    }
    await setPin(newInput);
    showToast("PIN has been set.", "success");
    resetFlow();
  };

  const handleChangePin = async () => {
    if (!pin) {
      showToast("No PIN is currently set.", "error");
      resetFlow();
      return;
    }
    if (step === 0) {
      if (!verifyPin(currentInput)) {
        showToast("Current PIN is incorrect.", "error");
        setCurrentInput("");
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (newInput.length !== 4) {
        showToast("Please enter a 4-digit PIN.", "error");
        return;
      }
      setStep(2);
      return;
    }
    if (confirmInput !== newInput) {
      showToast("PINs do not match. Try again.", "error");
      setConfirmInput("");
      return;
    }
    await setPin(newInput);
    showToast("PIN has been changed.", "success");
    resetFlow();
  };

  const handleRemovePin = async () => {
    if (!pin) {
      showToast("No PIN is currently set.", "error");
      resetFlow();
      return;
    }
    if (!verifyPin(currentInput)) {
      showToast("Current PIN is incorrect.", "error");
      setCurrentInput("");
      return;
    }
    await removePin();
    showToast("PIN has been removed.", "success");
    resetFlow();
  };

  const renderInput = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    testID?: string
  ) => (
    <TextInput
      style={[st.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.textMuted}
      secureTextEntry
      keyboardType="number-pad"
      maxLength={4}
      autoFocus
      testID={testID}
    />
  );

  const renderFlowContent = () => {
    if (flow === "set") {
      return (
        <View style={st.flowCard}>
          <Text style={[st.flowTitle, { color: theme.accent }]}>Set PIN</Text>
          {step === 0 ? (
            <>
              {renderInput(newInput, setNewInput, "Enter 4-digit PIN", "new-pin-input")}
              <Pressable
                onPress={handleSetPin}
                style={({ pressed }) => [st.btn, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
                testID="submit-next"
              >
                <Text style={st.btnText}>Next</Text>
              </Pressable>
            </>
          ) : (
            <>
              {renderInput(confirmInput, setConfirmInput, "Confirm PIN", "confirm-pin-input")}
              <Pressable
                onPress={handleSetPin}
                style={({ pressed }) => [st.btn, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
                testID="submit-confirm"
              >
                <Text style={st.btnText}>Confirm</Text>
              </Pressable>
            </>
          )}
          <Pressable onPress={resetFlow} style={st.btnSecondary}>
            <Text style={[st.btnSecondaryText, { color: theme.textMuted }]}>Cancel</Text>
          </Pressable>
        </View>
      );
    }

    if (flow === "change") {
      return (
        <View style={st.flowCard}>
          <Text style={[st.flowTitle, { color: theme.accent }]}>Change PIN</Text>
          {step === 0 ? (
            <>
              {renderInput(currentInput, setCurrentInput, "Current PIN", "current-pin-input")}
              <Pressable
                onPress={handleChangePin}
                style={({ pressed }) => [st.btn, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={st.btnText}>Verify</Text>
              </Pressable>
            </>
          ) : step === 1 ? (
            <>
              {renderInput(newInput, setNewInput, "New 4-digit PIN", "new-pin-input")}
              <Pressable
                onPress={handleChangePin}
                style={({ pressed }) => [st.btn, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={st.btnText}>Next</Text>
              </Pressable>
            </>
          ) : (
            <>
              {renderInput(confirmInput, setConfirmInput, "Confirm new PIN", "confirm-pin-input")}
              <Pressable
                onPress={handleChangePin}
                style={({ pressed }) => [st.btn, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={st.btnText}>Confirm</Text>
              </Pressable>
            </>
          )}
          <Pressable onPress={resetFlow} style={st.btnSecondary}>
            <Text style={[st.btnSecondaryText, { color: theme.textMuted }]}>Cancel</Text>
          </Pressable>
        </View>
      );
    }

    if (flow === "remove") {
      return (
        <View style={st.flowCard}>
          <Text style={[st.flowTitle, { color: "#EF4444" }]}>Remove PIN</Text>
          {renderInput(currentInput, setCurrentInput, "Enter current PIN", "current-pin-input")}
          <Pressable
            onPress={handleRemovePin}
            style={({ pressed }) => [st.btn, st.btnDanger, { opacity: pressed ? 0.85 : 1 }]}
            testID="submit-remove"
          >
            <Text style={st.btnText}>Remove</Text>
          </Pressable>
          <Pressable onPress={resetFlow} style={st.btnSecondary}>
            <Text style={[st.btnSecondaryText, { color: theme.textMuted }]}>Cancel</Text>
          </Pressable>
        </View>
      );
    }

    return null;
  };

  const hasPin = !!pin;

  return (
    <View style={[st.container, { backgroundColor: theme.background, paddingTop: topPad }]}>
      <View style={st.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [st.backBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[st.headerTitle, { color: theme.text }]}>Parent Controls</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[st.section, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.sectionHeaderRow}>
            <View style={[st.sectionIconWrap, { backgroundColor: theme.accent + "15" }]}>
              <Ionicons name="lock-closed" size={20} color={theme.accent} />
            </View>
            <Text style={[st.sectionTitle, { color: theme.text }]}>Kids Mode PIN</Text>
          </View>
          <Text style={[st.sectionDesc, { color: theme.textSecondary }]}>
            {hasPin
              ? "A PIN is set. Children must enter it to exit Kids Mode or switch readers."
              : "Kids Mode is currently unlocked. Set a PIN to require parent approval before exiting."}
          </Text>

          <View style={[st.statusRow, { backgroundColor: hasPin ? "#10B981" + "15" : theme.textMuted + "10" }]}>
            <Ionicons
              name={hasPin ? "lock-closed" : "lock-open"}
              size={16}
              color={hasPin ? "#10B981" : theme.textMuted}
            />
            <Text style={[st.statusText, { color: hasPin ? "#10B981" : theme.textMuted }]}>
              {hasPin ? "PIN Protected" : "No PIN Set"}
            </Text>
          </View>

          {flow === "idle" && (
            <View style={st.actionButtons}>
              {!hasPin ? (
                <Pressable
                  onPress={() => setFlow("set")}
                  style={({ pressed }) => [st.btn, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
                  testID="set-pin-btn"
                >
                  <Ionicons name="key" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={st.btnText}>Set PIN</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => setFlow("change")}
                    style={({ pressed }) => [st.btn, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
                    testID="change-pin-btn"
                  >
                    <Ionicons name="swap-horizontal" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={st.btnText}>Change PIN</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setFlow("remove")}
                    style={({ pressed }) => [st.btnOutline, { opacity: pressed ? 0.85 : 1 }]}
                    testID="remove-pin-btn"
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={[st.btnText, { color: "#EF4444" }]}>Remove PIN</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          {renderFlowContent()}
        </View>

        <View style={[st.infoCard, { backgroundColor: theme.backgroundCard }]}>
          <Ionicons name="information-circle-outline" size={18} color={theme.textMuted} />
          <Text style={[st.infoText, { color: theme.textMuted }]}>
            The PIN prevents children from exiting Kids Mode or switching readers without your permission. It is stored locally on this device.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Lora_700Bold",
  },
  section: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 20,
    padding: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  sectionDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginBottom: 14,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  actionButtons: {
    gap: 12,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  btnDanger: {
    backgroundColor: "#C0392B",
  },
  btnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  btnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  btnSecondary: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  flowCard: {
    marginTop: 8,
    gap: 12,
  },
  flowTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  input: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    letterSpacing: 8,
    textAlign: "center",
    borderWidth: 1,
  },
  infoCard: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
});
