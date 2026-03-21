import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

const PROFILE_OPTIONS = [
  {
    key: "member",
    icon: "person" as const,
    title: "Member",
    desc: "Daily devotions, Bible study, and prayer",
  },
  {
    key: "student",
    icon: "school" as const,
    title: "Student",
    desc: "Structured courses and formation paths",
  },
  {
    key: "church_leader",
    icon: "shield-checkmark" as const,
    title: "Church Leader",
    desc: "Leader access will be reviewed after sign-up",
  },
  {
    key: "exploring",
    icon: "compass" as const,
    title: "Just Exploring",
    desc: "Browse freely and decide later",
  },
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileType, setProfileType] = useState("member");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!displayName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,63}$/;
    const tldRegex = /\.([a-zA-Z]+)$/;
    const tldMatch = email.trim().match(tldRegex);
    if (!emailRegex.test(email.trim()) || (tldMatch && tldMatch[1].length > 6)) {
      setError("Please check your email address for typos");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);
    const result = await register(email.trim(), password, displayName.trim(), profileType);
    setLoading(false);
    if (result.success) {
      router.replace("/org-onboarding");
    } else {
      setError(result.error || "Registration failed");
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <Ionicons name="person-add" size={48} color="#C9933A" />
          <Text style={s.title}>{t("auth.createAccount")}</Text>
          <Text style={s.subtitle}>
            Save your progress, join prayer groups, and connect with your church family
          </Text>
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.form}>
          <Text style={s.label}>{t("auth.yourName")}</Text>
          <TextInput
            style={s.input}
            placeholder="How should we greet you?"
            placeholderTextColor="#666"
            autoCapitalize="words"
            value={displayName}
            onChangeText={setDisplayName}
            testID="register-name"
          />

          <Text style={s.label}>{t("auth.email")}</Text>
          <TextInput
            style={s.input}
            placeholder="your@email.com"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            testID="register-email"
          />

          <Text style={s.label}>{t("auth.password")}</Text>
          <View style={s.passwordRow}>
            <TextInput
              style={[s.input, s.passwordInput]}
              placeholder="At least 6 characters"
              autoCapitalize="none"
              placeholderTextColor="#666"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              testID="register-password"
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={s.eyeBtn}
              hitSlop={12}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="#888"
              />
            </Pressable>
          </View>

          <Text style={[s.label, { marginTop: 16 }]}>I am a...</Text>
          <View style={s.roleGroup}>
            {PROFILE_OPTIONS.map((opt) => {
              const active = profileType === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setProfileType(opt.key)}
                  style={[s.roleCard, active && s.roleCardActive]}
                  testID={`profile-${opt.key}`}
                >
                  <View style={s.roleRow}>
                    <View style={[s.roleIcon, active && s.roleIconActive]}>
                      <Ionicons
                        name={opt.icon}
                        size={18}
                        color={active ? "#050507" : "#C9933A"}
                      />
                    </View>
                    <View style={s.roleText}>
                      <Text style={[s.roleTitle, active && s.roleTitleActive]}>
                        {opt.title}
                      </Text>
                      <Text style={s.roleDesc}>{opt.desc}</Text>
                    </View>
                    {active && (
                      <Ionicons name="checkmark-circle" size={20} color="#C9933A" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={[s.primaryBtn, loading && s.btnDisabled]}
            testID="register-submit"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.primaryBtnText}>{t("auth.createAccount")}</Text>
            )}
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>{t("auth.haveAccount")}</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={s.linkText}>{t("auth.signIn")}</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050507" },
  scroll: { flexGrow: 1, padding: 24 },
  header: { alignItems: "center", marginTop: 24, marginBottom: 28, gap: 8 },
  title: {
    fontSize: 28,
    color: "#F0E8D8",
    fontFamily: "Lora_700Bold",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,107,107,0.1)",
    marginBottom: 16,
  },
  errorText: { color: "#FF6B6B", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  form: { gap: 6 },
  label: {
    fontSize: 13,
    color: "#999",
    fontFamily: "Inter_500Medium",
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#1A1A2E",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: "#F0E8D8",
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: "#2A2A3E",
  },
  passwordRow: { position: "relative" as const },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: "absolute" as const,
    right: 14,
    top: 16,
  },
  roleGroup: { gap: 8, marginTop: 4 },
  roleCard: {
    backgroundColor: "#1A1A2E",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#2A2A3E",
  },
  roleCardActive: {
    borderColor: "#C9933A",
    backgroundColor: "rgba(201, 147, 58, 0.06)",
  },
  roleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(201, 147, 58, 0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  roleIconActive: {
    backgroundColor: "#C9933A",
  },
  roleText: { flex: 1 },
  roleTitle: {
    fontSize: 15,
    color: "#F0E8D8",
    fontFamily: "Inter_600SemiBold",
  },
  roleTitleActive: {
    color: "#C9933A",
  },
  roleDesc: {
    fontSize: 12,
    color: "#888",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: "#C9933A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center" as const,
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  footer: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 28,
  },
  footerText: { color: "#999", fontSize: 14, fontFamily: "Inter_400Regular" },
  linkText: { color: "#C9933A", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
