import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  Image,
  Modal,
  TextInput,
  StatusBar,
} from "react-native";
import type { ImageSourcePropType } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useTranslation as useBibleTranslation } from "@/context/TranslationContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors, { getSabbathTheme } from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useKidsMode } from "@/context/KidsModeContext";
import { withDeviceTimeZone } from "@/lib/device-time-zone";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { getHomeLocalDay, getTodaysReflection } from "@/components/home-v2/home-data";
import { useSabbathSchoolTrack } from "@/hooks/useSabbathSchoolTrack";
import { useToast } from "@/contexts/ToastContext";
import { useSabbath } from "@/lib/sabbath";
import SpiritualRings from "@/components/SpiritualRings";
import type { AgeGroup } from "@/context/KidsModeContext";
import AnimatedSection from "@/components/AnimatedSection";
import GoldDivider from "@/components/home/GoldDivider";
import VotdHeroCard from "@/components/home/VotdHeroCard";
import { bibleBookNamesMatch } from "@/components/home-v2/home-data";
import { getBookImage } from "@/constants/bible-books";
import ContinueCard from "@/components/home/ContinueCard";
import { useResumeJourney } from "@/hooks/useResumeJourney";

import DevotionalCard from "@/components/home/DevotionalCard";
import SabbathBanner from "@/components/home/SabbathBanner";
import SabbathOverlay from "@/components/home/SabbathOverlay";
import SabbathSchoolCard from "@/components/home/SabbathSchoolCard";
import WeeklyCalendar from "@/components/home/WeeklyCalendar";
import type { WeeklyStreakData } from "@/components/home/WeeklyCalendar";
import ChildPickerModal from "@/components/home/ChildPickerModal";
import TodaysPath from "@/components/home/TodaysPath";
import { DAILY_QUEST_STAR_REWARD, DAILY_CHAMPION_BONUS } from "@/constants/kids-shop";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DAILY_VERSE_REFERENCES = [
  "John 3:16",
  "Psalm 23:1",
  "Proverbs 3:5",
  "Philippians 4:13",
  "Joshua 1:9",
  "Isaiah 40:31",
  "Romans 8:28",
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
  return {
    reference:
      DAILY_VERSE_REFERENCES[dayOfYear % DAILY_VERSE_REFERENCES.length],
  };
}

interface TodayResponse {
  today: { dayNumber: number; title: string; passageLabel: string | null } | null;
  enrollment?: { planId: string; plan?: { title: string } | null };
  completedCount?: number;
  totalDays?: number;
  planComplete?: boolean;
}

const KIDS_VERSE_REFERENCES = [
  "1 John 4:8",
  "Ephesians 4:32",
  "Psalm 23:1",
  "Philippians 4:13",
  "Psalm 118:24",
  "Psalm 27:1",
  "Joshua 1:9",
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

function PulsingFlame({ size, color }: { size: number; color: string }) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.25, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulseScale]);

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
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

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

const VERSE_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
  "https://images.unsplash.com/photo-1465056836900-8f1e940f1a04?w=800&q=80",
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80",
  "https://images.unsplash.com/photo-1518173946687-a3e33105820b?w=800&q=80",
  "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80",
];

const KIDS_TOOLTIP_KEY = "@grace-through-faith/kids-tooltip-shown";

