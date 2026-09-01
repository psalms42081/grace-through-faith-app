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
  Image,
} from "react-native";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { SWEEP_LIGHT } from "@/constants/light-sweep";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }
    setError("");
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      router.dismissAll();
    } else {
      setError(result.error || "Sign in failed");
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
          <Image
            source={require("@/assets/images/informed-ministries-icon.png")}
            style={s.brandMark}
            resizeMode="contain"
            accessibilityLabel="Informed Ministries"
          />
          <Text style={s.title}>{resetMode ? t("auth.resetPassword") : t("auth.signIn")}</Text>
          <Text style={s.subtitle}>
            {resetMode
              ? "Enter your email and a new password"
              : "Sign in to sync your progress and stay connected"}
          </Text>
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.form}>
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
            testID="login-email"
          />

          {resetMode ? (
            <>
              <View style={s.resetInfo}>
                <Ionicons name="information-circle" size={20} color={PathB.ink} />
                <Text style={s.resetInfoText}>
                  Password reset is available from your profile after signing in. If you cannot access your account, please create a new one.
                </Text>
              </View>

              <Pressable
                onPress={() => { setResetMode(false); setError(""); }}
                style={s.primaryBtn}
              >
                <Text style={s.primaryBtnText}>{t("auth.backToSignIn")}</Text>
              </Pressable>

              <Link href="/(auth)/register" asChild>
                <Pressable style={s.skipBtn}>
                  <Text style={s.linkText}>{t("auth.createAccount")}</Text>
                </Pressable>
              </Link>
            </>
          ) : (
            <>
              <Text style={s.label}>{t("auth.password")}</Text>
              <View style={s.passwordRow}>
                <TextInput
                  style={[s.input, s.passwordInput]}
                  placeholder="Your password"
                  placeholderTextColor="#666"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  testID="login-password"
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

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={[s.primaryBtn, loading && s.btnDisabled]}
                testID="login-submit"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.primaryBtnText}>{t("auth.signIn")}</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => { setResetMode(true); setError(""); }}
                style={s.forgotBtn}
              >
                <Text style={s.forgotText}>{t("auth.forgotPassword")}</Text>
              </Pressable>
            </>
          )}
        </View>

        {!resetMode && (
          <>
            <View style={s.footer}>
              <Text style={s.footerText}>{t("auth.noAccount")}</Text>
              <Link href="/(auth)/register" asChild>
                <Pressable>
                  <Text style={s.linkText}>{t("auth.createAccount")}</Text>
                </Pressable>
              </Link>
            </View>

            <Pressable onPress={() => router.back()} style={s.skipBtn}>
              <Text style={s.skipText}>{t("auth.continueAsGuest")}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: PathB.surface },
  scroll: { flexGrow: 1, padding: 24 },
  header: { alignItems: "center", marginTop: 32, marginBottom: 32, gap: 8 },
  brandMark: { width: 56, height: 56, borderRadius: 12 },
  title: {
    fontSize: 28,
    color: PathB.ink,
    fontFamily: "Lora_700Bold",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: HV2.inkMutedText,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
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
    color: HV2.inkMutedText,
    fontFamily: "Inter_500Medium",
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: PathB.surfaceCard,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: PathB.ink,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: SWEEP_LIGHT.border,
  },
  passwordRow: { position: "relative" as const },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: "absolute" as const,
    right: 14,
    top: 16,
  },
  primaryBtn: {
    backgroundColor: PathB.coral,
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
  footerText: { color: HV2.inkMutedText, fontSize: 14, fontFamily: "Inter_400Regular" },
  linkText: { color: PathB.ink, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  skipBtn: { alignItems: "center" as const, marginTop: 16 },
  skipText: { color: HV2.inkMutedText, fontSize: 13, fontFamily: "Inter_400Regular" },
  forgotBtn: { alignItems: "center" as const, marginTop: 12 },
  forgotText: { color: HV2.inkMutedText, fontSize: 13, fontFamily: "Inter_500Medium" },
  resetInfo: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: SWEEP_LIGHT.backgroundSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  resetInfoText: {
    color: HV2.inkMutedText,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
});
