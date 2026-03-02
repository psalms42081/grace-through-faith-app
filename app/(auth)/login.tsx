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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
          <Ionicons name="book" size={48} color="#C9933A" />
          <Text style={s.title}>Welcome Back</Text>
          <Text style={s.subtitle}>Sign in to sync your Bible study progress</Text>
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.form}>
          <Text style={s.label}>Email</Text>
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

          <Text style={s.label}>Password</Text>
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
              <Text style={s.primaryBtnText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account?</Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={s.linkText}>Create Account</Text>
            </Pressable>
          </Link>
        </View>

        <Pressable onPress={() => router.back()} style={s.skipBtn}>
          <Text style={s.skipText}>Continue as Guest</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050507" },
  scroll: { flexGrow: 1, padding: 24 },
  header: { alignItems: "center", marginTop: 32, marginBottom: 32, gap: 8 },
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
  skipBtn: { alignItems: "center" as const, marginTop: 16 },
  skipText: { color: "#666", fontSize: 13, fontFamily: "Inter_400Regular" },
});
