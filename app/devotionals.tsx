import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, Stack } from "expo-router";
import { safeGoBack } from "@/lib/safe-back";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import DevotionalOnboarding from "@/components/devotionals/DevotionalOnboarding";
import { getReminderSettings, setReminderEnabled, openAppSettings } from "@/lib/notifications";

const ONBOARDING_KEY = "@grace-through-faith/devotionals-onboarding-complete";

interface Plan {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  theme: string | null;
  category: string | null;
  targetGoals: string[] | null;
  difficultyLevel: string | null;
  estimatedMinutesPerDay: number | null;
  isPublished: boolean;
}

interface PlanDay {
  id: string;
  planId: string;
  dayNumber: number;
  title: string;
  passageLabel: string | null;
  contextNote: string | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#2E7D32",
  intermediate: "#E65100",
  advanced: "#6A1B9A",
};

export default function DevotionalsScreen() {
  const { theme, isDark } = useTheme();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/devotionals/plans?traditionKey=all"],
  });

  const { data: planDays } = useQuery<PlanDay[]>({
    queryKey: [`/api/devotionals/plans/${selectedPlan?.id}/days`],
    enabled: !!selectedPlan,
  });

  const onboardingStorageKey = `${ONBOARDING_KEY}:${userId || "guest"}`;
  useEffect(() => {
    AsyncStorage.getItem(onboardingStorageKey)
      .then(v => setShowOnboarding(v !== "true"))
      .catch(() => setShowOnboarding(true));
  }, [onboardingStorageKey]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const promptForReminders = () => {
    if (Platform.OS === "web") return;
    getReminderSettings().then(({ enabled }) => {
      if (enabled) return;
      Alert.alert(
        "Daily Reminders",
        "Would you like a daily reminder so you don't miss a day?",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Enable",
            onPress: async () => {
              const result = await setReminderEnabled(true);
              if (result.permissionDenied && !result.canAskAgain) {
                Alert.alert(
                  "Notifications Blocked",
                  "To enable reminders, allow notifications in your device settings.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Open Settings", onPress: openAppSettings },
                  ]
                );
              }
            },
          },
        ]
      );
    });
  };

  const handleOnboardingComplete = async (planId: string) => {
    await AsyncStorage.setItem(onboardingStorageKey, "true").catch(() => {});
    try {
      await apiRequest("POST", "/api/devotionals/enroll", {
        userId,
        planId,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/devotionals/today?userId=${userId}`] });
      setTimeout(() => {
        setShowOnboarding(false);
        router.push(`/devotional-day?planId=${planId}`);
        setTimeout(promptForReminders, 1000);
      }, 200);
    } catch {
      setShowOnboarding(false);
    }
  };

  const handleOnboardingSkip = async () => {
    await AsyncStorage.setItem(onboardingStorageKey, "true").catch(() => {});
    setShowOnboarding(false);
  };

  const handleEnroll = async (planId: string) => {
    setEnrolling(true);
    try {
      await apiRequest("POST", "/api/devotionals/enroll", {
        userId,
        planId,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/devotionals/today?userId=${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/devotionals/today?userId=${userId}&planId=${planId}`] });
      safeGoBack(router);
      setTimeout(() => {
        router.push(`/devotional-day?planId=${planId}`);
        setTimeout(promptForReminders, 1000);
      }, 300);
    } catch {
      setEnrolling(false);
    }
  };

  if (selectedPlan) {
    return (
      <>
        <Stack.Screen options={{ title: selectedPlan.title }} />
        <ScrollView
          style={[styles.container, { backgroundColor: theme.background }]}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => setSelectedPlan(null)} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              All Plans
            </Text>
          </Pressable>

          <View style={[styles.planHeader, { backgroundColor: theme.primary }]}>
            <Ionicons name="book" size={32} color={Colors.light.accent} />
            <Text style={[styles.planHeaderTitle, { fontFamily: "Lora_700Bold" }]}>
              {selectedPlan.title}
            </Text>
            <View style={styles.planMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color="rgba(237,229,213,0.65)" />
                <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>
                  {selectedPlan.totalDays} days
                </Text>
              </View>
              {selectedPlan.estimatedMinutesPerDay && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="rgba(237,229,213,0.65)" />
                  <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>
                    ~{selectedPlan.estimatedMinutesPerDay} min/day
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            {selectedPlan.theme && (
              <View style={[styles.badge, { backgroundColor: theme.accent + "18" }]}>
                <Text style={[styles.badgeText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  {selectedPlan.theme}
                </Text>
              </View>
            )}
            {selectedPlan.difficultyLevel && (
              <View style={[styles.badge, { backgroundColor: (DIFFICULTY_COLORS[selectedPlan.difficultyLevel] || theme.textMuted) + "18" }]}>
                <Text style={[styles.badgeText, { color: DIFFICULTY_COLORS[selectedPlan.difficultyLevel] || theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
                  {selectedPlan.difficultyLevel}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <Text style={[styles.cardBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {selectedPlan.description}
            </Text>
          </View>

          {selectedPlan.targetGoals && selectedPlan.targetGoals.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="flag-outline" size={16} color={theme.accent} />
                <Text style={[styles.cardLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  Goals
                </Text>
              </View>
              {selectedPlan.targetGoals.map((goal, i) => (
                <View key={i} style={styles.goalRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={theme.success} />
                  <Text style={[styles.goalText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                    {goal}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {planDays && planDays.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="list-outline" size={16} color={theme.bookmarkBlue} />
                <Text style={[styles.cardLabel, { color: theme.bookmarkBlue, fontFamily: "Inter_600SemiBold" }]}>
                  Day-by-Day Outline
                </Text>
              </View>
              {planDays.map((day) => (
                <View key={day.id} style={[styles.dayRow, { borderColor: theme.border }]}>
                  <View style={[styles.dayNum, { backgroundColor: theme.accent + "18" }]}>
                    <Text style={[styles.dayNumText, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
                      {day.dayNumber}
                    </Text>
                  </View>
                  <View style={styles.dayInfo}>
                    <Text style={[styles.dayTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                      {day.title}
                    </Text>
                    {day.passageLabel && (
                      <Text style={[styles.dayPassage, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {day.passageLabel}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          <Pressable
            onPress={() => handleEnroll(selectedPlan.id)}
            disabled={enrolling}
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: theme.accent, opacity: pressed || enrolling ? 0.7 : 1 },
            ]}
          >
            {enrolling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={[styles.startBtnText, { fontFamily: "Inter_700Bold" }]}>
                  Start Plan
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </>
    );
  }

  if (showOnboarding && plans && plans.length > 0) {
    return (
      <>
        <Stack.Screen options={{ title: "Get Started" }} />
        <ScrollView
          style={[styles.container, { backgroundColor: theme.background }]}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <DevotionalOnboarding
            plans={plans}
            theme={theme}
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Devotional Plans" }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.introCard, { backgroundColor: theme.primary }]}>
          <Ionicons name="flame" size={32} color={Colors.light.accent} />
          <Text style={[styles.introTitle, { fontFamily: "Lora_600SemiBold" }]}>
            Guided Reading Plans
          </Text>
          <Text style={[styles.introSub, { fontFamily: "Inter_400Regular" }]}>
            Multi-day plans with scripture, reflection, and prayer prompts to deepen your study.
          </Text>
        </View>


        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 8 }}>
              Loading devotional plans...
            </Text>
          </View>
        )}

        {!isLoading && plans && plans.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 32, paddingHorizontal: 24 }}>
            <Ionicons name="book-outline" size={40} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 15, marginTop: 12, textAlign: "center" }}>
              No devotional plans available yet
            </Text>
          </View>
        )}

        {plans && plans.map((plan) => (
          <Pressable
            key={plan.id}
            onPress={() => setSelectedPlan(plan)}
            style={({ pressed }) => [
              styles.planCard,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={styles.planCardTop}>
              <View style={[styles.planIcon, { backgroundColor: theme.accent + "18" }]}>
                <Ionicons name="book-outline" size={22} color={theme.accent} />
              </View>
              <View style={styles.planCardInfo}>
                <Text style={[styles.planCardTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  {plan.title}
                </Text>
                <Text style={[styles.planCardDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                  {plan.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </View>
            <View style={[styles.planCardFooter, { borderTopColor: theme.border }]}>
              <View style={styles.footerItem}>
                <Ionicons name="calendar-outline" size={12} color={theme.textMuted} />
                <Text style={[styles.footerText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                  {plan.totalDays} days
                </Text>
              </View>
              {plan.estimatedMinutesPerDay && (
                <View style={styles.footerItem}>
                  <Ionicons name="time-outline" size={12} color={theme.textMuted} />
                  <Text style={[styles.footerText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                    ~{plan.estimatedMinutesPerDay} min
                  </Text>
                </View>
              )}
              {plan.difficultyLevel && (
                <View style={[styles.diffBadge, { backgroundColor: (DIFFICULTY_COLORS[plan.difficultyLevel] || theme.textMuted) + "18" }]}>
                  <Text style={[styles.diffText, { color: DIFFICULTY_COLORS[plan.difficultyLevel] || theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
                    {plan.difficultyLevel}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 14 },
  introCard: {
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  introTitle: { color: "#EDE5D5", fontSize: 18 },
  introSub: { color: "rgba(237,229,213,0.65)", fontSize: 13, textAlign: "center", lineHeight: 20 },
  loadingBox: { alignItems: "center", paddingVertical: 30 },
  planCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  planCardTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  planCardInfo: { flex: 1, gap: 4 },
  planCardTitle: { fontSize: 16 },
  planCardDesc: { fontSize: 12, lineHeight: 18 },
  planCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 11 },
  diffBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  diffText: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  planHeader: {
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  planHeaderTitle: { color: "#EDE5D5", fontSize: 20, textAlign: "center" },
  planMeta: { flexDirection: "row", gap: 16, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { color: "rgba(237,229,213,0.65)", fontSize: 12 },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 11, letterSpacing: 0.3 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
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
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  startBtnText: { color: "#fff", fontSize: 16 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  backText: { fontSize: 14 },
  createPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  createPlanIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  createPlanInfo: { flex: 1, gap: 2 },
  createPlanTitle: { fontSize: 15 },
  createPlanSub: { fontSize: 12 },
});
