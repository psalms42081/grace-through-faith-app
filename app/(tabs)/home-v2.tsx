// Path B Home v2 — Brief 01 Phase 1.
// Replaces the Home presentation without touching the index.tsx monolith
// (rollback: repoint the Home tab at "index" in app/(tabs)/_layout.tsx).
import React, { useMemo, useState, useRef } from "react";
import { ScrollView, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { useAuth } from "@/contexts/AuthContext";
import { useKidsMode } from "@/context/KidsModeContext";
import type { AgeGroup } from "@/context/KidsModeContext";
import ChildPickerModal from "@/components/home/ChildPickerModal";
import type { WeeklyStreakData } from "@/components/home/WeeklyCalendar";

import { HV2 } from "@/components/home-v2/theme";
import { getTodaysVerse, getTodaysReflection } from "@/components/home-v2/home-data";
import HomeHeader from "@/components/home-v2/HomeHeader";
import HeroCard, { HeroTab } from "@/components/home-v2/HeroCard";
import SSGradientCard from "@/components/home-v2/SSGradientCard";
import DailyRhythm, { RhythmRowData } from "@/components/home-v2/DailyRhythm";
import TopicChips from "@/components/home-v2/TopicChips";

interface TodayResponse {
  today: { dayNumber: number; title: string; passageLabel: string | null } | null;
  enrollment?: { planId: string; plan?: { title: string } | null };
  completedCount?: number;
  totalDays?: number;
  planComplete?: boolean;
}

export default function HomeV2Screen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { userId, user } = useAuth();
  const { enterKidsMode, lastActiveChildId } = useKidsMode();
  const [showChildPicker, setShowChildPicker] = useState(false);
  const [heroTab, setHeroTab] = useState<HeroTab>("verse");
  const scrollRef = useRef<ScrollView>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const now = new Date();
  const dateLine = now.toLocaleDateString("en-AU", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const dayLabel = now.toLocaleDateString("en-AU", { weekday: "long" });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const g =
      hour < 12 ? t("home.goodMorning") : hour < 17 ? t("home.goodAfternoon") : t("home.goodEvening");
    const first = user?.displayName?.split(" ")[0];
    return first ? `${g}, ${first}` : g;
  }, [t, user?.displayName]);

  const verse = useMemo(() => getTodaysVerse(), []);
  const reflection = useMemo(() => getTodaysReflection(), []);

  const { data: books } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/books"],
  });
  const votdParsed = useMemo(() => {
    const bookName = verse.reference.replace(/\s+\d+.*$/, "");
    const match = verse.reference.match(/(\d+):\d+$/);
    const chapter = match ? parseInt(match[1], 10) : undefined;
    const book = books?.find((b) => b.name.toLowerCase() === bookName.toLowerCase());
    return { bookId: book?.id, chapterNumber: chapter };
  }, [verse.reference, books]);

  const { data: dailySignpost } = useQuery<{ id: string; title: string; description: string }>({
    queryKey: ["/api/signposts/daily"],
    staleTime: 1000 * 60 * 60 * 24,
  });

  const { data: todayData } = useQuery<TodayResponse>({
    queryKey: [`/api/devotionals/today?userId=${userId}`],
  });

  const { data: recentReads } = useQuery<
    { id: string; bookId: number; bookName: string; chapter: number; translation: string; readAt: string }[]
  >({ queryKey: [`/api/reading-history/recent?userId=${userId}`] });

  const { data: weeklyData } = useQuery<WeeklyStreakData>({
    queryKey: [`/api/reading-streaks/weekly?userId=${userId}`],
  });

  const { data: ssData } = useQuery<{
    quarterly: { title: string } | null;
    currentLesson: { title: string; lessonNumber: number } | null;
    completedDays: number;
    currentLessonNumber: number;
  }>({ queryKey: [`/api/sabbath-school/current?userId=${userId}`] });

  const streak = weeklyData?.currentStreak ?? 0;
  const readToday = recentReads?.[0]?.readAt
    ? new Date(recentReads[0].readAt).toDateString() === now.toDateString()
    : false;

  // SS day index with the Adventech week running Sabbath→Friday (Sat = day 1)
  const ssDayIndex = ((now.getDay() + 1) % 7) + 1;
  const ssDoneToday = (ssData?.completedDays ?? 0) >= ssDayIndex;

  const planTitle = todayData?.enrollment?.plan?.title;
  const rhythmRows: RhythmRowData[] = [
    {
      key: "plan",
      icon: require("@/assets/illustrations/rhythm-plan.png"),
      iconBg: "#EAE6FA",
      title: planTitle ? `Today's Plan — ${planTitle}` : "Today's Plan",
      meta: todayData?.today
        ? `Day ${todayData.today.dayNumber} · ${todayData.today.title}`
        : "Choose a reading plan",
      done: readToday,
      onPress: () => router.push("/(tabs)/plans" as any),
    },
    {
      key: "ss",
      icon: require("@/assets/illustrations/rhythm-sabbath-school.png"),
      iconBg: "#DFF6F2",
      title: "Sabbath School",
      meta: ssData?.currentLesson ? `${dayLabel} — ${ssData.currentLesson.title}` : dayLabel,
      done: ssDoneToday,
      onPress: () => router.push("/sabbath-school" as any),
    },
    {
      key: "reflection",
      icon: require("@/assets/illustrations/rhythm-reflection.png"),
      iconBg: "#FFF0D9",
      title: "Evening Reflection",
      // TODO: no per-day reflection tracking exists yet — done-state lands with that API
      meta: "2 min · quiet moment",
      done: false,
      onPress: () => {
        setHeroTab("reflection");
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      },
    },
  ];

  return (
    <ScrollView
      ref={scrollRef}
      style={s.container}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      <HomeHeader
        dateLine={dateLine}
        greeting={greeting}
        streak={streak}
        initial={(user?.displayName?.[0] ?? "G").toUpperCase()}
        onKidsPress={() => setShowChildPicker(true)}
        onAvatarPress={() => router.push("/(tabs)/profile" as any)}
      />

      <HeroCard
        activeTab={heroTab}
        onTabChange={setHeroTab}
        verse={verse}
        bookId={votdParsed.bookId}
        chapterNumber={votdParsed.chapterNumber}
        userId={userId}
        signpost={dailySignpost}
        reflection={reflection}
      />

      <SSGradientCard
        quarterTitle={ssData?.quarterly?.title}
        lessonTitle={ssData?.currentLesson?.title}
        lessonNumber={ssData?.currentLesson?.lessonNumber ?? ssData?.currentLessonNumber}
        completedDays={ssData?.completedDays ?? 0}
        dayLabel={dayLabel}
      />

      <DailyRhythm rows={rhythmRows} />
      <TopicChips />

      <ChildPickerModal
        visible={showChildPicker}
        onClose={() => setShowChildPicker(false)}
        onSelectChild={(child: { id: string; name: string; ageGroup: string }) => {
          setShowChildPicker(false);
          enterKidsMode(child.id, child.name, child.ageGroup as AgeGroup);
          // Kids Home lives in the legacy index route
          router.replace("/(tabs)" as any);
        }}
        userId={userId}
        lastActiveChildId={lastActiveChildId}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: HV2.surface },
});
