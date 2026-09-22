import { getTodaysVerse } from "@/components/home-v2/home-data";

/** Shown when the browser has blocked notification permission. */
export const NOTIFICATIONS_BLOCKED_MESSAGE =
  "Notifications are blocked for this site — enable them in your browser settings";

export const DAILY_VERSE_PUSH_WINDOW_MINUTES = 15;
/** Friday, local time. */
export const SABBATH_SCHOOL_PUSH_WEEKDAY = 5;
export const SABBATH_SCHOOL_PUSH_TIME = "18:00";
export const DEFAULT_VERSE_PUSH_TIME = "07:00";

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type ZonedClock = {
  dateKey: string;
  minutes: number;
  weekday: number;
};

export type PushScheduleRow = {
  timezone: string;
  verseTimeLocal: string | null;
  ssReminder: boolean;
  lastVerseLocalDate: string | null;
  lastSsLocalDate: string | null;
};

export type DuePushKind = "verse" | "sabbath";

export function parseHmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function normalizeHm(value: string): string | null {
  const minutes = parseHmToMinutes(value);
  if (minutes === null) return null;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatVerseTimeLabel(value: string): string {
  const minutes = parseHmToMinutes(value);
  if (minutes === null) return value;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 < 12 ? "am" : "pm";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function zonedClock(now: Date, timeZone: string): ZonedClock | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    });
    const parts: Record<string, string> = {};
    for (const part of fmt.formatToParts(now)) {
      if (part.type !== "literal") parts[part.type] = part.value;
    }
    let hour = Number(parts.hour);
    if (hour === 24) hour = 0;
    const minute = Number(parts.minute);
    const weekday = WEEKDAYS[parts.weekday];
    if (
      weekday === undefined ||
      !parts.year ||
      !parts.month ||
      !parts.day ||
      Number.isNaN(hour) ||
      Number.isNaN(minute)
    ) {
      return null;
    }
    return {
      dateKey: `${parts.year}-${parts.month}-${parts.day}`,
      minutes: hour * 60 + minute,
      weekday,
    };
  } catch {
    return null;
  }
}

/** Same day index the Home hero uses for a calendar date. */
export function dayIndexForDateKey(dateKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return 1;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return (
    Math.floor((Date.UTC(year, month, day) - Date.UTC(year, 0, 1)) / 86400000) + 1
  );
}

export function verseReferenceForLocalDate(dateKey: string): string {
  return getTodaysVerse(dayIndexForDateKey(dateKey)).reference;
}

export function parseDailyVerseReference(reference: string): {
  bookName: string;
  chapter: number;
  verse: number;
} | null {
  const match = /^(.*?)\s+(\d+):(\d+)$/.exec(reference.trim());
  if (!match) return null;
  return {
    bookName: match[1].trim(),
    chapter: Number(match[2]),
    verse: Number(match[3]),
  };
}

export function scripturePushPath(bookId: number, chapter: number, verse: number): string {
  const params = new URLSearchParams({
    bookId: String(bookId),
    chapter: String(chapter),
    verse: String(verse),
  });
  return `/scripture?${params.toString()}`;
}

export function firstVerseLine(text: string): string {
  const line = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((part) => part.trim())
    .find(Boolean) ?? "";
  return line.length > 180 ? `${line.slice(0, 177)}…` : line;
}

export function dailyVerseNotification(reference: string, verseText: string, href: string) {
  return {
    title: `Verse of the Day · ${reference} KJV`,
    body: firstVerseLine(verseText),
    url: href,
  };
}

export function sabbathSchoolNotification(lessonNumber: number) {
  return {
    title: "Sabbath School",
    body: `Lesson ${lessonNumber} is ready for Sabbath`,
    url: "/sabbath-school",
  };
}

export function fallsInCurrentWindow(
  localMinutes: number,
  scheduledHm: string,
  windowMinutes = DAILY_VERSE_PUSH_WINDOW_MINUTES,
): boolean {
  const scheduled = parseHmToMinutes(scheduledHm);
  if (scheduled === null) return false;
  const slotStart = Math.floor(localMinutes / windowMinutes) * windowMinutes;
  return scheduled >= slotStart && scheduled < slotStart + windowMinutes;
}

export function duePushKinds(row: PushScheduleRow, now: Date): DuePushKind[] {
  const clock = zonedClock(now, row.timezone);
  if (!clock) return [];
  const due: DuePushKind[] = [];
  if (
    row.verseTimeLocal &&
    row.lastVerseLocalDate !== clock.dateKey &&
    fallsInCurrentWindow(clock.minutes, row.verseTimeLocal)
  ) {
    due.push("verse");
  }
  if (
    row.ssReminder &&
    clock.weekday === SABBATH_SCHOOL_PUSH_WEEKDAY &&
    row.lastSsLocalDate !== clock.dateKey &&
    fallsInCurrentWindow(clock.minutes, SABBATH_SCHOOL_PUSH_TIME)
  ) {
    due.push("sabbath");
  }
  return due;
}

export function isExpoPushEndpoint(endpoint: string): boolean {
  return endpoint.startsWith("ExponentPushToken[") || endpoint.startsWith("ExpoPushToken[");
}

/** Accepts the current field and the older `{ token }` body. */
export function readRegisteredPushToken(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const record = body as { pushToken?: unknown; token?: unknown };
  if (typeof record.pushToken === "string" && record.pushToken.trim()) {
    return record.pushToken.trim();
  }
  if (typeof record.token === "string" && record.token.trim()) {
    return record.token.trim();
  }
  return "";
}

export function isGonePushStatus(status: number | undefined): boolean {
  return status === 410 || status === 404;
}
