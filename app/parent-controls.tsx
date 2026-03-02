import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useKidsMode } from "@/context/KidsModeContext";

type Flow = "idle" | "set" | "change" | "remove";

function showAlert(title: string, msg: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
}

export default function ParentControlsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const theme = Colors.dark;

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
        showAlert("Invalid PIN", "Please enter a 4-digit PIN.");
        return;
      }
      setStep(1);
      return;
    }
    if (confirmInput !== newInput) {
      showAlert("Mismatch", "PINs do not match. Try again.");
      setConfirmInput("");
      return;
    }
    await setPin(newInput);
    showAlert("Success", "PIN has been set.");
    resetFlow();
  };

  const handleChangePin = async () => {
    if (step === 0) {
      if (!verifyPin(currentInput)) {
        showAlert("Incorrect", "Current PIN is incorrect.");
        setCurrentInput("");
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (newInput.length !== 4) {
        showAlert("Invalid PIN", "Please enter a 4-digit PIN.");
        return;
      }
      setStep(2);
      return;
    }
    if (confirmInput !== newInput) {
      showAlert("Mismatch", "PINs do not match. Try again.");
      setConfirmInput("");
      return;
    }
    await setPin(newInput);
    showAlert("Success", "PIN has been changed.");
    resetFlow();
  };

  const handleRemovePin = async () => {
    if (!verifyPin(currentInput)) {
      showAlert("Incorrect", "Current PIN is incorrect.");
      setCurrentInput("");
      return;
    }
    await removePin();
    showAlert("Removed", "PIN has been removed.");
    resetFlow();
  };

  const renderInput = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string
  ) => (
    <TextInput
      style={st.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#5C5549"
      secureTextEntry
      keyboardType="number-pad"
      maxLength={4}
      autoFocus
    />
  );

  const renderFlowContent = () => {
    if (flow === "set") {
      return (
        <View style={st.flowCard}>
          <Text style={st.flowTitle}>Set PIN</Text>
          {step === 0 ? (
            <>
              {renderInput(newInput, setNewInput, "Enter 4-digit PIN")}
              <Pressable
                onPress={handleSetPin}
                style={({ pressed }) => [st.btn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={st.btnText}>Next</Text>
              </Pressable>
            </>
          ) : (
            <>
              {renderInput(confirmInput, setConfirmInput, "Confirm PIN")}
              <Pressable
                onPress={handleSetPin}
                style={({ pressed }) => [st.btn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={st.btnText}>Confirm</Text>
              </Pressable>
            </>
          )}
          <Pressable
            onPress={resetFlow}
            style={({ pressed }) => [st.btnSecondary, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={st.btnSecondaryText}>Cancel</Text>
          </Pressable>
        </View>
      );
    }

    if (flow === "change") {
      return (
        <View style={st.flowCard}>
          <Text style={st.flowTitle}>Change PIN</Text>
          {step === 0 ? (
            <>
              {renderInput(currentInput, setCurrentInput, "Current PIN")}
              <Pressable
                onPress={handleChangePin}
                style={({ pressed }) => [st.btn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={st.btnText}>Verify</Text>
              </Pressable>
            </>
          ) : step === 1 ? (
            <>
              {renderInput(newInput, setNewInput, "New 4-digit PIN")}
              <Pressable
                onPress={handleChangePin}
                style={({ pressed }) => [st.btn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={st.btnText}>Next</Text>
              </Pressable>
            </>
          ) : (
            <>
              {renderInput(confirmInput, setConfirmInput, "Confirm new PIN")}
              <Pressable
                onPress={handleChangePin}
                style={({ pressed }) => [st.btn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={st.btnText}>Confirm</Text>
              </Pressable>
            </>
          )}
          <Pressable
            onPress={resetFlow}
            style={({ pressed }) => [st.btnSecondary, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={st.btnSecondaryText}>Cancel</Text>
          </Pressable>
        </View>
      );
    }

    if (flow === "remove") {
      return (
        <View style={st.flowCard}>
          <Text style={st.flowTitle}>Remove PIN</Text>
          {renderInput(currentInput, setCurrentInput, "Enter current PIN")}
          <Pressable
            onPress={handleRemovePin}
            style={({ pressed }) => [st.btn, st.btnDanger, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={st.btnText}>Remove</Text>
          </Pressable>
          <Pressable
            onPress={resetFlow}
            style={({ pressed }) => [st.btnSecondary, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={st.btnSecondaryText}>Cancel</Text>
          </Pressable>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[st.container, { paddingTop: topPad }]}>
      <View style={st.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [st.backBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={st.headerTitle}>Parent Controls</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.section}>
          <View style={st.sectionHeaderRow}>
            <View style={st.sectionIconWrap}>
              <Ionicons name="lock-closed" size={20} color="#C9933A" />
            </View>
            <Text style={st.sectionTitle}>Kids Mode PIN</Text>
          </View>
          <Text style={st.sectionDesc}>
            {pin
              ? "A PIN is currently set for Kids Mode."
              : "No PIN set. Set a PIN to secure Kids Mode."}
          </Text>

          {flow === "idle" && (
            <View style={st.actionButtons}>
              {!pin ? (
                <Pressable
                  onPress={() => setFlow("set")}
                  style={({ pressed }) => [st.btn, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <Ionicons name="key" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={st.btnText}>Set PIN</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => setFlow("change")}
                    style={({ pressed }) => [st.btn, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    <Ionicons name="swap-horizontal" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={st.btnText}>Change PIN</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setFlow("remove")}
                    style={({ pressed }) => [st.btnOutline, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#E57373" style={{ marginRight: 8 }} />
                    <Text style={[st.btnText, { color: "#E57373" }]}>Remove PIN</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          {renderFlowContent()}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050507",
  },
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
    color: "#F0EBE0",
  },
  section: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: "#141518",
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
    backgroundColor: "rgba(201,147,58,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#F0EBE0",
  },
  sectionDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#5C5549",
    marginBottom: 20,
    marginTop: 4,
  },
  actionButtons: {
    gap: 12,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C9933A",
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
    borderColor: "#E57373",
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
    color: "#5C5549",
  },
  flowCard: {
    marginTop: 8,
    gap: 12,
  },
  flowTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#C9933A",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#0C0D11",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    color: "#F0EBE0",
    letterSpacing: 8,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#1E1F24",
  },
});
