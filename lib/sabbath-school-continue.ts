import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export const SABBATH_SCHOOL_LAST_READ_KEY = "@grace-through-faith/ss-last-read";

export interface SabbathSchoolContinueDay {
  dayNumber: number;
  title?: string | null;
  date?: string | null;
  completed?: boolean;
}

export interface SabbathSchoolLastRead {
  lessonNumber: number;
  dayNumber: number;
  quarterCode?: string;
}

function lastReadStorageKey(userId?: string | null): string {
  return userId
    ? `${SABBATH_SCHOOL_LAST_READ_KEY}:${userId}`
    : SABBATH_SCHOOL_LAST_READ_KEY;
}

export function parseSabbathSchoolLastRead(
  raw: string | null | undefined,
): SabbathSchoolLastRead | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SabbathSchoolLastRead;
    const lessonNumber = Number(parsed?.lessonNumber);
    const dayNumber = Number(parsed?.dayNumber);
    if (!Number.isInteger(lessonNumber) || !Number.isInteger(dayNumber)) {
      return null;
    }
    if (lessonNumber < 1 || dayNumber < 1 || dayNumber > 7) return null;
    const quarterCode =
      typeof parsed.quarterCode === "string" && parsed.quarterCode.length > 0
        ? parsed.quarterCode
        : undefined;
    return { lessonNumber, dayNumber, quarterCode };
  } catch {
    return null;
  }
}

export function lastReadMatchesCurrentLesson(
  lastRead: SabbathSchoolLastRead | null,
  currentLessonNumber: number | null | undefined,
  currentQuarterCode?: string | null,
): boolean {
  if (!lastRead || currentLessonNumber == null) return false;
  if (lastRead.lessonNumber !== currentLessonNumber) return false;
  if (
    lastRead.quarterCode &&
    currentQuarterCode &&
    lastRead.quarterCode !== currentQuarterCode
  ) {
    return false;
  }
  return true;
}

export function resolveSabbathSchoolContinueDay({
  days,
  todayDayNumber,
  lastRead,
  currentLessonNumber,
  currentQuarterCode,
}: {
  days: SabbathSchoolContinueDay[];
  todayDayNumber: number | null | undefined;
  lastRead: SabbathSchoolLastRead | null;
  currentLessonNumber: number | null | undefined;
  currentQuarterCode?: string | null;
}): SabbathSchoolContinueDay | null {
  if (!days.length) return null;

  if (
    lastReadMatchesCurrentLesson(
      lastRead,
      currentLessonNumber,
      currentQuarterCode,
    )
  ) {
    const resumed = days.find((day) => day.dayNumber === lastRead!.dayNumber);
    if (resumed) return resumed;
  }

  if (todayDayNumber != null) {
    const today = days.find((day) => day.dayNumber === todayDayNumber);
    if (today) return today;
  }

  return days.find((day) => !day.completed) ?? days[days.length - 1];
}

export function sabbathSchoolContinueProgressCount(
  continueDay: { dayNumber: number } | null,
  totalDays = 7,
): number {
  if (!continueDay) return 0;
  return Math.min(Math.max(continueDay.dayNumber, 0), totalDays);
}

export async function getSabbathSchoolLastRead(
  userId?: string | null,
): Promise<SabbathSchoolLastRead | null> {
  try {
    const raw = await AsyncStorage.getItem(lastReadStorageKey(userId));
    return parseSabbathSchoolLastRead(raw);
  } catch {
    return null;
  }
}

export async function setSabbathSchoolLastRead(
  userId: string | null | undefined,
  lastRead: SabbathSchoolLastRead,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      lastReadStorageKey(userId),
      JSON.stringify(lastRead),
    );
  } catch {
    // Local resume is best-effort; reading still works without it.
  }
}

export function useSabbathSchoolLastRead(userId?: string | null) {
  const [lastRead, setLastRead] = useState<SabbathSchoolLastRead | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSabbathSchoolLastRead(userId).then((value) => {
      if (!cancelled) setLastRead(value);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const recordLastRead = useCallback(
    (entry: SabbathSchoolLastRead) => {
      setLastRead(entry);
      void setSabbathSchoolLastRead(userId, entry);
    },
    [userId],
  );

  return { lastRead, recordLastRead };
}
