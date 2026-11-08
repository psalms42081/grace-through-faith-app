import { getTodaysVerse } from "@/components/home-v2/home-data";

/** Shown when the browser has blocked notification permission. */
export const NOTIFICATIONS_BLOCKED_MESSAGE =
  "Notifications are blocked for this site — enable them in your browser settings";

export const NOTIFICATIONS_SETUP_FAILED_MESSAGE =
  "Couldn't set up notifications — try again";

export const DAILY_VERSE_PUSH_WINDOW_MINUTES = 15;
/** Friday, local time. */
export const SABBATH_SCHOOL_PUSH_WEEKDAY = 5;
export const SABBATH_SCHOOL_PUSH_TIME = "18:00";
export const DEFAULT_VERSE_PUSH_TIME = "07:00";

/** web-push 3.6.7 sends Urgency: normal and TTL 2419200 (four weeks) when options are omitted. */
export const WEB_PUSH_URGENCY = "high" as const;
export const WEB_PUSH_TTL_SECONDS = 6 * 60 * 60;

export function webPushSendOptions(): { urgency: typeof WEB_PUSH_URGENCY; TTL: number } {
  return { urgency: WEB_PUSH_URGENCY, TTL: WEB_PUSH_TTL_SECONDS };
}

export const ANDROID_CHROME_BATTERY_TIP =
  "If notifications arrive late, turn off battery optimisation for Chrome in Android settings.";

export function isAndroidChrome(userAgent: string): boolean {
  return (
    /Android/i.test(userAgent) &&
    /Chrome\/\d/i.test(userAgent) &&
    !/EdgA|Edg\/|OPR\/|SamsungBrowser|Firefox/i.test(userAgent)
  );
}

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
  ssTimeLocal?: string | null;
  planReminder?: boolean;
  /** Up to three HH:MM prayer times. Empty means the reminder is off. */
  prayerTimes?: string[];
  /** Last local date a given prayer time was sent, keyed by HH:MM. */
  lastPrayerSent?: Record<string, string>;
  lastVerseLocalDate: string | null;
  lastSsLocalDate: string | null;
  lastPlanLocalDate?: string | null;
};

export type DuePushKind = "verse" | "sabbath" | "plan" | `prayer:${string}`;

export const MAX_PRAYER_TIMES = 3;

export function prayerKind(time: string): DuePushKind {
  return `prayer:${time}`;
}

export function prayerTimeFromKind(kind: DuePushKind): string | null {
  return kind.startsWith("prayer:") ? kind.slice("prayer:".length) : null;
}

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

export function formatVerseTimeLabel(value: string, locales?: Intl.LocalesArgument): string {
  const minutes = parseHmToMinutes(value);
  if (minutes === null) return value;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return new Intl.DateTimeFormat(locales, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hour24, minute));
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

export function readingPlanNotification(dayNumber: number, planTitle: string, planId: string) {
  const params = new URLSearchParams({ planId });
  return {
    title: "Reading plan",
    body: `Day ${dayNumber} of ${planTitle} is ready`,
    url: `/devotional-day-preview?${params.toString()}`,
  };
}

export function prayerTimeNotification(reference: string) {
  return {
    title: "A time to pray",
    body: reference,
    url: "/prayer-journal",
  };
}

/** Keeps at most three distinct clock times, in the order the reader set them. */
export function normalizePrayerTimes(value: unknown): string[] | null {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > MAX_PRAYER_TIMES) return null;
  const times: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const hm = normalizeHm(item);
    if (!hm || times.includes(hm)) return null;
    times.push(hm);
  }
  return times;
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
    fallsInCurrentWindow(clock.minutes, row.ssTimeLocal || SABBATH_SCHOOL_PUSH_TIME)
  ) {
    due.push("sabbath");
  }
  if (
    row.planReminder === true &&
    row.lastPlanLocalDate !== clock.dateKey &&
    fallsInCurrentWindow(clock.minutes, row.verseTimeLocal || DEFAULT_VERSE_PUSH_TIME)
  ) {
    due.push("plan");
  }
  for (const time of row.prayerTimes ?? []) {
    if ((row.lastPrayerSent?.[time] ?? null) === clock.dateKey) continue;
    if (fallsInCurrentWindow(clock.minutes, time)) due.push(prayerKind(time));
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
