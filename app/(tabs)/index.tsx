import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  Dimensions,
  Image,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { KidsColors } from "@/constants/colors";
import { useKidsMode } from "@/context/KidsModeContext";
import { getApiUrl } from "@/lib/query-client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DAILY_VERSES = [
  { text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", reference: "John 3:16" },
  { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding.", reference: "Proverbs 3:5" },
  { text: "I can do all things through Christ which strengtheneth me.", reference: "Philippians 4:13" },
  { text: "Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest.", reference: "Joshua 1:9" },
  { text: "But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.", reference: "Isaiah 40:31" },
  { text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.", reference: "Romans 8:28" },
];

const STUDY_LAYERS = [
  { icon: "book-outline" as const, num: "1", title: "Text", desc: "Read the Scripture", detail: "Read the passage in multiple translations (KJV, ASV, WEB) to see how different scholars have rendered the original languages." },
  { icon: "search-outline" as const, num: "2", title: "Context", desc: "Understand the setting", detail: "Explore the historical and cultural background \u2014 who wrote it, when, to whom, and why. See the passage in its full biblical context." },
  { icon: "library-outline" as const, num: "3", title: "Historic Voices", desc: "Learn from the faithful", detail: "Hear from trusted commentators throughout church history, including Ellen White\u2019s writings, to deepen your understanding." },
  { icon: "heart-outline" as const, num: "4", title: "Application", desc: "Live the Word", detail: "Bring it home \u2014 practical reflection questions and journaling prompts to apply what you\u2019ve learned to your daily walk with God." },
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

function GoldDivider({ theme }: { theme: typeof Colors.dark }) {
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: theme.accent + "30" }]} />
      <Ionicons name="diamond-outline" size={10} color={theme.accent + "60"} />
      <View style={[styles.dividerLine, { backgroundColor: theme.accent + "30" }]} />
    </View>
  );
}

