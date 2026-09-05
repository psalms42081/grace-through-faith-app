import { getCalendarDate } from "../shared/calendar-date";

export const ODB_AFTERNOON_HINT =
  "Today's reading arrives each afternoon (Australian time)";

function servedDateKey(servedDate: string | Date): string | null {
  if (servedDate instanceof Date) {
    if (Number.isNaN(servedDate.getTime())) return null;
    return localDateKey(servedDate);
  }

  const key = String(servedDate).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

function localDateKey(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayDateKey(now: Date, timeZone?: string): string {
  if (timeZone) {
    return getCalendarDate(now, timeZone).dateKey;
  }
  return localDateKey(now);
}

/** True when the served ODB calendar date is earlier than today in local time. */
export function shouldShowOdbAfternoonHint(
  servedDate: string | Date | null | undefined,
  now: Date = new Date(),
  timeZone?: string,
): boolean {
  if (servedDate == null || servedDate === "") return false;
  const served = servedDateKey(servedDate);
  if (!served) return false;
  return served < todayDateKey(now, timeZone);
}
