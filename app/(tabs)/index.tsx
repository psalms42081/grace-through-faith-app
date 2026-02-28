import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";

const DAILY_VERSES = [
  { text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", reference: "John 3:16" },
  { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding.", reference: "Proverbs 3:5" },
  { text: "I can do all things through Christ which strengtheneth me.", reference: "Philippians 4:13" },
  { text: "Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest.", reference: "Joshua 1:9" },
  { text: "But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.", reference: "Isaiah 40:31" },
  { text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.", reference: "Romans 8:28" },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTodaysVerse() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

interface Plan {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  theme: string | null;
  difficultyLevel: string | null;
  estimatedMinutesPerDay: number | null;
}

interface TodayResponse {
  today: { dayNumber: number; title: string; passageLabel: string | null } | null;
  enrollment?: { planId: string };
  completedCount?: number;
  totalDays?: number;
  planComplete?: boolean;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const greeting = useMemo(() => getGreeting(), []);
  const verse = useMemo(() => getTodaysVerse(), []);

  const { data: todayData } = useQuery<TodayResponse>({
    queryKey: ["/api/devotionals/today?userId=guest"],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/devotionals/plans"],
  });

  const hasActivePlan = todayData?.today != null;
  const planComplete = todayData?.planComplete;
  const progress = todayData?.completedCount ?? 0;
  const total = todayData?.totalDays ?? 1;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {greeting}
          </Text>
          <Text style={[styles.appName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Scripture Study
          </Text>
        </View>
      </View>

      <View style={[styles.verseCard, { backgroundColor: theme.primary }]}>
        <View style={styles.verseBadge}>
          <Ionicons name="sunny" size={12} color={Colors.light.accent} />
          <Text style={[styles.verseBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
            Verse of the Day
          </Text>
        </View>
        <Text style={[styles.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
          "{verse.text}"
        </Text>
        <View style={styles.verseFooter}>
          <Text style={[styles.verseRef, { fontFamily: "Lora_600SemiBold" }]}>
            — {verse.reference}
          </Text>
          <Text style={[styles.verseTrans, { fontFamily: "Inter_400Regular" }]}>
            KJV
          </Text>
        </View>
      </View>

      <View style={[styles.devotionalBanner, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <View style={styles.devotionalLeft}>
          <View style={[styles.devotionalIcon, { backgroundColor: theme.accent + "22" }]}>
            <Ionicons name="flame" size={22} color={theme.accent} />
          </View>
          <View style={styles.devotionalTextBlock}>
            <Text style={[styles.devotionalLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Daily Devotional
            </Text>
            {hasActivePlan ? (
              <>
                <Text style={[styles.devotionalTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  Day {todayData!.today!.dayNumber}: {todayData!.today!.title}
                </Text>
                <Text style={[styles.devotionalSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {progress}/{total} days completed
                </Text>
              </>
            ) : planComplete ? (
              <>
                <Text style={[styles.devotionalTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  Plan Complete
                </Text>
                <Text style={[styles.devotionalSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Start a new plan
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.devotionalTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  No active plan
                </Text>
                <Text style={[styles.devotionalSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Enroll in a plan to begin
                </Text>
              </>
            )}
          </View>
        </View>
        <Pressable
          style={[styles.enrollBtn, { backgroundColor: theme.accent }]}
          hitSlop={8}
          onPress={() => {
            if (hasActivePlan) {
              router.push("/devotional-day");
            } else {
              router.push("/devotionals");
            }
          }}
        >
          <Text style={[styles.enrollBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {hasActivePlan ? "Continue" : "Browse Plans"}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
        Quick Access
      </Text>
      <View style={styles.quickGrid}>
        {[
          { icon: "book-outline" as const, label: "Continue Reading", subtitle: "Pick up where you left off", onPress: () => router.push("/(tabs)/read") },
          { icon: "search-outline" as const, label: "Search Scripture", subtitle: "Find passages", onPress: () => router.push("/(tabs)/search") },
          { icon: "compass-outline" as const, label: "Explore Maps", subtitle: "Places & events", onPress: () => router.push("/(tabs)/explore") },
          { icon: "school-outline" as const, label: "Study Tools", subtitle: "Word & context", onPress: () => router.push("/(tabs)/study") },
        ].map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.quickCard,
              { backgroundColor: theme.backgroundCard, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: theme.accent + "18" }]}>
              <Ionicons name={action.icon} size={22} color={theme.accent} />
            </View>
            <Text style={[styles.quickLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {action.label}
            </Text>
            <Text style={[styles.quickSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {action.subtitle}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
        Featured Plans
      </Text>
      {plans && plans.length > 0 ? (
        <View style={styles.plansGrid}>
          {plans.map((plan) => (
            <Pressable
              key={plan.id}
              onPress={() => router.push("/devotionals")}
              style={({ pressed }) => [
                styles.planPreview,
                { backgroundColor: theme.backgroundCard, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.planPreviewIcon, { backgroundColor: theme.accent + "18" }]}>
                <Ionicons name="book-outline" size={20} color={theme.accent} />
              </View>
              <Text style={[styles.planPreviewTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]} numberOfLines={1}>
                {plan.title}
              </Text>
              <Text style={[styles.planPreviewMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {plan.totalDays} days
                {plan.estimatedMinutesPerDay ? ` · ~${plan.estimatedMinutesPerDay} min` : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={[styles.plansEmpty, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Ionicons name="calendar-outline" size={32} color={theme.textMuted} />
          <Text style={[styles.plansEmptyTitle, { color: theme.text, fontFamily: "Lora_500Medium" }]}>
            Loading plans...
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: { fontSize: 13, letterSpacing: 0.3, marginBottom: 2 },
  appName: { fontSize: 26, letterSpacing: 0.2 },
  verseCard: {
    borderRadius: 18,
    padding: 22,
    marginBottom: 16,
  },
  verseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 14,
  },
  verseBadgeText: {
    color: "#C9933A",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  verseText: {
    color: "#EDE5D5",
    fontSize: 17,
    lineHeight: 28,
    marginBottom: 16,
  },
  verseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verseRef: { color: "#C9933A", fontSize: 14 },
  verseTrans: { color: "rgba(237,229,213,0.5)", fontSize: 12 },
  devotionalBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  devotionalLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  devotionalIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  devotionalTextBlock: { flex: 1 },
  devotionalLabel: { fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 },
  devotionalTitle: { fontSize: 15, marginBottom: 1 },
  devotionalSub: { fontSize: 12 },
  enrollBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  enrollBtnText: { color: "#fff", fontSize: 13 },
  sectionTitle: { fontSize: 18, marginBottom: 14 },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  quickCard: {
    width: "47%",
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  quickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  quickLabel: { fontSize: 14 },
  quickSub: { fontSize: 11 },
  plansGrid: { gap: 12 },
  planPreview: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  planPreviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  planPreviewTitle: { flex: 1, fontSize: 15 },
  planPreviewMeta: { fontSize: 12 },
  plansEmpty: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  plansEmptyTitle: { fontSize: 16, marginTop: 4 },
});