export default function AdultHomeScreen() {
  const { theme: baseTheme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { enterKidsMode, lastActiveChildId } = useKidsMode();
  const { userId, user } = useAuth();
  const { selectedTrack } = useSabbathSchoolTrack();
  const sabbath = useSabbath();
  const { t } = useTranslation();
  const { translation: bibleTranslation } = useBibleTranslation();
  const theme = sabbath.isSabbath ? getSabbathTheme(baseTheme, isDark) : baseTheme;
  const [showChildPicker, setShowChildPicker] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(KIDS_TOOLTIP_KEY);
        if (!seen) {
          setShowTooltip(true);
          setTimeout(() => {
            setShowTooltip(false);
            AsyncStorage.setItem(KIDS_TOOLTIP_KEY, "true").catch(() => {});
          }, 5000);
        }
      } catch {}
    })();
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("home.goodMorning");
    if (hour < 17) return t("home.goodAfternoon");
    return t("home.goodEvening");
  }, [t]);
  // Reference-only: never render verse.text — always resolve via API.
  const verse = useMemo(() => getTodaysVerse(), []);
  const bgImage = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return VERSE_BACKGROUNDS[dayOfYear % VERSE_BACKGROUNDS.length];
  }, []);
  const verseBookImage = useMemo<ImageSourcePropType | null>(() => {
    const ref = verse.reference;
    const bookName = ref.replace(/\s+\d+.*$/, "");
    return getBookImage(bookName) as ImageSourcePropType | null;
  }, [verse.reference]);

  const { data: homeBooks } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/books"],
  });

  const votdParsed = useMemo(() => {
    const ref = verse.reference;
    const bookName = ref.replace(/\s+\d+.*$/, "");
    const chapterMatch = ref.match(/(\d+):\d+$/);
    const chapter = chapterMatch ? parseInt(chapterMatch[1], 10) : undefined;
    const verseMatch = ref.match(/:(\d+)$/);
    const verseNum = verseMatch ? parseInt(verseMatch[1], 10) : undefined;
    const book = homeBooks?.find(
      (b) => bibleBookNamesMatch(bookName, b.name)
    );
    return { bookId: book?.id, chapterNumber: chapter, verseNumber: verseNum };
  }, [verse.reference, homeBooks]);

  // Fetch VOTD text in the active translation via /api/passage.
  const { data: votdPassage, isLoading: votdLoading, isError: votdError } = useQuery<{
    book: { id: number; name: string };
    chapter: number;
    verses: Array<{ verse: number; text: string }>;
    translation: string;
  }>({
    queryKey: ["/api/passage", votdParsed.bookId, votdParsed.chapterNumber, bibleTranslation],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/passage?book=${votdParsed.bookId}&chapter=${votdParsed.chapterNumber}&translation=${encodeURIComponent(bibleTranslation)}`
      );
      if (!res.ok) throw new Error(`VOTD passage fetch failed (${res.status})`);
      return res.json();
    },
    enabled: !!votdParsed.bookId && !!votdParsed.chapterNumber,
    staleTime: 1000 * 60 * 60 * 24,
    retry: 2,
  });

  // Extract the specific verse text from the passage response.
  const votdResolvedText = useMemo(() => {
    if (!votdPassage?.verses || !votdParsed.verseNumber) return null;
    const v = votdPassage.verses.find((v) => v.verse === votdParsed.verseNumber);
    return v?.text ?? null;
  }, [votdPassage, votdParsed.verseNumber]);

  // Compose the verse object for VotdHeroCard — text comes only from the API.
  const resolvedVotd = useMemo(
    () => ({
      reference: verse.reference,
      text: votdResolvedText ?? (
        votdError ||
        (!!homeBooks && !votdParsed.bookId) ||
        (!votdLoading && !!votdPassage && !votdResolvedText)
          ? "Verse text is temporarily unavailable."
          : ""
      ),
      translation: votdPassage?.translation || bibleTranslation,
    }),
    [verse.reference, votdResolvedText, votdError, homeBooks, votdParsed.bookId, votdLoading, votdPassage, bibleTranslation]
  );

  const { data: egwDevotion } = useQuery<{
    title: string;
    content: string;
    bookTitle: string;
    bookId: number;
    date: string;
  }>({
    queryKey: [withDeviceTimeZone("/api/egw/devotional/today")],
    staleTime: 1000 * 60 * 60 * 24,
  });

  const { data: dailySignpost } = useQuery<{
    id: string;
    title: string;
    description: string;
    translation: string;
    questions?: Array<{
      question: string;
      verses: Array<{ ref: string; text: string; translation: string }>;
      commentary?: string;
    }>;
  }>({
    queryKey: ["/api/signposts/daily", bibleTranslation],
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/signposts/daily?translation=${encodeURIComponent(bibleTranslation)}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Signpost fetch failed (${res.status})`);
      }
      return res.json();
    },
  });

  const todayReflection = useMemo(() => {
    const item = getTodaysReflection(getHomeLocalDay().dayIndex);
    return { thought: item.thought, source: `Reflection on ${item.reference}` };
  }, []);

  const { data: todayData } = useQuery<TodayResponse>({
    queryKey: [`/api/devotionals/today?userId=${userId}`],
  });

  const { data: recentReads } = useQuery<{ id: string; bookId: number; bookName: string; chapter: number; translation: string; readAt: string }[]>({
    queryKey: [`/api/reading-history/recent?userId=${userId}`],
  });

  const { data: weeklyData } = useQuery<WeeklyStreakData>({
    queryKey: [withDeviceTimeZone(`/api/reading-streaks/weekly?userId=${userId}`)],
  });

  const { data: ssData } = useQuery<{
    quarterly: { title: string } | null;
    currentLesson: { title: string; lessonNumber: number } | null;
    completedDays: number;
    currentLessonNumber: number;
    companion: { id: string; slug: string; title: string; description: string | null } | null;
  }>({
    queryKey: [
      withDeviceTimeZone(`/api/sabbath-school/current?userId=${userId}&curriculum=${selectedTrack}`),
    ],
  });

  const { data: ringsData } = useQuery<{
    study: { current: number; goal: number };
    prayer: { current: number; goal: number };
    engage: { current: number; goal: number };
  }>({
    queryKey: [`/api/spiritual-rings?userId=${userId}`],
    staleTime: 30_000,
  });

  const lastRead = recentReads?.[0];
  const todayStr = new Date().toDateString();
  const readToday = lastRead?.readAt
    ? new Date(lastRead.readAt).toDateString() === todayStr
    : false;
  const streak = weeklyData?.currentStreak ?? 0;
  const perfectWeeks = weeklyData?.perfectWeeks ?? 0;

  const hasActivePlan = todayData?.today != null;
  const progress = todayData?.completedCount ?? 0;
  const total = todayData?.totalDays ?? 1;

  const { item: resumeItem } = useResumeJourney();

  const isSabbathMode = sabbath.isSabbath;

  const streakSection = weeklyData && (streak > 0 || weeklyData.daysRead.some(Boolean)) ? (
    <View style={[
      s.streakCard,
      isSabbathMode && { opacity: 0.7 },
    ]}>
      <LinearGradient
        colors={isDark ? ["#1A1510", "#0F0D0A", "#0A0908"] : ["#FFFDF6", "#FFF8ED", "#FFF5E6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.streakGradient}
      >
        <View style={s.streakHeader}>
          <View style={s.streakLeft}>
            <View style={s.streakFireWrap}>
              <Ionicons name="flame" size={isSabbathMode ? 20 : 24} color={isSabbathMode ? theme.textMuted : "#FF6B35"} />
            </View>
            <View>
              <Text style={[
                s.streakNum,
                { color: isSabbathMode ? theme.textSecondary : theme.text, fontFamily: "Inter_700Bold" },
                isSabbathMode && { fontSize: 18 },
              ]}>
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
      </LinearGradient>
    </View>
  ) : null;

  const reflectionCardStyle = {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  };

  return (
    <>
    <SabbathOverlay
      isSabbath={sabbath.isSabbath}
      isClosingPhase={sabbath.closingReflectionActive}
    />
    <ScrollView
      ref={scrollRef}
      style={[s.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        s.content,
        { paddingTop: topPad + 12, paddingBottom: bottomPad + 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.headerRow}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={[s.greeting, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {user?.displayName
              ? `${greeting}, ${user.displayName.split(" ")[0]}`
              : greeting}
          </Text>
          <Text style={[s.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Informed Ministries
          </Text>
          <Text style={[s.headerTagline, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Read · Reflect · Pray · Practice · Grow
          </Text>
        </View>
        <View style={{ flexShrink: 0 }}>
          {showTooltip && (
            <View style={[s.tooltip, { backgroundColor: theme.accent }]}>
              <View style={[s.tooltipArrow, { borderBottomColor: theme.accent }]} />
              <Text style={s.tooltipText}>Switch to Kids Mode</Text>
            </View>
          )}
          <Pressable
            onPress={() => {
              if (showTooltip) {
                setShowTooltip(false);
                AsyncStorage.setItem(KIDS_TOOLTIP_KEY, "true").catch(() => {});
              }
              setShowChildPicker(true);
            }}
            style={[s.kidsModeBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }]}
            testID="enter-kids-mode"
            accessibilityLabel="Switch to Kids Mode"
            accessibilityRole="button"
          >
            <Ionicons name="people" size={16} color={theme.accent} style={{ opacity: 0.8 }} />
            <Text style={[s.kidsModeBtnLabel, { color: theme.accent, opacity: 0.8 }]}>Kids</Text>
          </Pressable>
        </View>
      </View>

      <ChildPickerModal
        visible={showChildPicker}
        onClose={() => setShowChildPicker(false)}
        onSelectChild={(child) => {
          setShowChildPicker(false);
          enterKidsMode(child.id, child.name, child.ageGroup as AgeGroup);
        }}
        userId={userId}
        lastActiveChildId={lastActiveChildId}
      />

      <View style={{ marginHorizontal: -20 }}>
        <VotdHeroCard
          verse={resolvedVotd}
          bgImage={bgImage}
          bookImage={verseBookImage}
          userId={userId}
          bookId={votdParsed.bookId}
          chapterNumber={votdParsed.chapterNumber}
          translation={bibleTranslation}
          signpost={dailySignpost ? {
            id: dailySignpost.id,
            title: dailySignpost.title,
            excerpt: dailySignpost.description,
            translation: dailySignpost.translation,
            questions: dailySignpost.questions,
          } : null}
          reflection={egwDevotion ? {
            thought: egwDevotion.content,
            source: `${egwDevotion.title} — ${egwDevotion.bookTitle}`,
          } : todayReflection ?? null}
        />
      </View>

      {isSabbathMode ? (
        <>
          <AnimatedSection index={0}><SabbathBanner theme={theme} /></AnimatedSection>
          <AnimatedSection index={1}>
            <TodaysPath
              theme={theme}
              isDark={isDark}
              hasRecentRead={readToday}
              dailyVerseRef={verse.reference}
            />
          </AnimatedSection>
          <AnimatedSection index={2}>
            <View style={reflectionCardStyle}>
              <Text style={[{
                color: "#C9933A",
                fontFamily: "Inter_600SemiBold",
                fontSize: 11,
                letterSpacing: 1,
                marginBottom: 8,
              }]}>• DAILY REFLECTION</Text>
              <Text style={[{
                color: "#FFFFFF",
                fontFamily: "Lora_700Bold",
                fontSize: 20,
                lineHeight: 28,
                marginBottom: 8,
              }]} numberOfLines={4}>
                "{egwDevotion ? egwDevotion.content : todayReflection?.thought}"
              </Text>
              <Text style={[{
                color: "rgba(255,255,255,0.5)",
                fontFamily: "Inter_400Regular",
                fontSize: 13,
              }]}>{egwDevotion ? `${egwDevotion.title} — ${egwDevotion.bookTitle}` : todayReflection?.source}</Text>
            </View>
          </AnimatedSection>
          <AnimatedSection index={2}><SabbathSchoolCard /></AnimatedSection>
          <AnimatedSection index={6}>
            <ContinueCard
              item={resumeItem}
              theme={theme}
              isDark={isDark}
            />
          </AnimatedSection>
          <AnimatedSection index={7}>
            <ReadingPlansCard theme={theme} isDark={isDark} />
          </AnimatedSection>
          <AnimatedSection index={8}><GoldDivider theme={theme} /></AnimatedSection>
          {!resumeItem && !hasActivePlan && (
            <AnimatedSection index={8}>
              <DevotionalCard
                hasActivePlan={false}
                progress={0}
                total={0}
                theme={theme}
                isDark={isDark}
              />
            </AnimatedSection>
          )}
          {ssData?.companion && (
            <AnimatedSection index={8}>
              <Pressable
                onPress={() => router.push(`/resource-detail?slug=${ssData.companion!.slug}` as any)}
                style={({ pressed }) => [
                  homeStyles.companionHomeCard,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <LinearGradient
                  colors={isDark ? ["rgba(109,62,206,0.18)", "rgba(139,92,246,0.08)"] : ["rgba(139,92,246,0.1)", "rgba(109,62,206,0.05)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={homeStyles.companionGradient}
                >
                  <View style={homeStyles.companionHomeRow}>
                    <View style={homeStyles.companionHomeIcon}>
                      <Ionicons name="book" size={16} color="#A78BFA" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[homeStyles.companionHomeLabel, { color: "#A78BFA" }]}>
                        Lesson Companion
                      </Text>
                      <Text style={[homeStyles.companionHomeTitle, { color: isDark ? "#E8E0F0" : theme.text }]} numberOfLines={1}>
                        {ssData.companion.title.replace(/^Companion:\s*/i, "")}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? "rgba(167,139,250,0.5)" : theme.textMuted} />
                  </View>
                </LinearGradient>
              </Pressable>
            </AnimatedSection>
          )}
          <AnimatedSection index={9}>
            <SpiritualRings theme={theme} isDark={isDark} />
          </AnimatedSection>
        </>
      ) : (
        <>
          <AnimatedSection index={0}><SabbathSchoolCard /></AnimatedSection>
          <AnimatedSection index={1}>
            <TodaysPath
              theme={theme}
              isDark={isDark}
              hasRecentRead={readToday}
              dailyVerseRef={verse.reference}
            />
          </AnimatedSection>
          <AnimatedSection index={2}>
            <View style={reflectionCardStyle}>
              <Text style={[{
                color: "#C9933A",
                fontFamily: "Inter_600SemiBold",
                fontSize: 11,
                letterSpacing: 1,
                marginBottom: 8,
              }]}>• DAILY REFLECTION</Text>
              <Text style={[{
                color: "#FFFFFF",
                fontFamily: "Lora_700Bold",
                fontSize: 20,
                lineHeight: 28,
                marginBottom: 8,
              }]} numberOfLines={4}>
                "{egwDevotion ? egwDevotion.content : todayReflection?.thought}"
              </Text>
              <Text style={[{
                color: "rgba(255,255,255,0.5)",
                fontFamily: "Inter_400Regular",
                fontSize: 13,
              }]}>{egwDevotion ? `${egwDevotion.title} — ${egwDevotion.bookTitle}` : todayReflection?.source}</Text>
            </View>
          </AnimatedSection>
          <AnimatedSection index={5}>
            <ContinueCard
              item={resumeItem}
              theme={theme}
              isDark={isDark}
            />
          </AnimatedSection>
          <AnimatedSection index={6}>
            <ReadingPlansCard theme={theme} isDark={isDark} />
          </AnimatedSection>
          <AnimatedSection index={7}><GoldDivider theme={theme} /></AnimatedSection>
          {!resumeItem && !hasActivePlan && (
            <AnimatedSection index={7}>
              <DevotionalCard
                hasActivePlan={false}
                progress={0}
                total={0}
                theme={theme}
                isDark={isDark}
              />
            </AnimatedSection>
          )}
          {ssData?.companion && (
            <AnimatedSection index={8}>
              <Pressable
                onPress={() => router.push(`/resource-detail?slug=${ssData.companion!.slug}` as any)}
                style={({ pressed }) => [
                  homeStyles.companionHomeCard,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <LinearGradient
                  colors={isDark ? ["rgba(109,62,206,0.18)", "rgba(139,92,246,0.08)"] : ["rgba(139,92,246,0.1)", "rgba(109,62,206,0.05)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={homeStyles.companionGradient}
                >
                  <View style={homeStyles.companionHomeRow}>
                    <View style={homeStyles.companionHomeIcon}>
                      <Ionicons name="book" size={16} color="#A78BFA" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[homeStyles.companionHomeLabel, { color: "#A78BFA" }]}>
                        Lesson Companion
                      </Text>
                      <Text style={[homeStyles.companionHomeTitle, { color: isDark ? "#E8E0F0" : theme.text }]} numberOfLines={1}>
                        {ssData.companion.title.replace(/^Companion:\s*/i, "")}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? "rgba(167,139,250,0.5)" : theme.textMuted} />
                  </View>
                </LinearGradient>
              </Pressable>
            </AnimatedSection>
          )}
          <AnimatedSection index={9}>
            <SpiritualRings theme={theme} isDark={isDark} />
          </AnimatedSection>
        </>
      )}

    </ScrollView>

    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 22 },
  header: { marginBottom: 28 },
  greeting: { fontSize: 14, letterSpacing: 0.5, marginBottom: 8 },
  appName: { fontSize: 28, letterSpacing: -0.3 },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  greeting: { fontSize: 13, letterSpacing: 0.3, marginBottom: 3 },
  headerTitle: { fontSize: 22, letterSpacing: -0.3, marginBottom: 1 },
  headerTagline: { fontSize: 12, letterSpacing: 0.2, marginTop: 3 },
  kidsModeBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 2,
  },
  kidsModeBtnLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  tooltip: {
    position: "absolute",
    top: "100%" as any,
    right: 0,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    zIndex: 10,
    minWidth: 140,
    alignItems: "center",
  },
  tooltipText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  tooltipArrow: {
    position: "absolute",
    top: -6,
    right: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  streakCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
  },
  streakGradient: {
    borderRadius: 20,
    padding: 20,
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
  streakFireWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,107,53,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.2)",
    alignItems: "center",
    justifyContent: "center",
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
});

const homeStyles = StyleSheet.create({
  companionHomeCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  companionGradient: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.15)",
  },
  companionHomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  companionHomeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  companionHomeLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  companionHomeTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
});
