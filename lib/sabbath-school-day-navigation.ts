export interface SabbathSchoolDayNavigatorDay {
  dayNumber: number;
  date: string | null;
}

export interface SabbathSchoolDayNavigatorItem {
  dayNumber: number;
  label: string;
  shortLabel: string;
}

const DAY_NAME_FALLBACK = [
  "Sabbath",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Sabbath",
];

export function weekdayNameForSabbathSchoolDay(
  day: SabbathSchoolDayNavigatorDay,
): string {
  const dateMatch = (day.date || "").match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
  );

  if (dateMatch) {
    const [, dd, mm, yyyy] = dateMatch;
    const parsed = new Date(
      Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)),
    );
    if (!Number.isNaN(parsed.getTime())) {
      return WEEKDAY_NAMES[parsed.getUTCDay()];
    }
  }

  return DAY_NAME_FALLBACK[day.dayNumber - 1] || `Day ${day.dayNumber}`;
}

export function buildSabbathSchoolDayNavigator(
  days: SabbathSchoolDayNavigatorDay[],
): SabbathSchoolDayNavigatorItem[] {
  return [...days]
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => {
      const label = weekdayNameForSabbathSchoolDay(day);
      return {
        dayNumber: day.dayNumber,
        label,
        shortLabel: label.slice(0, 3).toUpperCase(),
      };
    });
}

export function buildSabbathSchoolDayRoute({
  lessonNumber,
  dayNumber,
  quarterCode,
}: {
  lessonNumber: number;
  dayNumber: number;
  quarterCode?: string;
}): string {
  const query = new URLSearchParams({
    lessonNumber: String(lessonNumber),
    dayNumber: String(dayNumber),
  });
  if (quarterCode) query.set("quarterCode", quarterCode);
  return `/(tabs)/ss/sabbath-school-day?${query.toString()}`;
}