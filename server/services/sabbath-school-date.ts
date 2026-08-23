const FALLBACK_TIME_ZONE = "UTC";

export function normalizeSabbathSchoolTimeZone(value: unknown): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string" || candidate.length === 0 || candidate.length > 100) {
    return FALLBACK_TIME_ZONE;
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate }).format(0);
    return candidate;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export function formatSabbathSchoolDate(
  instant: Date,
  timeZone: string
): string {
  const normalizedTimeZone = normalizeSabbathSchoolTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: normalizedTimeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(instant);

  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  if (!day || !month || !year) {
    throw new Error("Unable to format Sabbath School calendar date");
  }

  return `${day}/${month}/${year}`;
}

export function sabbathSchoolDateAtUtcMidnight(
  instant: Date,
  timeZone: string
): Date {
  const [day, month, year] = formatSabbathSchoolDate(instant, timeZone)
    .split("/")
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function findTodayDayNumber(
  days: Array<{ date: string | null; dayNumber: number }>,
  instant: Date,
  timeZone: string
): number | null {
  const today = formatSabbathSchoolDate(instant, timeZone);
  return days.find((day) => day.date === today)?.dayNumber ?? null;
}