const KIDS_VERSES = [
  { text: "God is love.", reference: "1 John 4:8" },
  { text: "Be kind to one another.", reference: "Ephesians 4:32" },
  { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { text: "I can do all things through Christ which strengtheneth me.", reference: "Philippians 4:13" },
  { text: "This is the day which the Lord hath made; we will rejoice and be glad in it.", reference: "Psalm 118:24" },
  { text: "The Lord is my light and my salvation; whom shall I fear?", reference: "Psalm 27:1" },
  { text: "Be strong and of a good courage.", reference: "Joshua 1:9" },
];

function useImageBaseUrl() {
  return useMemo(() => {
    try {
      return getApiUrl().replace(/\/$/, "");
    } catch {
      return "";
    }
  }, []);
}

function KidsHomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? KidsColors.dark : KidsColors.light;
  const insets = useSafeAreaInsets();
  const { ageGroup, exitKidsMode, pin } = useKidsMode();
  const baseUrl = useImageBaseUrl();
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitPin, setExitPin] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const verse = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return KIDS_VERSES[dayOfYear % KIDS_VERSES.length];
  }, []);

  const { data: dailyStory } = useQuery<{ id: string; title: string; scriptureRef: string | null; estimatedMinutes: number; imageUrl: string | null }>({
    queryKey: [`/api/kids/daily?ageGroup=${ageGroup}`],
  });

  const { data: streak } = useQuery<{ currentStreak: number; longestStreak: number }>({
    queryKey: ["/api/kids/streak/guest"],
  });

  const { data: progress } = useQuery<{ completed: boolean }[]>({
    queryKey: ["/api/kids/progress/guest"],
  });

  const completedCount = progress?.filter(p => p.completed).length ?? 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: bottomPad + 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={kidsStyles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {greeting}
            </Text>
            <Text style={[styles.appName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Kids Club
            </Text>
          </View>
          <Pressable
            onPress={() => {
              if (!pin) {
                exitKidsMode("");
              } else {
                setShowExitModal(true);
              }
            }}
            style={[kidsStyles.exitBtn, { backgroundColor: theme.textMuted + "20" }]}
            testID="exit-kids-mode"
          >
            <Ionicons name="log-out-outline" size={18} color={theme.textSecondary} />
            <Text style={[kidsStyles.exitBtnText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Exit
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={showExitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExitModal(false)}
      >
        <View style={kidsStyles.modalOverlay}>
          <View style={[kidsStyles.modalBox, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[kidsStyles.modalTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Exit Kids Mode
            </Text>
            <Text style={[kidsStyles.modalDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Enter your PIN to switch back
            </Text>
            <TextInput
              value={exitPin}
              onChangeText={setExitPin}
              placeholder="Enter PIN"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              style={[kidsStyles.modalInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
              testID="exit-pin-input"
            />
            <View style={kidsStyles.modalBtns}>
              <Pressable
                onPress={() => { setShowExitModal(false); setExitPin(""); }}
                style={[kidsStyles.modalCancelBtn, { borderColor: theme.border }]}
              >
                <Text style={[kidsStyles.modalCancelText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const ok = await exitKidsMode(exitPin);
                  if (ok) {
                    setShowExitModal(false);
                    setExitPin("");
                  } else {
                    if (Platform.OS === "web") {
                      window.alert("Incorrect PIN");
                    } else {
                      Alert.alert("Incorrect PIN", "Please try again.");
                    }
                  }
                }}
                style={[kidsStyles.modalConfirmBtn, { backgroundColor: theme.accent }]}
                testID="exit-confirm"
              >
                <Text style={[kidsStyles.modalConfirmText, { fontFamily: "Inter_600SemiBold" }]}>
                  Exit
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {baseUrl ? (
        <Image
          source={{ uri: `${baseUrl}/assets/images/app/kids-welcome.png` }}
          style={kidsStyles.welcomeImage}
          resizeMode="cover"
        />
      ) : null}

      <View style={[kidsStyles.verseCard, { backgroundColor: theme.accent }]}>
        <Ionicons name="sunny" size={20} color="rgba(255,255,255,0.7)" />
        <Text style={[kidsStyles.verseLabel, { fontFamily: "Inter_600SemiBold" }]}>Today's Verse</Text>
        <Text style={[kidsStyles.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
          "{verse.text}"
        </Text>
        <Text style={[kidsStyles.verseRef, { fontFamily: "Inter_600SemiBold" }]}>
          {verse.reference}
        </Text>
      </View>

      {streak && streak.currentStreak > 0 && (
        <View style={[kidsStyles.streakBanner, { backgroundColor: "#FF6B35" + "15", borderColor: "#FF6B35" + "30" }]}>
          <Ionicons name="flame" size={22} color="#FF6B35" />
          <Text style={[kidsStyles.streakText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {streak.currentStreak} day streak!
          </Text>
          <Ionicons name="flame" size={22} color="#FF6B35" />
        </View>
      )}

      <View style={kidsStyles.statsRow}>
        <View style={[kidsStyles.statBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Ionicons name="star" size={24} color={(theme as any).starGold || theme.accent} />
          <Text style={[kidsStyles.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {completedCount}
          </Text>
          <Text style={[kidsStyles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Stories Read
          </Text>
        </View>
        <View style={[kidsStyles.statBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Ionicons name="flame" size={24} color="#FF6B35" />
          <Text style={[kidsStyles.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {streak?.currentStreak ?? 0}
          </Text>
          <Text style={[kidsStyles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Day Streak
          </Text>
        </View>
      </View>

      {dailyStory && (
        <Pressable
          onPress={() => router.push(`/kids-story/${dailyStory.id}`)}
          style={[kidsStyles.dailyCard, { backgroundColor: theme.backgroundCard, borderColor: theme.accent + "40" }]}
          testID="daily-story"
        >
          {dailyStory.imageUrl && baseUrl ? (
            <Image
              source={{ uri: `${baseUrl}${dailyStory.imageUrl}` }}
              style={kidsStyles.dailyImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[kidsStyles.dailyIcon, { backgroundColor: theme.accent + "20" }]}>
              <Ionicons name="book" size={28} color={theme.accent} />
            </View>
          )}
          <View style={kidsStyles.dailyInfo}>
            <Text style={[kidsStyles.dailyLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              Today's Story
            </Text>
            <Text style={[kidsStyles.dailyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              {dailyStory.title}
            </Text>
            {dailyStory.scriptureRef && (
              <Text style={[kidsStyles.dailyRef, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {dailyStory.scriptureRef}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.accent} />
        </Pressable>
      )}

      <View style={kidsStyles.quickActions}>
        <Pressable
          onPress={() => router.push("/(tabs)/kids-stories")}
          style={[kidsStyles.actionCard, { backgroundColor: theme.accent }]}
          testID="browse-stories"
        >
          <Ionicons name="book-outline" size={28} color="#fff" />
          <Text style={[kidsStyles.actionTitle, { fontFamily: "Inter_600SemiBold" }]}>Browse Stories</Text>
          <Text style={[kidsStyles.actionDesc, { fontFamily: "Inter_400Regular" }]}>Read Bible stories</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(tabs)/kids-learn")}
          style={[kidsStyles.actionCard, { backgroundColor: (theme as any).purple || theme.accent }]}
          testID="take-quiz"
        >
          <Ionicons name="school-outline" size={28} color="#fff" />
          <Text style={[kidsStyles.actionTitle, { fontFamily: "Inter_600SemiBold" }]}>Learn</Text>
          <Text style={[kidsStyles.actionDesc, { fontFamily: "Inter_400Regular" }]}>Quizzes & verses</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const kidsStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exitBtnText: { fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  modalBox: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, marginBottom: 6 },
  modalDesc: { fontSize: 14, marginBottom: 18, textAlign: "center" },
  modalInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: 18,
  },
  modalBtns: { flexDirection: "row", gap: 10, width: "100%" },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15 },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalConfirmText: { color: "#fff", fontSize: 15 },
  welcomeImage: {
    width: "100%" as any,
    height: 140,
    borderRadius: 16,
    marginBottom: 16,
  },
  verseCard: {
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  verseLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  verseText: { color: "#fff", fontSize: 18, lineHeight: 26, textAlign: "center" },
  verseRef: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4 },
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  streakText: { fontSize: 15 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  statNum: { fontSize: 24 },
  statLabel: { fontSize: 11 },
  dailyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  dailyImage: { width: 60, height: 60, borderRadius: 14, marginRight: 14 },
  dailyIcon: { width: 60, height: 60, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 14 },
  dailyInfo: { flex: 1 },
  dailyLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  dailyTitle: { fontSize: 16, marginBottom: 2 },
  dailyRef: { fontSize: 12 },
  quickActions: { flexDirection: "row", gap: 10, marginBottom: 16 },
  actionCard: {
    flex: 1,
    padding: 18,
    borderRadius: 14,
    gap: 6,
  },
  actionTitle: { color: "#fff", fontSize: 15, marginTop: 4 },
  actionDesc: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
});

export default function HomeScreen() {
  const { isKidsMode } = useKidsMode();

  if (isKidsMode) {
    return <KidsHomeScreen />;
  }

  return <AdultHomeScreen />;
}

function AdultHomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { enterKidsMode } = useKidsMode();

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
        { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {greeting}
        </Text>
        <Text style={[styles.tagline, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Dive deeper into the Word
        </Text>
      </View>

      <LinearGradient
        colors={isDark ? ["#1A1F3C", "#12162A"] : ["#1A1F3C", "#141833"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.verseCard}
      >
        <View style={styles.verseCardInner}>
          <View style={styles.verseBadge}>
            <Ionicons name="sunny" size={13} color="#C9933A" />
            <Text style={[styles.verseBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
              Verse of the Day
            </Text>
          </View>

          <Text style={[styles.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
            {"\u201C"}{verse.text}{"\u201D"}
          </Text>

          <View style={styles.verseFooter}>
            <Text style={[styles.verseRef, { fontFamily: "Lora_600SemiBold" }]}>
              {verse.reference}
            </Text>
            <View style={styles.verseTransBadge}>
              <Text style={[styles.verseTrans, { fontFamily: "Inter_500Medium" }]}>KJV</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <Pressable
        onPress={() => router.push("/(tabs)/study")}
        style={({ pressed }) => [
          styles.studyModelCard,
          { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", borderColor: theme.border, opacity: pressed ? 0.92 : 1 },
        ]}
      >
        <Text style={[styles.studyModelLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
          HOW IT WORKS
        </Text>
        <Text style={[styles.studyModelTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          The 4-Layer Study Model
        </Text>
        <View style={styles.layersRow}>
          {STUDY_LAYERS.map((layer) => (
            <View key={layer.title} style={styles.layerItem}>
              <View style={[styles.layerIcon, { backgroundColor: theme.accent + "12" }]}>
                <Text style={[styles.layerNum, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>{layer.num}</Text>
              </View>
              <Text style={[styles.layerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {layer.title}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.studyModelFooter}>
          <Text style={[styles.studyModelFooterText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Read, understand context, hear historic voices, then apply
          </Text>
          <View style={[styles.studyModelArrow, { backgroundColor: theme.accent }]}>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </View>
        </View>
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => {
            if (hasActivePlan) {
              router.push("/devotional-day");
            } else {
              router.push("/devotionals");
            }
          }}
          style={({ pressed }) => [
            styles.actionCard,
            { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="flame" size={24} color={theme.accent} />
          <Text style={[styles.actionCardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {hasActivePlan ? "Continue" : "Devotionals"}
          </Text>
          {hasActivePlan && (
            <View style={[styles.actionProgress, { backgroundColor: theme.border }]}>
              <View style={[styles.actionProgressFill, { backgroundColor: theme.accent, width: `${Math.min((progress / total) * 100, 100)}%` as any }]} />
            </View>
          )}
          {!hasActivePlan && (
            <Text style={[styles.actionCardSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Guided plans
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => enterKidsMode()}
          style={({ pressed }) => [
            styles.actionCard,
            { backgroundColor: "#4A90D9", borderColor: "#4A90D9", opacity: pressed ? 0.85 : 1 },
          ]}
          testID="enter-kids-mode"
        >
          <Ionicons name="people" size={24} color="#fff" />
          <Text style={[styles.actionCardTitle, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
            Kids Club
          </Text>
          <Text style={[styles.actionCardSub, { color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular" }]}>
            Stories & quizzes
          </Text>
        </Pressable>
      </View>

      {plans && plans.length > 0 && (
        <View style={styles.plansSection}>
          <View style={styles.plansSectionHeader}>
            <Text style={[styles.plansSectionTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              Featured Plans
            </Text>
            {plans.length > 3 && (
              <Pressable onPress={() => router.push("/devotionals")} hitSlop={8}>
                <Text style={[styles.viewAllText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  View All
                </Text>
              </Pressable>
            )}
          </View>
          {plans.slice(0, 3).map((plan, i) => (
            <Pressable
              key={plan.id}
              onPress={() => router.push("/devotionals")}
              style={({ pressed }) => [
                styles.planRow,
                { borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.planIcon, { backgroundColor: theme.accent + "12" }]}>
                <Ionicons
                  name={i === 0 ? "heart-outline" : i === 1 ? "leaf-outline" : "star-outline"}
                  size={18}
                  color={theme.accent}
                />
              </View>
              <View style={styles.planText}>
                <Text style={[styles.planTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                  {plan.title}
                </Text>
                <Text style={[styles.planMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {plan.totalDays} days{plan.estimatedMinutesPerDay ? ` · ~${plan.estimatedMinutesPerDay} min/day` : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { marginBottom: 16 },
  greeting: { fontSize: 13, letterSpacing: 0.3, marginBottom: 4 },
  tagline: { fontSize: 24, letterSpacing: 0.2 },
  verseCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  verseCardInner: {
    padding: 22,
  },
  verseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  verseBadgeText: {
    color: "#C9933A",
    fontSize: 11,
    letterSpacing: 1.5,
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
  verseTransBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#C9933A20",
  },
  verseTrans: { color: "#C9933A", fontSize: 11, letterSpacing: 0.5 },
  studyModelCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  studyModelLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  studyModelTitle: { fontSize: 18, marginBottom: 16 },
  layersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  layerItem: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  layerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  layerNum: { fontSize: 16 },
  layerTitle: { fontSize: 11 },
  studyModelFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  studyModelFooterText: { flex: 1, fontSize: 13, lineHeight: 18 },
  studyModelArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  actionCardTitle: { fontSize: 15, marginTop: 4 },
  actionCardSub: { fontSize: 12 },
  actionProgress: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  actionProgressFill: {
    height: 3,
    borderRadius: 2,
  },
  plansSection: { marginBottom: 8 },
  plansSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  plansSectionTitle: { fontSize: 18 },
  viewAllText: { fontSize: 13 },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  planIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  planText: { flex: 1 },
  planTitle: { fontSize: 14 },
  planMeta: { fontSize: 12, marginTop: 2 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
});
