import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { KidsColors } from "@/constants/colors";
import { useKidsMode } from "@/context/KidsModeContext";

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
  { icon: "book-outline" as const, title: "Read", desc: "Scripture in KJV, ASV & WEB" },
  { icon: "search-outline" as const, title: "Study", desc: "Greek & Hebrew word origins" },
  { icon: "earth-outline" as const, title: "Context", desc: "History, culture & geography" },
  { icon: "chatbubbles-outline" as const, title: "Voices", desc: "Historic commentary & insight" },
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

function KidsHomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? KidsColors.dark : KidsColors.light;
  const insets = useSafeAreaInsets();
  const { ageGroup } = useKidsMode();

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

  const { data: dailyStory } = useQuery<{ id: string; title: string; scriptureRef: string | null; estimatedMinutes: number }>({
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
        <Text style={[styles.greeting, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {greeting}
        </Text>
        <Text style={[styles.appName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Kids Club
        </Text>
      </View>

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
          <View style={[kidsStyles.dailyIcon, { backgroundColor: theme.accent + "20" }]}>
            <Ionicons name="book" size={28} color={theme.accent} />
          </View>
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
  dailyIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 14 },
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
        { paddingTop: topPad + 12, paddingBottom: bottomPad + 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {greeting}
        </Text>
        <Text style={[styles.appName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Grace through Faith
        </Text>
        <View style={styles.welcomeTagline}>
          <View style={[styles.crossMark, { backgroundColor: theme.accent }]} />
          <Text style={[styles.taglineText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Dive deeper into the Word, one layer at a time
          </Text>
        </View>
      </View>

      <LinearGradient
        colors={isDark ? ["#1A1F3C", "#12162A"] : ["#1A1F3C", "#141833"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.verseCard}
      >
        <View style={styles.verseCardInner}>
          <View style={styles.verseCornerTL}>
            <Ionicons name="remove-outline" size={20} color="#C9933A40" style={{ transform: [{ rotate: "45deg" }] }} />
          </View>
          <View style={styles.verseCornerBR}>
            <Ionicons name="remove-outline" size={20} color="#C9933A40" style={{ transform: [{ rotate: "45deg" }] }} />
          </View>

          <View style={styles.verseBadge}>
            <Ionicons name="sunny" size={13} color="#C9933A" />
            <Text style={[styles.verseBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
              Verse of the Day
            </Text>
          </View>

          <View style={styles.verseQuoteMark}>
            <Text style={[styles.quoteGlyph, { fontFamily: "Lora_700Bold" }]}>{"\u201C"}</Text>
          </View>

          <Text style={[styles.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
            {verse.text}
          </Text>

          <View style={styles.verseGoldRule} />

          <View style={styles.verseFooter}>
            <Text style={[styles.verseRef, { fontFamily: "Lora_600SemiBold" }]}>
              {verse.reference}
            </Text>
            <View style={styles.verseTransBadge}>
              <Text style={[styles.verseTrans, { fontFamily: "Inter_500Medium" }]}>
                KJV
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <GoldDivider theme={theme} />

      <Pressable
        onPress={() => router.push("/(tabs)/study")}
        style={({ pressed }) => [
          styles.studyModelCard,
          {
            backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6",
            borderColor: theme.accent + "35",
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={styles.studyModelHeader}>
          <View style={[styles.studyModelIconWrap, { backgroundColor: theme.accent + "18" }]}>
            <Ionicons name="layers-outline" size={22} color={theme.accent} />
          </View>
          <View style={styles.studyModelHeaderText}>
            <Text style={[styles.studyModelTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              The 4-Layer Study Model
            </Text>
            <Text style={[styles.studyModelSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Go beyond surface-level reading
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.accent} />
        </View>

        <View style={styles.studyLayersRow}>
          {STUDY_LAYERS.map((layer, i) => (
            <View key={layer.title} style={styles.studyLayerItem}>
              <View style={[styles.studyLayerDot, { backgroundColor: theme.accent + (i === 0 ? "FF" : i === 1 ? "CC" : i === 2 ? "88" : "55") }]} />
              <Ionicons name={layer.icon} size={18} color={theme.accent} />
              <Text style={[styles.studyLayerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {layer.title}
              </Text>
              <Text style={[styles.studyLayerDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                {layer.desc}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>

      <GoldDivider theme={theme} />

      <View style={[styles.devotionalBanner, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <View style={styles.devotionalTop}>
          <View style={[styles.devotionalIcon, { backgroundColor: theme.accent + "18" }]}>
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
                <View style={styles.progressRow}>
                  <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                    <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${Math.min((progress / total) * 100, 100)}%` as any }]} />
                  </View>
                  <Text style={[styles.progressText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {progress}/{total}
                  </Text>
                </View>
              </>
            ) : planComplete ? (
              <>
                <Text style={[styles.devotionalTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  Plan Complete
                </Text>
                <Text style={[styles.devotionalSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Start a new plan to continue growing
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.devotionalTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  Begin Your Journey
                </Text>
                <Text style={[styles.devotionalSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Enroll in a guided reading plan
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
          <Ionicons name={hasActivePlan ? "arrow-forward" : "add"} size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={[styles.enrollBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {hasActivePlan ? "Continue" : "Browse Plans"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
          Quick Access
        </Text>
        <View style={[styles.sectionAccent, { backgroundColor: theme.accent }]} />
      </View>
      <View style={styles.quickGrid}>
        {[
          { icon: "book-outline" as const, label: "Read", subtitle: "Pick up where you left off", onPress: () => router.push("/(tabs)/read"), color: "#3B82F6" },
          { icon: "search-outline" as const, label: "Search", subtitle: "Find passages & topics", onPress: () => router.push("/(tabs)/search"), color: "#8B5CF6" },
          { icon: "compass-outline" as const, label: "Explore", subtitle: "Maps, places & events", onPress: () => router.push("/(tabs)/explore"), color: "#10B981" },
          { icon: "school-outline" as const, label: "Study", subtitle: "Word study & context", onPress: () => router.push("/(tabs)/study"), color: "#C9933A" },
        ].map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.quickCard,
              { backgroundColor: theme.backgroundCard, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: action.color + "15" }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
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

      <Pressable
        onPress={() => enterKidsMode()}
        style={({ pressed }) => [
          styles.kidsClubBanner,
          { backgroundColor: "#4A90D9", opacity: pressed ? 0.85 : 1 },
        ]}
        testID="enter-kids-mode"
      >
        <Ionicons name="people" size={26} color="#fff" />
        <View style={styles.kidsClubInfo}>
          <Text style={[styles.kidsClubTitle, { fontFamily: "Inter_600SemiBold" }]}>Kids Club</Text>
          <Text style={[styles.kidsClubDesc, { fontFamily: "Inter_400Regular" }]}>
            Bible stories, quizzes & memory verses for children
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
      </Pressable>

      {plans && plans.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  Featured Plans
                </Text>
                <View style={[styles.sectionAccent, { backgroundColor: theme.accent }]} />
              </View>
              {plans.length > 3 && (
                <Pressable onPress={() => router.push("/devotionals")} hitSlop={8}>
                  <Text style={[styles.viewAllText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                    View All
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
          <View style={styles.plansGrid}>
            {plans.slice(0, 3).map((plan, i) => (
              <Pressable
                key={plan.id}
                onPress={() => router.push("/devotionals")}
                style={({ pressed }) => [
                  styles.planPreview,
                  { backgroundColor: theme.backgroundCard, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <View style={[styles.planPreviewIcon, { backgroundColor: theme.accent + "18" }]}>
                  <Ionicons
                    name={i === 0 ? "heart-outline" : i === 1 ? "leaf-outline" : "star-outline"}
                    size={20}
                    color={theme.accent}
                  />
                </View>
                <View style={styles.planPreviewTextWrap}>
                  <Text style={[styles.planPreviewTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]} numberOfLines={1}>
                    {plan.title}
                  </Text>
                  <Text style={[styles.planPreviewMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {plan.totalDays} days
                    {plan.estimatedMinutesPerDay ? ` · ~${plan.estimatedMinutesPerDay} min/day` : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    marginBottom: 24,
  },
  greeting: { fontSize: 13, letterSpacing: 0.3, marginBottom: 4 },
  appName: { fontSize: 28, letterSpacing: 0.2, marginBottom: 10 },
  welcomeTagline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crossMark: {
    width: 2,
    height: 16,
    borderRadius: 1,
  },
  taglineText: { fontSize: 13, letterSpacing: 0.2 },
  verseCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
  },
  verseCardInner: {
    padding: 26,
    position: "relative",
  },
  verseCornerTL: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  verseCornerBR: {
    position: "absolute",
    bottom: 10,
    right: 10,
  },
  verseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 18,
  },
  verseBadgeText: {
    color: "#C9933A",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  verseQuoteMark: {
    marginBottom: -8,
    marginTop: -4,
  },
  quoteGlyph: {
    color: "#C9933A50",
    fontSize: 48,
    lineHeight: 52,
  },
  verseText: {
    color: "#EDE5D5",
    fontSize: 18,
    lineHeight: 30,
    marginBottom: 20,
  },
  verseGoldRule: {
    height: 1,
    backgroundColor: "#C9933A30",
    marginBottom: 16,
  },
  verseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verseRef: { color: "#C9933A", fontSize: 15 },
  verseTransBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#C9933A20",
  },
  verseTrans: { color: "#C9933A", fontSize: 11, letterSpacing: 0.5 },
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
  studyModelCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    marginVertical: 12,
  },
  studyModelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  studyModelIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  studyModelHeaderText: {
    flex: 1,
  },
  studyModelTitle: { fontSize: 16 },
  studyModelSubtitle: { fontSize: 12, marginTop: 2 },
  studyLayersRow: {
    flexDirection: "row",
    gap: 8,
  },
  studyLayerItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  studyLayerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  studyLayerTitle: { fontSize: 12, marginTop: 2 },
  studyLayerDesc: { fontSize: 10, textAlign: "center", lineHeight: 14 },
  devotionalBanner: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginTop: 12,
    marginBottom: 28,
  },
  devotionalTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  devotionalIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  devotionalTextBlock: { flex: 1 },
  devotionalLabel: { fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 },
  devotionalTitle: { fontSize: 15, marginBottom: 6 },
  devotionalSub: { fontSize: 12 },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressText: { fontSize: 11 },
  enrollBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },
  enrollBtnText: { color: "#fff", fontSize: 14 },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewAllText: { fontSize: 13 },
  sectionTitle: { fontSize: 19, marginBottom: 4 },
  sectionAccent: {
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  quickCard: {
    width: "47%" as any,
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  quickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  quickLabel: { fontSize: 15 },
  quickSub: { fontSize: 11, lineHeight: 15 },
  plansGrid: { gap: 10, marginBottom: 8 },
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
  planPreviewTextWrap: { flex: 1 },
  planPreviewTitle: { fontSize: 15 },
  planPreviewMeta: { fontSize: 12, marginTop: 2 },
  kidsClubBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    marginBottom: 24,
    gap: 14,
  },
  kidsClubInfo: { flex: 1 },
  kidsClubTitle: { color: "#fff", fontSize: 16, marginBottom: 2 },
  kidsClubDesc: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
});
