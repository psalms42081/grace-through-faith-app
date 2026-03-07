import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useSabbath } from "@/lib/sabbath";
import { useTheme } from "@/hooks/useTheme";
import StudyDepthSelector, { DepthBadge } from "@/components/StudyDepthSelector";
import { useStudyDepth } from "@/contexts/StudyDepthContext";

const THEOLOGICAL_FRAMES = [
  {
    theme: "Creation",
    text: "God blessed the seventh day and sanctified it, because in it He rested from all His work. The Sabbath is woven into the very fabric of creation \u2014 a gift before sin entered. It declares that our worth comes not from what we produce, but from Whose we are.",
    ref: "Genesis 2:3",
  },
  {
    theme: "Redemption",
    text: "The Sabbath points to the finished work of Christ. As God rested from creation, so we rest in the completed salvation He provides. Every Sabbath is a rehearsal of the eternal rest that awaits.",
    ref: "Hebrews 4:9-10",
  },
  {
    theme: "Identity",
    text: "Sabbath-keeping is an act of identity. It declares to the watching universe: we belong to the Creator. It is the seal of God, the sign of the covenant between Him and His people.",
    ref: "Ezekiel 20:12",
  },
  {
    theme: "Mission",
    text: "The Sabbath is not merely an absence of work \u2014 it is a presence of purpose. It reorients us toward God\u2019s mission: healing, fellowship, worship, and preparation for eternity.",
    ref: "Luke 4:16",
  },
];

const PROMPTS = [
  "What am I grateful for this week?",
  "Where did I see God working in my life?",
  "What do I need to surrender to God?",
];

const WORSHIP_PATHWAYS = [
  { icon: "book" as const, label: "Sabbath School", route: "/devotionals" },
  { icon: "school" as const, label: "Study Paths", route: "/study-paths" },
  { icon: "git-network" as const, label: "Great Controversy", route: "/great-controversy" },
  { icon: "videocam" as const, label: "Live Streams", route: "/" },
  { icon: "location" as const, label: "Church Connect", route: "/church-connect" },
  { icon: "heart" as const, label: "Family Altar", route: "/prayer-journal" },
];

interface ReflectionData {
  id: string;
  userId: string;
  date: string;
  prompt: string;
  response: string;
  createdAt: string;
}

export default function SabbathExperienceScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { closingReflectionActive } = useSabbath();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const todayStr = new Date().toISOString().split("T")[0];

  const frameIndex = Math.floor(Date.now() / (7 * 86400000)) % 4;
  const frame = THEOLOGICAL_FRAMES[frameIndex];

  const [responses, setResponses] = useState<Record<string, string>>({});
  const [closingResponse, setClosingResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingClosing, setSavingClosing] = useState(false);

  const queryKey = [`/api/sabbath/reflections?userId=${userId}&date=${todayStr}`];

  const { data: existingReflections, isLoading } = useQuery<ReflectionData[]>({
    queryKey,
  });

  useEffect(() => {
    if (existingReflections && existingReflections.length > 0) {
      const loaded: Record<string, string> = {};
      for (const r of existingReflections) {
        if (r.prompt === "closing") {
          setClosingResponse(r.response);
        } else {
          loaded[r.prompt] = r.response;
        }
      }
      setResponses(loaded);
    }
  }, [existingReflections]);

  const saveReflectionMutation = useMutation({
    mutationFn: async (payload: { prompt: string; response: string }) => {
      await apiRequest("POST", "/api/sabbath/reflections", {
        userId,
        date: todayStr,
        prompt: payload.prompt,
        response: payload.response,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleSaveReflections = async () => {
    setSaving(true);
    const promises = PROMPTS.filter((p) => responses[p]?.trim()).map((p) =>
      saveReflectionMutation.mutateAsync({ prompt: p, response: responses[p].trim() })
    );
    try {
      await Promise.all(promises);
    } catch {}
    setSaving(false);
  };

  const handleSaveClosing = async () => {
    if (!closingResponse.trim()) return;
    setSavingClosing(true);
    try {
      await saveReflectionMutation.mutateAsync({
        prompt: "closing",
        response: closingResponse.trim(),
      });
    } catch {}
    setSavingClosing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Sabbath Experience
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: bottomPad + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>
          Sacred Time
        </Text>
        <View
          style={[
            styles.framingCard,
            {
              borderColor: theme.accent + "25",
              backgroundColor: theme.accent + "08",
            },
          ]}
        >
          <Text style={[styles.themeLabel, { color: theme.accent }]}>
            {frame.theme}
          </Text>
          <Text style={[styles.framingText, { color: theme.text }]}>
            {frame.text}
          </Text>
          <Text style={[styles.framingRef, { color: theme.textMuted }]}>
            {frame.ref}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 32 }]}>
          Sabbath Reflections
        </Text>
        {PROMPTS.map((prompt) => (
          <View key={prompt} style={styles.promptBlock}>
            <Text style={[styles.promptLabel, { color: theme.textSecondary }]}>
              {prompt}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: theme.border,
                  color: theme.text,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              placeholder="Write your reflection..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={responses[prompt] || ""}
              onChangeText={(text) =>
                setResponses((prev) => ({ ...prev, [prompt]: text }))
              }
            />
          </View>
        ))}
        <Pressable
          onPress={handleSaveReflections}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: theme.accent,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Reflections</Text>
          )}
        </Pressable>

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 32 }]}>
          Worship Pathways
        </Text>
        <StudyDepthSelector compact />
        <View style={[styles.pathwaysCard, { backgroundColor: theme.backgroundCard }]}>
          {WORSHIP_PATHWAYS.map((pathway, i) => (
            <Pressable
              key={pathway.label}
              onPress={() => router.push(pathway.route as any)}
              style={({ pressed }) => [
                styles.pathwayRow,
                { opacity: pressed ? 0.7 : 1 },
                i < WORSHIP_PATHWAYS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.pathwayIcon,
                  { backgroundColor: theme.accent + "1F" },
                ]}
              >
                <Ionicons name={pathway.icon} size={20} color={theme.accent} />
              </View>
              <Text style={[styles.pathwayLabel, { color: theme.text }]}>
                {pathway.label}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>

        {closingReflectionActive && (
          <>
            <Text
              style={[styles.sectionTitle, { color: theme.accent, marginTop: 32 }]}
            >
              Sabbath Farewell
            </Text>
            <View
              style={[
                styles.closingCard,
                {
                  borderColor: theme.accent + "30",
                  backgroundColor: theme.accent + "0A",
                },
              ]}
            >
              <Text style={[styles.closingPrompt, { color: theme.textSecondary }]}>
                How did you encounter God this Sabbath?
              </Text>
              <TextInput
                style={[
                  styles.closingInput,
                  {
                    backgroundColor: theme.backgroundCard,
                    borderColor: theme.accent + "40",
                    color: theme.text,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
                placeholder="Share your experience..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={closingResponse}
                onChangeText={setClosingResponse}
              />
              <Pressable
                onPress={handleSaveClosing}
                disabled={savingClosing}
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    backgroundColor: theme.accent,
                    opacity: pressed ? 0.85 : 1,
                    marginTop: 8,
                  },
                ]}
              >
                {savingClosing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontFamily: "Lora_700Bold",
  },
  scrollView: { flex: 1 },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "Lora_700Bold",
    marginBottom: 14,
  },
  framingCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  themeLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  framingText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Lora_400Regular_Italic",
  },
  framingRef: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  promptBlock: {
    marginBottom: 16,
  },
  promptLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 80,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  pathwaysCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  pathwayRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  pathwayIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pathwayLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  closingCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  closingPrompt: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  closingInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
  },
});
