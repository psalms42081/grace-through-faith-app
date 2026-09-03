const FALLBACK_TIME_ZONE = "UTC";
const DAY_MS = 86_400_000;

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
  weekday: number;
  dateKey: string;
}

export function normalizeTimeZone(value: unknown): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    typeof candidate !== "string" ||
    candidate.length === 0 ||
    candidate.length > 100
  ) {
    return FALLBACK_TIME_ZONE;
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate }).format(0);
    return candidate;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export function getCalendarDate(
  instant: Date,
  timeZone: unknown
): CalendarDate {
  const normalizedTimeZone = normalizeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizedTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!year || !month || !day) {
    throw new Error("Unable to derive calendar date");
  }

  const dateKey = [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");

  return {
    year,
    month,
    day,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    dateKey,
  };
}

export function addCalendarDays(dateKey: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new Error(`Invalid calendar date key: ${dateKey}`);
  }
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days)
  );
  return date.toISOString().slice(0, 10);
}

export function getCalendarDayIndex(
  instant: Date,
  timeZone: unknown
): number {
  const { year, month, day } = getCalendarDate(instant, timeZone);
  return Math.floor(
    (Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / DAY_MS
  );
}

export function getSundayWeekStartDateKey(
  instant: Date,
  timeZone: unknown
): string {
  const calendarDate = getCalendarDate(instant, timeZone);
  return addCalendarDays(calendarDate.dateKey, -calendarDate.weekday);
}

/** Saturday (Sabbath) that ends the Sunday–Saturday week containing `instant`. */
export function getSabbathDateKey(
  instant: Date,
  timeZone: unknown
): string {
  const calendarDate = getCalendarDate(instant, timeZone);
  const daysUntilSaturday = (6 - calendarDate.weekday + 7) % 7;
  return addCalendarDays(calendarDate.dateKey, daysUntilSaturday);
}