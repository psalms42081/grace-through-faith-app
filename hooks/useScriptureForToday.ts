import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useTranslation as useI18n } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/context/TranslationContext";
import { useSabbathSchoolTrack } from "@/hooks/useSabbathSchoolTrack";
import { getHomeLocalDay } from "@/components/home-v2/home-data";
import { apiRequest } from "@/lib/query-client";
import { withDeviceTimeZone } from "@/lib/device-time-zone";
import { resolveContentLang } from "@/lib/content-language";
import { fallbackScripture } from "@/lib/scripture-for-today-fallback";
import {
  joinVerseWords,
  scriptureQuestionIndex,
  selectLessonScripture,
  verseTranslationOrder,
  type ScriptureChoice,
} from "@/lib/scripture-for-today";

const CACHE_KEY = "@grace-through-faith/scripture-for-today/v1";

export interface ScriptureTodayCard {
  dateKey: string;
  track: string;
  translation: string;
  bookId: number;
  chapter: number;
  displayVerses: number[];
  linkVerses: number[];
  reference: string;
  text: string;
  shownTranslation: string;
  fromLesson: boolean;
  lessonNumber: number | null;
  dayNumber: number | null;
  quarterCode: string | null;
}

interface LessonDay {
  dayNumber: number;
  contentMarkdown: string | null;
}

interface LessonPayload {
  quarterly: { quarterCode?: string | null } | null;
  currentLesson: { lessonNumber: number; days: LessonDay[] } | null;
  todayDayNumber: number | null;
}

async function fetchVerseWords(
  bookId: number,
  chapter: number,
  verses: number[],
  translations: string[],
): Promise<{ text: string; translation: string } | null> {
  for (const translation of translations) {
    try {
      const response = await apiRequest(
        "GET",
        `/api/passage?book=${bookId}&chapter=${chapter}&translation=${encodeURIComponent(translation)}`,
      );
      const body = (await response.json()) as { verses?: { verse: number; text: string }[] };
      const text = joinVerseWords(body.verses ?? [], verses);
      if (text) return { text, translation };
    } catch {
      // The next translation in the order may still have this passage.
    }
  }
  return null;
}

function matchesCache(
  card: ScriptureTodayCard | null,
  dateKey: string,
  track: string,
  translation: string,
): card is ScriptureTodayCard {
  return !!card && card.dateKey === dateKey && card.track === track && card.translation === translation;
}

export function useScriptureForToday() {
  const { userId } = useAuth();
  const { translation } = useTranslation();
  const { i18n } = useI18n();
  const { selectedTrack } = useSabbathSchoolTrack();
  const [now, setNow] = useState(() => new Date());
  const localDay = getHomeLocalDay(now);
  const [card, setCard] = useState<ScriptureTodayCard | null>(null);

  useEffect(() => {
    const next = new Date();
    next.setHours(24, 0, 5, 0);
    const delay = Math.max(1000, next.getTime() - Date.now());
    const timer = setTimeout(() => setNow(new Date()), delay);
    return () => clearTimeout(timer);
  }, [localDay.dateKey]);

  const lesson = useQuery<LessonPayload>({
    queryKey: ["scripture-for-today-lesson", userId, localDay.dateKey, selectedTrack],
    enabled: !!userId,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        withDeviceTimeZone(
          `/api/sabbath-school/current?userId=${userId}&curriculum=${selectedTrack}`,
        ),
      );
      return response.json();
    },
  });

  useEffect(() => {
    let cancelled = false;
    const dateKey = localDay.dateKey;
    const track = selectedTrack;
    const bibleTranslation = translation;
    const dayNumber =
      lesson.data?.todayDayNumber != null && lesson.data.todayDayNumber >= 1
        ? lesson.data.todayDayNumber
        : localDay.sabbathSchoolDayNumber;

    const builtIn = (): ScriptureTodayCard => {
      const verse = fallbackScripture(localDay.dayIndex);
      return {
        dateKey,
        track,
        translation: bibleTranslation,
        bookId: verse.bookId,
        chapter: verse.chapter,
        displayVerses: verse.displayVerses,
        linkVerses: verse.linkVerses,
        reference: verse.reference,
        text: verse.text,
        shownTranslation: verse.translation,
        fromLesson: false,
        lessonNumber: null,
        dayNumber: null,
        quarterCode: null,
      };
    };

    const publish = async (next: ScriptureTodayCard) => {
      if (cancelled) return;
      setCard(next);
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
      } catch {
        // The card is already on screen. The next open can load it again.
      }
    };

    void (async () => {
      let cached: ScriptureTodayCard | null = null;
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        cached = raw ? (JSON.parse(raw) as ScriptureTodayCard) : null;
      } catch {
        cached = null;
      }
      const cacheHit = matchesCache(cached, dateKey, track, bibleTranslation);
      if (!cancelled && cacheHit) setCard(cached);

      if (!userId) {
        if (!cacheHit) await publish(builtIn());
        return;
      }
      if (lesson.isLoading) return;

      const current = lesson.data?.currentLesson;
      if (lesson.isError || !current) {
        if (!cacheHit) await publish(builtIn());
        return;
      }

      const choice: ScriptureChoice | null = selectLessonScripture({
        days: current.days.map((day) => ({
          dayNumber: day.dayNumber,
          content: day.contentMarkdown,
        })),
        todayDayNumber: dayNumber,
        track,
      });
      if (!choice) {
        await publish(builtIn());
        return;
      }

      const words = await fetchVerseWords(
        choice.bookId,
        choice.chapter,
        choice.displayVerses,
        verseTranslationOrder(bibleTranslation, resolveContentLang(i18n.language || "en")),
      );
      if (!words) {
        if (!cacheHit) await publish(builtIn());
        return;
      }
      if (cancelled) return;
      await publish({
        dateKey,
        track,
        translation: bibleTranslation,
        bookId: choice.bookId,
        chapter: choice.chapter,
        displayVerses: choice.displayVerses,
        linkVerses: choice.linkVerses,
        reference: choice.reference,
        text: words.text,
        shownTranslation: words.translation,
        fromLesson: true,
        lessonNumber: current.lessonNumber,
        dayNumber,
        quarterCode: lesson.data?.quarterly?.quarterCode ?? null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    i18n.language,
    lesson.data,
    lesson.isError,
    lesson.isLoading,
    localDay.dateKey,
    localDay.dayIndex,
    localDay.sabbathSchoolDayNumber,
    selectedTrack,
    translation,
    userId,
  ]);

  const visible = matchesCache(card, localDay.dateKey, selectedTrack, translation) ? card : null;

  return {
    card: visible,
    questionIndex: scriptureQuestionIndex(localDay.dayIndex),
  };
}
