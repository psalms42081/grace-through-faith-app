import { getCalendarDate, normalizeTimeZone } from "../shared/calendar-date";

export type DatedPost = { date: string };

export const ODB_DEFAULT_TIME_ZONE = "Australia/Melbourne";

function dayKey(value: string): string {
  return (value || "").slice(0, 10);
}

export function odbDateKeyFromTimeZone(
  timeZone: unknown,
  now = new Date(),
): string {
  const raw = Array.isArray(timeZone) ? timeZone[0] : timeZone;
  if (raw == null || raw === "") {
    return getCalendarDate(now, ODB_DEFAULT_TIME_ZONE).dateKey;
  }
  return getCalendarDate(now, normalizeTimeZone(raw)).dateKey;
}

export function pickPublishedForDate<T extends DatedPost>(
  posts: T[],
  dateKey: string,
): { post: T; exact: boolean } | null {
  const eligible = posts
    .filter((post) => {
      const key = dayKey(post.date);
      return /^\d{4}-\d{2}-\d{2}$/.test(key) && key <= dateKey;
    })
    .sort((a, b) => dayKey(b.date).localeCompare(dayKey(a.date)));

  if (eligible.length === 0) return null;

  const exact = eligible.find((post) => dayKey(post.date) === dateKey);
  if (exact) return { post: exact, exact: true };
  return { post: eligible[0], exact: false };
}
