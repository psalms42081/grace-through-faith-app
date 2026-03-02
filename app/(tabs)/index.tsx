import React, { useMemo, useState, useEffect, useCallback } from "react";
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
  ImageBackground,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { KidsColors } from "@/constants/colors";
import { useKidsMode } from "@/context/KidsModeContext";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

function AnimatedSection({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(500).springify()}>
      {children}
    </Animated.View>
  );
}

function PulsingFlame({ size, color }: { size: number; color: string }) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.25, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name="flame" size={size} color={color} />
    </Animated.View>
  );
}

function BouncyActionCard({
  onPress,
  style,
  children,
  testID,
}: {
  onPress: () => void;
  style: any;
  children: React.ReactNode;
  testID?: string;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
      testID={testID}
    >
      {children}
    </AnimatedPressable>
  );
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

      <AnimatedSection index={0}>
        {baseUrl ? (
          <Image
            source={{ uri: `${baseUrl}/assets/images/app/kids-welcome.png` }}
            style={kidsStyles.welcomeImage}
            resizeMode="cover"
          />
        ) : null}
      </AnimatedSection>

      <AnimatedSection index={1}>
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
      </AnimatedSection>

      {streak && streak.currentStreak > 0 && (
        <AnimatedSection index={2}>
          <View style={[kidsStyles.streakBanner, { backgroundColor: "#FF6B35" + "15", borderColor: "#FF6B35" + "30" }]}>
            <PulsingFlame size={22} color="#FF6B35" />
            <Text style={[kidsStyles.streakText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {streak.currentStreak} day streak!
            </Text>
            <PulsingFlame size={22} color="#FF6B35" />
          </View>
        </AnimatedSection>
      )}

      <AnimatedSection index={3}>
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
      </AnimatedSection>

      {dailyStory && (
        <AnimatedSection index={4}>
          <Pressable
            onPress={() => router.push(`/kids/story/${dailyStory.id}`)}
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
        </AnimatedSection>
      )}

      <AnimatedSection index={5}>
        <View style={kidsStyles.quickActions}>
          <BouncyActionCard
            onPress={() => router.push("/(tabs)/kids-stories")}
            style={[kidsStyles.actionCard, { backgroundColor: theme.accent }]}
            testID="browse-stories"
          >
            <Ionicons name="book-outline" size={28} color="#fff" />
            <Text style={[kidsStyles.actionTitle, { fontFamily: "Inter_600SemiBold" }]}>Browse Stories</Text>
            <Text style={[kidsStyles.actionDesc, { fontFamily: "Inter_400Regular" }]}>Read Bible stories</Text>
          </BouncyActionCard>
          <BouncyActionCard
            onPress={() => router.push("/(tabs)/kids-learn")}
            style={[kidsStyles.actionCard, { backgroundColor: (theme as any).purple || theme.accent }]}
            testID="take-quiz"
          >
            <Ionicons name="school-outline" size={28} color="#fff" />
            <Text style={[kidsStyles.actionTitle, { fontFamily: "Inter_600SemiBold" }]}>Learn</Text>
            <Text style={[kidsStyles.actionDesc, { fontFamily: "Inter_400Regular" }]}>Quizzes & verses</Text>
          </BouncyActionCard>
        </View>
      </AnimatedSection>
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
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    gap: 10,
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
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  statNum: { fontSize: 24 },
  statLabel: { fontSize: 11 },
  dailyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 22,
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
    borderRadius: 20,
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

const VERSE_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
  "https://images.unsplash.com/photo-1465056836900-8f1e940f1a04?w=800&q=80",
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80",
  "https://images.unsplash.com/photo-1518173946687-a3e33105820b?w=800&q=80",
  "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80",
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface WeeklyStreakData {
  daysRead: boolean[];
  perfectWeeks: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;
}

function WeeklyCalendar({ data, theme, isDark }: { data: WeeklyStreakData; theme: typeof Colors.dark; isDark: boolean }) {
  const todayIdx = new Date().getDay();
  return (
    <View style={s.weekRow}>
      {DAY_LABELS.map((label, i) => {
        const isToday = i === todayIdx;
        const didRead = data.daysRead[i];
        return (
          <View key={i} style={s.weekDayCol}>
            <Text style={[s.weekLabel, { color: isToday ? theme.accent : theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              {label}
            </Text>
            <View
              style={[
                s.weekDot,
                didRead && s.weekDotFilled,
                isToday && !didRead && { borderColor: theme.accent, borderWidth: 2 },
                didRead && { backgroundColor: theme.accent },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

function AdultHomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { enterKidsMode } = useKidsMode();
  const { userId } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const greeting = useMemo(() => getGreeting(), []);
  const verse = useMemo(() => getTodaysVerse(), []);
  const bgImage = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return VERSE_BACKGROUNDS[dayOfYear % VERSE_BACKGROUNDS.length];
  }, []);

  const { data: todayData } = useQuery<TodayResponse>({
    queryKey: [`/api/devotionals/today?userId=${userId}`],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/devotionals/plans"],
  });

  const { data: recentReads } = useQuery<{ id: string; bookId: number; bookName: string; chapter: number; translation: string }[]>({
    queryKey: [`/api/reading-history/recent?userId=${userId}`],
  });

  const { data: weeklyData } = useQuery<WeeklyStreakData>({
    queryKey: [`/api/reading-streaks/weekly?userId=${userId}`],
  });

  const lastRead = recentReads?.[0];
  const streak = weeklyData?.currentStreak ?? 0;
  const perfectWeeks = weeklyData?.perfectWeeks ?? 0;

  const hasActivePlan = todayData?.today != null;
  const progress = todayData?.completedCount ?? 0;
  const total = todayData?.totalDays ?? 1;

  const PLAN_COLORS: [string, string][] = [
    ["#C9933A", "#A87828"],
    ["#2E7D32", "#1B5E20"],
    ["#3B6CB5", "#2A4F8F"],
  ];
  const PLAN_ICONS: ("heart" | "leaf" | "star" | "book" | "sunny")[] = ["heart", "leaf", "star", "book", "sunny"];

  return (
    <ScrollView
      style={[s.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        s.content,
        { paddingTop: topPad + 12, paddingBottom: bottomPad + 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.headerRow}>
        <View>
          <Text style={[s.greeting, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {greeting}
          </Text>
          <Text style={[s.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Grace through Faith
          </Text>
        </View>
        <Pressable
          onPress={() => enterKidsMode()}
          style={[s.profileBtn, { backgroundColor: isDark ? theme.backgroundCard : "#F0EBE0" }]}
          testID="enter-kids-mode"
        >
          <Ionicons name="people" size={20} color={theme.accent} />
        </Pressable>
      </View>

      <View style={s.verseCardWrap}>
        <ImageBackground
          source={{ uri: bgImage }}
          style={s.verseImageBg}
          imageStyle={s.verseImageStyle}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.8)"]}
            style={s.verseOverlay}
          >
            <View style={s.verseBadge}>
              <View style={s.verseBadgeDot} />
              <Text style={[s.verseBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                Verse of the Day
              </Text>
            </View>

            <Text style={[s.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
              {"\u201C"}{verse.text}{"\u201D"}
            </Text>

            <View style={s.verseFooter}>
              <View>
                <Text style={[s.verseRef, { fontFamily: "Lora_600SemiBold" }]}>
                  {verse.reference}
                </Text>
                <Text style={[s.verseTrans, { fontFamily: "Inter_400Regular" }]}>KJV</Text>
              </View>
              <View style={s.verseActions}>
                <Pressable style={s.verseActionBtn} hitSlop={8}>
                  <Ionicons name="heart-outline" size={20} color="rgba(255,255,255,0.8)" />
                </Pressable>
                <Pressable style={s.verseActionBtn} hitSlop={8}>
                  <Ionicons name="share-outline" size={20} color="rgba(255,255,255,0.8)" />
                </Pressable>
                <Pressable style={s.verseActionBtn} hitSlop={8}>
                  <Ionicons name="bookmark-outline" size={20} color="rgba(255,255,255,0.8)" />
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>

      {weeklyData && (streak > 0 || weeklyData.daysRead.some(Boolean)) && (
        <View style={[s.streakCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
          <View style={s.streakHeader}>
            <View style={s.streakLeft}>
              <Ionicons name="flame" size={28} color="#FF6B35" />
              <View>
                <Text style={[s.streakNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                  {streak}
                </Text>
                <Text style={[s.streakLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Day Streak
                </Text>
              </View>
            </View>
            {perfectWeeks > 0 && (
              <View style={[s.perfectBadge, { backgroundColor: theme.accent + "15" }]}>
                <Ionicons name="trophy" size={14} color={theme.accent} />
                <Text style={[s.perfectText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  {perfectWeeks} Perfect {perfectWeeks === 1 ? "Week" : "Weeks"}
                </Text>
              </View>
            )}
          </View>
          <WeeklyCalendar data={weeklyData} theme={theme} isDark={isDark} />
        </View>
      )}

      {lastRead && (
        <Pressable
          onPress={() => router.push(`/read/${lastRead.bookId}/${lastRead.chapter}?translation=${lastRead.translation || "KJV"}`)}
          style={({ pressed }) => [
            s.continueCard,
            { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
          ]}
          testID="home-continue-reading"
        >
          <LinearGradient
            colors={["#C9933A", "#A87828"]}
            style={s.continueIcon}
          >
            <Ionicons name="book" size={18} color="#fff" />
          </LinearGradient>
          <View style={s.continueInfo}>
            <Text style={[s.continueLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Continue Reading
            </Text>
            <Text style={[s.continueTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]} numberOfLines={1}>
              {lastRead.bookName} {lastRead.chapter}
            </Text>
          </View>
          <Ionicons name="play-circle" size={32} color={theme.accent} />
        </Pressable>
      )}

      <View style={s.guidedRow}>
        <Pressable
          onPress={() => router.push("/(tabs)/read")}
          style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}
        >
          <LinearGradient
            colors={isDark ? ["#14172E", "#0D1028"] : ["#1A1F3C", "#141833"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.guidedCard}
          >
            <View style={s.guidedIconWrap}>
              <Ionicons name="layers" size={20} color="#C9933A" />
            </View>
            <Text style={[s.guidedTitle, { fontFamily: "Inter_600SemiBold" }]}>4-Layer Study</Text>
            <Text style={[s.guidedSub, { fontFamily: "Inter_400Regular" }]}>Deep Bible analysis</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => router.push("/prayer-journal")}
          style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}
        >
          <LinearGradient
            colors={isDark ? ["#1A1610", "#15120D"] : ["#2E3D1F", "#1B2A12"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.guidedCard}
          >
            <View style={[s.guidedIconWrap, { backgroundColor: "rgba(102,187,106,0.15)" }]}>
              <Ionicons name="journal" size={20} color="#66BB6A" />
            </View>
            <Text style={[s.guidedTitle, { fontFamily: "Inter_600SemiBold" }]}>Prayer Journal</Text>
            <Text style={[s.guidedSub, { fontFamily: "Inter_400Regular" }]}>Your prayer life</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <Pressable
        onPress={() => {
          if (hasActivePlan && todayData?.enrollment?.planId) {
            router.push(`/devotional-day?planId=${todayData.enrollment.planId}`);
          } else if (hasActivePlan) {
            router.push("/devotional-day");
          } else {
            router.push("/devotionals");
          }
        }}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        <LinearGradient
          colors={isDark ? ["#1A1610", "#15120D"] : ["#FFF8EC", "#FFFDF6"]}
          style={s.devotionalCard}
        >
          <View style={s.devotionalLeft}>
            <View style={[s.devotionalIconWrap, { backgroundColor: theme.accent + "20" }]}>
              <Ionicons name="flame" size={22} color={theme.accent} />
            </View>
            <View style={s.devotionalInfo}>
              <Text style={[s.devotionalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {hasActivePlan ? "Continue Your Plan" : "Devotional Plans"}
              </Text>
              <Text style={[s.devotionalSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {hasActivePlan
                  ? `Day ${progress} of ${total}`
                  : "Guided daily reading"}
              </Text>
            </View>
          </View>
          {hasActivePlan && (
            <View style={s.devotionalProgress}>
              <View style={[s.devotionalProgressTrack, { backgroundColor: isDark ? "#2A2520" : theme.border }]}>
                <LinearGradient
                  colors={["#C9933A", "#A87828"]}
                  style={[s.devotionalProgressFill, { width: `${Math.min((progress / total) * 100, 100)}%` as any }]}
                />
              </View>
            </View>
          )}
          {!hasActivePlan && (
            <Ionicons name="chevron-forward" size={20} color={theme.accent} />
          )}
        </LinearGradient>
      </Pressable>

      <Pressable
        onPress={() => router.push("/(tabs)/read")}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
      >
        <View style={[s.studyCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
          <Text style={[s.sectionLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            HOW IT WORKS
          </Text>
          <Text style={[s.studyTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            The 4-Layer Study Model
          </Text>
          <View style={s.layersRow}>
            {STUDY_LAYERS.map((layer, idx) => (
              <View key={layer.title} style={s.layerItem}>
                <LinearGradient
                  colors={[
                    ["#C9933A", "#A87828"],
                    ["#2E7D32", "#1B5E20"],
                    ["#3B6CB5", "#2A4F8F"],
                    ["#8B5CF6", "#6D3BD4"],
                  ][idx] as [string, string]}
                  style={s.layerCircle}
                >
                  <Text style={[s.layerNum, { fontFamily: "Inter_700Bold" }]}>{layer.num}</Text>
                </LinearGradient>
                <Text style={[s.layerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {layer.title}
                </Text>
              </View>
            ))}
          </View>
          <View style={s.studyFooter}>
            <Text style={[s.studyFooterText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Read, understand context, hear historic voices, then apply
            </Text>
            <LinearGradient colors={["#C9933A", "#A87828"]} style={s.studyArrow}>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </LinearGradient>
          </View>
        </View>
      </Pressable>

      {plans && plans.length > 0 && (
        <View style={s.plansSection}>
          <View style={s.plansSectionHeader}>
            <Text style={[s.plansSectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Featured Plans
            </Text>
            {plans.length > 3 && (
              <Pressable onPress={() => router.push("/devotionals")} hitSlop={8}>
                <Text style={[s.viewAllText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  View All
                </Text>
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.plansScroll}>
            {plans.slice(0, 5).map((plan, i) => (
              <Pressable
                key={plan.id}
                onPress={() => router.push("/devotionals")}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <LinearGradient
                  colors={PLAN_COLORS[i % PLAN_COLORS.length]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.planCard}
                >
                  <Ionicons
                    name={PLAN_ICONS[i % PLAN_ICONS.length]}
                    size={28}
                    color="rgba(255,255,255,0.3)"
                    style={s.planBgIcon}
                  />
                  <Text style={[s.planTitle, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
                    {plan.title}
                  </Text>
                  <Text style={[s.planMeta, { fontFamily: "Inter_400Regular" }]}>
                    {plan.totalDays} days
                  </Text>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 22 },
  header: { marginBottom: 28 },
  greeting: { fontSize: 14, letterSpacing: 0.5, marginBottom: 8 },
  appName: { fontSize: 28, letterSpacing: -0.3 },
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

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: { fontSize: 13, letterSpacing: 0.3, marginBottom: 4 },
  headerTitle: { fontSize: 26, letterSpacing: -0.3 },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  verseCardWrap: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 20,
  },
  verseImageBg: {
    width: "100%",
    minHeight: 280,
  },
  verseImageStyle: {
    borderRadius: 22,
  },
  verseOverlay: {
    flex: 1,
    padding: 24,
    paddingTop: 28,
    justifyContent: "flex-end",
    minHeight: 280,
  },
  verseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  verseBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C9933A",
  },
  verseBadgeText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  verseText: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 32,
    marginBottom: 20,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  verseRef: { color: "#C9933A", fontSize: 16, marginBottom: 2 },
  verseTrans: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
  verseActions: {
    flexDirection: "row",
    gap: 16,
  },
  verseActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  streakCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  streakHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  streakLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  streakNum: { fontSize: 28, lineHeight: 30 },
  streakLabel: { fontSize: 12 },
  perfectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  perfectText: { fontSize: 12 },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  weekDayCol: {
    alignItems: "center",
    gap: 8,
  },
  weekLabel: { fontSize: 12 },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(128,128,128,0.15)",
  },
  weekDotFilled: {
    alignItems: "center",
    justifyContent: "center",
  },
  continueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  continueIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  continueInfo: { flex: 1 },
  continueLabel: { fontSize: 12, marginBottom: 2 },
  continueTitle: { fontSize: 17 },
  guidedRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  guidedCard: {
    borderRadius: 18,
    padding: 20,
    gap: 8,
  },
  guidedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(201,147,58,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  guidedTitle: { color: "#fff", fontSize: 15 },
  guidedSub: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  devotionalCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  devotionalLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  devotionalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  devotionalInfo: { flex: 1 },
  devotionalTitle: { fontSize: 16, marginBottom: 2 },
  devotionalSub: { fontSize: 13 },
  devotionalProgress: { width: 56, marginLeft: 12 },
  devotionalProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  devotionalProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  studyCard: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  studyTitle: { fontSize: 20, marginBottom: 20 },
  layersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  layerItem: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  layerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  layerNum: { fontSize: 16, color: "#fff" },
  layerTitle: { fontSize: 11 },
  studyFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(201,147,58,0.15)",
    paddingTop: 16,
  },
  studyFooterText: { flex: 1, fontSize: 13, lineHeight: 18 },
  studyArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  plansSection: { marginBottom: 16 },
  plansSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  plansSectionTitle: { fontSize: 22 },
  viewAllText: { fontSize: 13 },
  plansScroll: { gap: 12, paddingRight: 4 },
  planCard: {
    width: 150,
    height: 180,
    borderRadius: 18,
    padding: 18,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  planBgIcon: {
    position: "absolute",
    top: 16,
    right: 16,
    opacity: 0.5,
  },
  planTitle: { color: "#fff", fontSize: 15, lineHeight: 20, marginBottom: 4 },
  planMeta: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
});
