import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, Stack } from "expo-router";
import { safeGoBack } from "@/lib/safe-back";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest, queryClient } from "@/lib/query-client";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";

const DURATIONS = [3, 5, 7, 10, 14] as const;
const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

const DIFFICULTY_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  beginner: { label: "Beginner", desc: "Accessible, well-known passages", color: "#2E7D32" },
  intermediate: { label: "Intermediate", desc: "Balanced depth and accessibility", color: "#E65100" },
  advanced: { label: "Advanced", desc: "Deeper theological exploration", color: "#6A1B9A" },
};

interface GeneratedDay {
  id: string;
  dayNumber: number;
  title: string;
  passageLabel: string | null;
  contextNote: string | null;
}

interface GeneratedPlanResult {
  plan: {
    id: string;
    title: string;
    description: string | null;
    totalDays: number;
    theme: string | null;
    targetGoals: string[] | null;
    estimatedMinutesPerDay: number | null;
    difficultyLevel: string | null;
  };
  days: GeneratedDay[];
}

export default function CreatePlanScreen() {
  const { theme } = useTheme();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();

  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState<number>(7);
  const [difficulty, setDifficulty] = useState<string>("intermediate");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedPlanResult | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      Alert.alert("Topic Required", "Please enter a topic for your reading plan.");
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const res = await apiRequest("POST", "/api/reading-plans/generate", {
        topic: topic.trim(),
        durationDays: duration,
        difficulty,
        userId,
      });
      const data = await (res as any).json();
      if (data.error) {
        Alert.alert("Error", data.error);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      Alert.alert("Error", "Failed to generate plan. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleEnroll = async () => {
    if (!result) return;
    setEnrolling(true);
    try {
      await apiRequest("POST", "/api/devotionals/enroll", {
        userId,
        planId: result.plan.id,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/devotionals/today?userId=${userId}`] });
      safeGoBack(router);
      setTimeout(() => {
        router.push(`/devotional-day?planId=${result.plan.id}`);
      }, 300);
    } catch {
      Alert.alert("Error", "Failed to enroll in plan.");
      setEnrolling(false);
    }
  };

  if (result) {
    const plan = result.plan;
    const days = result.days;
    const diffInfo = DIFFICULTY_LABELS[plan.difficultyLevel || "intermediate"];

    return (
      <>
        <Stack.Screen options={{ title: "Plan Preview" }} />
        <ScrollView
          style={[styles.container, { backgroundColor: theme.background }]}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.previewBanner, { backgroundColor: theme.primary }]}>
            <View style={[styles.aiBadge, { backgroundColor: theme.accent }]}>
              <Ionicons name="sparkles" size={14} color="#fff" />
              <Text style={[styles.aiBadgeText, { fontFamily: "Inter_700Bold" }]}>AI Generated</Text>
            </View>
            <Text style={[styles.previewTitle, { fontFamily: "Lora_700Bold" }]}>
              {plan.title}
            </Text>
            <View style={styles.previewMeta}>
              <View style={styles.metaChip}>
                <Ionicons name="calendar-outline" size={13} color="rgba(237,229,213,0.7)" />
                <Text style={[styles.metaChipText, { fontFamily: "Inter_500Medium" }]}>{plan.totalDays} days</Text>
              </View>
              {plan.estimatedMinutesPerDay && (
                <View style={styles.metaChip}>
                  <Ionicons name="time-outline" size={13} color="rgba(237,229,213,0.7)" />
                  <Text style={[styles.metaChipText, { fontFamily: "Inter_500Medium" }]}>~{plan.estimatedMinutesPerDay} min/day</Text>
                </View>
              )}
            </View>
          </View>

          {plan.description && (
            <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Text style={[styles.cardBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {plan.description}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {plan.theme && (
              <View style={[styles.tagBadge, { backgroundColor: theme.accent + "18" }]}>
                <Text style={[styles.tagText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>{plan.theme}</Text>
              </View>
            )}
            {diffInfo && (
              <View style={[styles.tagBadge, { backgroundColor: diffInfo.color + "18" }]}>
                <Text style={[styles.tagText, { color: diffInfo.color, fontFamily: "Inter_600SemiBold" }]}>{diffInfo.label}</Text>
              </View>
            )}
          </View>

          {plan.targetGoals && plan.targetGoals.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="flag-outline" size={16} color={theme.accent} />
                <Text style={[styles.cardLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>Goals</Text>
              </View>
              {plan.targetGoals.map((goal, i) => (
                <View key={i} style={styles.goalRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={theme.success} />
                  <Text style={[styles.goalText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>{goal}</Text>
                </View>
              ))}
            </View>
          )}

          {days.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="list-outline" size={16} color={theme.bookmarkBlue} />
                <Text style={[styles.cardLabel, { color: theme.bookmarkBlue, fontFamily: "Inter_600SemiBold" }]}>Day-by-Day Outline</Text>
              </View>
              {days.map((day) => (
                <View key={day.id} style={[styles.dayRow, { borderColor: theme.border }]}>
                  <View style={[styles.dayNum, { backgroundColor: theme.accent + "18" }]}>
                    <Text style={[styles.dayNumText, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>{day.dayNumber}</Text>
                  </View>
                  <View style={styles.dayInfo}>
                    <Text style={[styles.dayTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>{day.title}</Text>
                    {day.passageLabel && (
                      <Text style={[styles.dayPassage, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{day.passageLabel}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
            <Pressable
              onPress={() => setResult(null)}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="refresh" size={18} color={theme.textSecondary} />
              <Text style={[styles.secondaryBtnText, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>Regenerate</Text>
            </Pressable>
            <Pressable
              onPress={handleEnroll}
              disabled={enrolling}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.accent, opacity: pressed || enrolling ? 0.7 : 1, flex: 1 },
              ]}
            >
              {enrolling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={[styles.primaryBtnText, { fontFamily: "Inter_700Bold" }]}>Start Plan</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Create Reading Plan" }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.heroBanner, { backgroundColor: theme.primary }]}>
          <Ionicons name="sparkles" size={32} color={Colors.light.accent} />
          <Text style={[styles.heroTitle, { fontFamily: "Lora_700Bold" }]}>
            AI Reading Plan
          </Text>
          <Text style={[styles.heroSub, { fontFamily: "Inter_400Regular" }]}>
            Enter a topic and let AI create a personalized Bible reading plan just for you.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Text style={[styles.fieldLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Topic</Text>
          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder="e.g., Forgiveness, Faith in hard times, God's promises..."
            placeholderTextColor={theme.textMuted}
            style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
            maxLength={200}
            returnKeyType="done"
          />
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Text style={[styles.fieldLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Duration</Text>
          <View style={styles.chipRow}>
            {DURATIONS.map((d) => {
              const selected = duration === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDuration(d)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.accent : theme.background,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: selected ? "#fff" : theme.textSecondary,
                        fontFamily: selected ? "Inter_700Bold" : "Inter_500Medium",
                      },
                    ]}
                  >
                    {d} days
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Text style={[styles.fieldLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Difficulty</Text>
          <View style={{ gap: 8 }}>
            {DIFFICULTIES.map((d) => {
              const selected = difficulty === d;
              const info = DIFFICULTY_LABELS[d];
              return (
                <Pressable
                  key={d}
                  onPress={() => setDifficulty(d)}
                  style={[
                    styles.diffOption,
                    {
                      backgroundColor: selected ? info.color + "12" : theme.background,
                      borderColor: selected ? info.color : theme.border,
                    },
                  ]}
                >
                  <View style={styles.diffRow}>
                    <View style={[styles.radioOuter, { borderColor: selected ? info.color : theme.textMuted }]}>
                      {selected && <View style={[styles.radioInner, { backgroundColor: info.color }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.diffLabel, { color: selected ? info.color : theme.text, fontFamily: "Inter_600SemiBold" }]}>
                        {info.label}
                      </Text>
                      <Text style={[styles.diffDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{info.desc}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={handleGenerate}
          disabled={generating || !topic.trim()}
          style={({ pressed }) => [
            styles.generateBtn,
            {
              backgroundColor: theme.accent,
              opacity: pressed || generating || !topic.trim() ? 0.6 : 1,
            },
          ]}
        >
          {generating ? (
            <View style={styles.genLoadingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={[styles.generateBtnText, { fontFamily: "Inter_600SemiBold" }]}>Generating your plan...</Text>
            </View>
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={[styles.generateBtnText, { fontFamily: "Inter_700Bold" }]}>Generate Plan</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 14 },
  heroBanner: {
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  heroTitle: { color: "#EDE5D5", fontSize: 20 },
  heroSub: { color: "rgba(237,229,213,0.65)", fontSize: 13, textAlign: "center", lineHeight: 20 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  fieldLabel: { fontSize: 14, marginBottom: -2 },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: { fontSize: 14 },
  diffOption: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
  },
  diffRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  diffLabel: { fontSize: 14 },
  diffDesc: { fontSize: 12, marginTop: 2 },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  generateBtnText: { color: "#fff", fontSize: 16 },
  genLoadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  previewBanner: {
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  aiBadgeText: { color: "#fff", fontSize: 11 },
  previewTitle: { color: "#EDE5D5", fontSize: 20, textAlign: "center" },
  previewMeta: { flexDirection: "row", gap: 16, marginTop: 4 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaChipText: { color: "rgba(237,229,213,0.7)", fontSize: 12 },
  tagBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontSize: 11, letterSpacing: 0.3 },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  cardLabel: { fontSize: 12, letterSpacing: 0.3 },
  cardBody: { fontSize: 14, lineHeight: 22 },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  goalText: { fontSize: 14, flex: 1 },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dayNum: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumText: { fontSize: 13 },
  dayInfo: { flex: 1, gap: 2 },
  dayTitle: { fontSize: 14 },
  dayPassage: { fontSize: 12 },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  secondaryBtnText: { fontSize: 14 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  primaryBtnText: { color: "#fff", fontSize: 16 },
});
