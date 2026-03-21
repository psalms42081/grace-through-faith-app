import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest, queryClient } from "@/lib/query-client";

type Step = "choice" | "join" | "register-church" | "register-conference";

export default function OrgOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("choice");
  const [joinCode, setJoinCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const topPad = Platform.OS === "web" ? 67 + insets.top : insets.top;

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      setError("Please enter a join code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/organizations/join", { joinCode: joinCode.trim() });
      const data = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/organizations/my-org"] });
      setSuccess(`Joined ${data.organization?.name || "your church"}!`);
      setTimeout(() => router.dismissAll(), 1500);
    } catch (err: any) {
      const msg = err?.message || "";
      const parsed = msg.match(/^\d+:\s*(.+)/);
      if (parsed) {
        try {
          const body = JSON.parse(parsed[1]);
          setError(body.error || "Failed to join");
        } catch {
          setError(parsed[1]);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
    setLoading(false);
  };

  const handleRegister = async (type: "church" | "conference") => {
    if (!orgName.trim()) {
      setError(`Please enter a ${type} name`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/organizations", {
        name: orgName.trim(),
        type,
      });
      const data = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/organizations/my-org"] });
      setSuccess(`${type === "church" ? "Church" : "Conference"} created! Your join code: ${data.joinCode}`);
      setTimeout(() => router.dismissAll(), 2500);
    } catch (err: any) {
      const msg = err?.message || "";
      const parsed = msg.match(/^\d+:\s*(.+)/);
      if (parsed) {
        try {
          const body = JSON.parse(parsed[1]);
          setError(body.error || "Failed to register");
        } catch {
          setError(parsed[1]);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
    setLoading(false);
  };

  const handleSkip = () => {
    router.dismissAll();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingTop: topPad + 40, paddingBottom: insets.bottom + 40, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === "choice" && (
          <>
            <View style={s.iconWrap}>
              <Ionicons name="people" size={56} color="#C9933A" />
            </View>
            <Text style={s.title}>Join or Register a Church</Text>
            <Text style={s.subtitle}>
              Connect with your church family for shared devotions, prayer groups, and community features.
            </Text>

            <Pressable style={s.optionCard} onPress={() => setStep("join")}>
              <Ionicons name="enter-outline" size={28} color="#C9933A" />
              <View style={s.optionTextWrap}>
                <Text style={s.optionTitle}>Join a Church</Text>
                <Text style={s.optionDesc}>I have a join code from my pastor</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </Pressable>

            <Pressable style={s.optionCard} onPress={() => setStep("register-church")}>
              <Ionicons name="home-outline" size={28} color="#C9933A" />
              <View style={s.optionTextWrap}>
                <Text style={s.optionTitle}>Register My Church</Text>
                <Text style={s.optionDesc}>I'm a pastor or leader starting my church</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </Pressable>

            <Pressable style={s.optionCard} onPress={() => setStep("register-conference")}>
              <Ionicons name="globe-outline" size={28} color="#C9933A" />
              <View style={s.optionTextWrap}>
                <Text style={s.optionTitle}>Register a Conference</Text>
                <Text style={s.optionDesc}>Manage multiple churches under one conference</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </Pressable>

            <Pressable style={s.skipBtn} onPress={handleSkip}>
              <Text style={s.skipText}>Continue as Individual</Text>
            </Pressable>
          </>
        )}

        {step === "join" && (
          <>
            <Pressable onPress={() => { setStep("choice"); setError(""); }} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#C9933A" />
              <Text style={s.backText}>Back</Text>
            </Pressable>
            <Text style={s.title}>Join a Church</Text>
            <Text style={s.subtitle}>Enter the join code shared by your pastor or church leader.</Text>

            <TextInput
              style={s.input}
              placeholder="Enter join code (e.g., ABCD1234)"
              placeholderTextColor="#666"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              maxLength={10}
              testID="join-code-input"
            />

            {error ? <Text style={s.error}>{error}</Text> : null}
            {success ? <Text style={s.success}>{success}</Text> : null}

            <Pressable
              style={[s.primaryBtn, loading && s.btnDisabled]}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnText}>Join Church</Text>
              )}
            </Pressable>
          </>
        )}

        {(step === "register-church" || step === "register-conference") && (
          <>
            <Pressable onPress={() => { setStep("choice"); setError(""); }} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#C9933A" />
              <Text style={s.backText}>Back</Text>
            </Pressable>
            <Text style={s.title}>
              {step === "register-church" ? "Register Your Church" : "Register a Conference"}
            </Text>
            <Text style={s.subtitle}>
              {step === "register-church"
                ? "You'll be set as the pastor and receive a join code to share with your congregation."
                : "Create a conference to manage multiple churches. You'll be the conference administrator."}
            </Text>

            <TextInput
              style={s.input}
              placeholder={step === "register-church" ? "Church name" : "Conference name"}
              placeholderTextColor="#666"
              value={orgName}
              onChangeText={setOrgName}
              testID="org-name-input"
            />

            {error ? <Text style={s.error}>{error}</Text> : null}
            {success ? <Text style={s.success}>{success}</Text> : null}

            <Pressable
              style={[s.primaryBtn, loading && s.btnDisabled]}
              onPress={() => handleRegister(step === "register-church" ? "church" : "conference")}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnText}>
                  {step === "register-church" ? "Register Church" : "Register Conference"}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D15" },
  iconWrap: { alignItems: "center", marginBottom: 20 },
  title: {
    fontSize: 24,
    fontFamily: "Lora_700Bold",
    color: "#E8DCC8",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A24",
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2A2A35",
    gap: 14,
  },
  optionTextWrap: { flex: 1 },
  optionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#E8DCC8",
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  skipText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#C9933A",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  backText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#C9933A",
  },
  input: {
    backgroundColor: "#1A1A24",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A35",
    padding: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#E8DCC8",
    marginBottom: 16,
  },
  error: {
    color: "#E8456B",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
    textAlign: "center",
  },
  success: {
    color: "#4CAF50",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: "#C9933A",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
