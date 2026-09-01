// Path B Home v2 — Brief 01 Phase 1.
// Replaces the Home presentation without touching the index.tsx monolith
// (rollback: repoint the Home tab at "index" in app/(tabs)/_layout.tsx).
import React, { useEffect, useMemo, useState, useRef } from "react";
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
import {
  formatGreeting,
  getHomeLocalDay,
  getTodaysReflection,
  getTodaysVerse,
  bibleBookNamesMatch,
  parseBibleReference,
} from "@/components/home-v2/home-data";
import HomeHeader from "@/components/home-v2/HomeHeader";
import HeroCard, { HeroTab } from "@/components/home-v2/HeroCard";
import SSGradientCard from "@/components/home-v2/SSGradientCard";
import DailyRhythm, { RhythmRowData } from "@/components/home-v2/DailyRhythm";
import TopicChips from "@/components/home-v2/TopicChips";
import { useTranslation as useAppTranslation } from "@/context/TranslationContext";
import { apiRequest } from "@/lib/query-client";
import { getDeviceTimeZone, withDeviceTimeZone } from "@/lib/device-time-zone";
import {
  resolveSabbathSchoolContinueDay,
  sabbathSchoolContinueProgressCount,
  useSabbathSchoolLastRead,
} from "@/lib/sabbath-school-continue";
import { weekdayNameForSabbathSchoolDay } from "@/lib/sabbath-school-day-navigation";
import {
  buildSabbathSchoolTabRoute,
  SABBATH_SCHOOL_TAB_ROOT,
} from "@/lib/sabbath-school-route-containment";
import { useSabbathSchoolTrack } from "@/hooks/useSabbathSchoolTrack";

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
  const { selectedTrack } = useSabbathSchoolTrack();
  const { enterKidsMode, lastActiveChildId } = useKidsMode();
  const [showChildPicker, setShowChildPicker] = useState(false);
  const [heroTab, setHeroTab] = useState<HeroTab>("verse");
  const [clock, setClock] = useState(() => new Date());
  const scrollRef = useRef<ScrollView>(null);
  const { translation } = useAppTranslation();
  const deviceTimeZone = useMemo(() => getDeviceTimeZone(), []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const localDay = useMemo(() => getHomeLocalDay(clock), [clock]);
  const { dateLine, dayLabel } = localDay;

  const greeting = useMemo(() => {
    const g =
      localDay.daypart === "morning"
        ? t("home.goodMorning")
        : localDay.daypart === "afternoon"
          ? t("home.goodAfternoon")
          : t("home.goodEvening");
    return formatGreeting(g, user?.displayName);
  }, [localDay.daypart, t, user?.displayName]);

  const reflection = useMemo(
    () => getTodaysReflection(localDay.dayIndex),
    [localDay.dayIndex],
  );

  // Today's VOTD reference ONLY — the reference (e.g. "John 3:16") is safe to
  // use statically because it is translation-agnostic. The verse TEXT must
  // always come from the canonical API response for the active translation.
  // We never render the static KJV text under a non-KJV label.
  const votdReference = useMemo(
    () => getTodaysVerse(localDay.dayIndex).reference,
    [localDay.dayIndex],
  );

  const {
    data: books,
    isPending: booksIsPending,
    isError: booksIsError,
  } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/books"],
    retry: 1,
  });

  // Parse book/chapter/verse from the reference string (e.g. "John 3:16").
  const votdParsedRef = useMemo(() => {
    const bookName = votdReference.replace(/\s+\d+.*$/, "");
    const chapterMatch = votdReference.match(/(\d+):/);
    const verseMatch = votdReference.match(/:(\d+)/);
    const chapter = chapterMatch ? parseInt(chapterMatch[1], 10) : 1;
    const verse = verseMatch ? parseInt(verseMatch[1], 10) : 1;
    const book = books?.find((b) => bibleBookNamesMatch(bookName, b.name));
    return { bookId: book?.id, chapterNumber: chapter, verseNumber: verse, bookName };
  }, [votdReference, books]);

  const reflectionReadingTarget = useMemo(() => {
    const parsed = parseBibleReference(reflection.reference);
    const book = books?.find(
      (candidate) => bibleBookNamesMatch(parsed.bookName, candidate.name),
    );
    return {
      reference: reflection.reference,
      bookName: parsed.bookName,
      bookId: book?.id,
      chapterNumber: parsed.chapterNumber,
    };
  }, [books, reflection]);

  // Fetch the VOTD verse in the active translation.
  const canFetchVotd = !!votdParsedRef.bookId;
  const {
    data: votdVerseData,
    isLoading: votdIsLoading,
    isError: votdIsError,
  } = useQuery<{ id: string; text: string; translation?: string }>({
    queryKey: [
      "/api/verse",
      {
        book: votdParsedRef.bookId,
        chapter: votdParsedRef.chapterNumber,
        verse: votdParsedRef.verseNumber,
        translation,
        dateKey: localDay.dateKey,
        timeZone: deviceTimeZone,
      },
    ],
    queryFn: async () => {
      const url = `/api/verse?book=${votdParsedRef.bookId}&chapter=${votdParsedRef.chapterNumber}&verse=${votdParsedRef.verseNumber}&translation=${encodeURIComponent(translation)}`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: canFetchVotd,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });

  // Build the verse object for HeroCard. Text is ONLY ever the canonical API
  // response for `translation`. Until then we pass empty text so HeroCard shows
  // its loading / unavailable state — never static text under another label.
  const verse = useMemo(
    () => ({ text: votdVerseData?.text ?? "", reference: votdReference }),
    [votdVerseData?.text, votdReference]
  );

  // A missing or failed book dependency is terminal, not an infinite loading state.
  const verseLoading = booksIsPending || (canFetchVotd && votdIsLoading);
  const verseUnavailable =
    booksIsError ||
    (!booksIsPending && !canFetchVotd) ||
    (canFetchVotd && !votdIsLoading && (votdIsError || !votdVerseData?.text));

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
    queryKey: ["/api/signposts/daily", translation, deviceTimeZone, localDay.dateKey],
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        withDeviceTimeZone(
          `/api/signposts/daily?translation=${encodeURIComponent(translation)}`,
        ),
      );
      return res.json();
    },
  });

  const { data: todayData } = useQuery<TodayResponse>({
    queryKey: [`/api/devotionals/today?userId=${userId}`],
  });

  const { data: recentReads } = useQuery<
    { id: string; bookId: number; bookName: string; chapter: number; translation: string; readAt: string }[]
  >({ queryKey: [`/api/reading-history/recent?userId=${userId}`] });

  const { data: weeklyData } = useQuery<WeeklyStreakData>({
    queryKey: [
      "home-reading-streak-weekly",
      userId,
      deviceTimeZone,
      localDay.dateKey,
    ],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        withDeviceTimeZone(`/api/reading-streaks/weekly?userId=${userId}`),
      );
      return res.json();
    },
  });

  const { lastRead: ssLastRead } = useSabbathSchoolLastRead(userId);
  const { data: ssData } = useQuery<{
    quarterly: { title: string; colorPrimary: string | null; quarterCode?: string } | null;
    currentLesson: {
      title: string;
      lessonNumber: number;
      days: {
        dayNumber: number;
        title: string | null;
        date: string | null;
        completed?: boolean;
      }[];
    } | null;
    completedDays: number;
    currentLessonNumber: number;
    todayDayNumber: number | null;
  }>({
    queryKey: [
      "home-sabbath-school-current",
      userId,
      deviceTimeZone,
      localDay.dateKey,
      selectedTrack,
    ],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        withDeviceTimeZone(
          `/api/sabbath-school/current?userId=${userId}&curriculum=${selectedTrack}`,
        ),
      );
      return res.json();
    },
  });

  const streak = weeklyData?.currentStreak ?? 0;
  const readToday = recentReads?.[0]?.readAt
    ? getHomeLocalDay(new Date(recentReads[0].readAt)).dateKey === localDay.dateKey
    : false;

  // Prefer the timezone-aware day number returned by the SS API. The local
  // value is only a loading fallback and uses the same Home clock.
  const ssDayIndex =
    ssData?.todayDayNumber ?? localDay.sabbathSchoolDayNumber;
  const ssLessonNumber =
    ssData?.currentLesson?.lessonNumber ?? ssData?.currentLessonNumber ?? null;
  const continueDay = resolveSabbathSchoolContinueDay({
    days: ssData?.currentLesson?.days ?? [],
    todayDayNumber: ssData?.todayDayNumber ?? localDay.sabbathSchoolDayNumber,
    lastRead: ssLastRead,
    currentLessonNumber: ssLessonNumber,
    currentQuarterCode: ssData?.quarterly?.quarterCode,
  });
  const continueDayLabel = continueDay
    ? weekdayNameForSabbathSchoolDay(continueDay)
    : dayLabel;
  const continueDayTitle = continueDay?.title ?? ssData?.currentLesson?.title;
  const ssProgressDays = sabbathSchoolContinueProgressCount(continueDay);
  const ssDoneToday =
    ssData?.currentLesson?.days.find((day) => day.dayNumber === ssDayIndex)
      ?.completed === true;
  const goToOverview = () => router.push(SABBATH_SCHOOL_TAB_ROOT as any);
  const goToWatch = () =>
    router.push(buildSabbathSchoolTabRoute("sabbath-school-video") as any);
  const goToContinueDay = () => {
    if (!continueDay || ssLessonNumber == null) {
      goToOverview();
      return;
    }
    router.push(
      buildSabbathSchoolTabRoute("sabbath-school-day", {
        lessonNumber: ssLessonNumber,
        dayNumber: continueDay.dayNumber,
        quarterCode: ssData?.quarterly?.quarterCode,
      }) as any,
    );
  };

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
      onPress: () => router.push("/devotions" as any),
    },
    {
      key: "ss",
      icon: require("@/assets/illustrations/rhythm-sabbath-school.png"),
      iconBg: "#DFF6F2",
      title: "Sabbath School",
      meta: continueDayTitle
        ? `${continueDayLabel} — ${continueDayTitle}`
        : continueDayLabel,
      done: ssDoneToday,
      onPress: goToContinueDay,
    },
    {
      key: "reflection",
      icon: require("@/assets/illustrations/rhythm-reflection.png"),
      iconBg: "#FFF0D9",
      title: `${localDay.daypart[0].toUpperCase()}${localDay.daypart.slice(1)} Reflection`,
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
        onKidsPress={() => setShowChildPicker(true)}
      />

      <HeroCard
        activeTab={heroTab}
        onTabChange={setHeroTab}
        verse={verse}
        bookId={votdParsedRef.bookId}
        chapterNumber={votdParsedRef.chapterNumber}
        userId={userId}
        signpost={dailySignpost}
        reflection={reflection}
        reflectionDaypart={localDay.daypart}
        reflectionReadingTarget={reflectionReadingTarget}
        translation={translation}
        verseLoading={verseLoading}
        verseUnavailable={verseUnavailable}
      />

      <SSGradientCard
        quarterTitle={ssData?.quarterly?.title}
        quarterColor={ssData?.quarterly?.colorPrimary}
        lessonTitle={ssData?.currentLesson?.title}
        lessonNumber={ssLessonNumber}
        progressDays={ssProgressDays}
        dayLabel={continueDayLabel}
        onContinue={goToContinueDay}
        onOpenOverview={goToOverview}
        onWatch={goToWatch}
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
          router.replace("/" as any);
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
