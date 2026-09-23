// Path B Home v2 — local daily content.
// Reflections live in daily-reflections.ts. The legacy Home imports them from here.

import { DAILY_REFLECTIONS } from "./daily-reflections";

export { DAILY_REFLECTIONS } from "./daily-reflections";

export const DAILY_VERSE_REFERENCES = [
  "John 3:16",
  "Psalm 23:1",
  "Proverbs 3:5",
  "Philippians 4:13",
  "Joshua 1:9",
  "Isaiah 40:31",
  "Romans 8:28",
];

/** Days before the same reflection returns. Equals the pool length. */
export const REFLECTION_REPEAT_GAP_DAYS = 84;

export type HomeDaypart = "morning" | "afternoon" | "evening";

export interface HomeLocalDay {
  dateKey: string;
  dayIndex: number;
  daypart: HomeDaypart;
  dateLine: string;
  dayLabel: string;
  sabbathSchoolDayNumber: number;
}

export function getHomeLocalDay(now = new Date()): HomeLocalDay {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const dayIndex =
    Math.floor(
      (Date.UTC(year, month, day) - Date.UTC(year, 0, 1)) / 86400000,
    ) + 1;
  const hour = now.getHours();

  return {
    dateKey: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    dayIndex,
    daypart: hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening",
    dateLine: now.toLocaleDateString("en-AU", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    dayLabel: now.toLocaleDateString("en-AU", { weekday: "long" }),
    sabbathSchoolDayNumber: ((now.getDay() + 1) % 7) + 1,
  };
}

export function cleanGreetingFirstName(displayName?: string | null): string | null {
  const first = displayName?.trim().split(/\s+/)[0] ?? "";
  return /[\p{L}\p{N}]/u.test(first) ? first : null;
}

export function formatGreeting(base: string, displayName?: string | null): string {
  const first = cleanGreetingFirstName(displayName);
  return first ? `${base}, ${first}` : `${base.replace(/[,.…\s]+$/u, "")}.`;
}

/** Named greeting only when it fits the measured line; otherwise the base with a full stop. */
export function greetingThatFits(
  base: string,
  displayName: string | null | undefined,
  namedWidth: number,
  slotWidth: number,
): string {
  const plain = formatGreeting(base, null);
  if (!cleanGreetingFirstName(displayName)) return plain;
  if (slotWidth <= 0 || namedWidth <= 0) return plain;
  return namedWidth <= slotWidth ? formatGreeting(base, displayName) : plain;
}

export function parseBibleReference(reference: string): {
  bookName: string;
  chapterNumber: number;
} {
  const match = reference.trim().match(/^(.*?)\s+(\d+):\d+(?:-\d+)?$/);
  if (!match) {
    throw new Error(`Home reflection has an invalid Bible reference: ${reference}`);
  }
  return { bookName: match[1].trim(), chapterNumber: Number(match[2]) };
}

function normalizedBibleBookName(name: string): string {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized === "psalm" ? "psalms" : normalized;
}

export function bibleBookNamesMatch(referenceName: string, canonicalName: string): boolean {
  return normalizedBibleBookName(referenceName) === normalizedBibleBookName(canonicalName);
}

export function assertReflectionReadingAlignment(
  reflectionReference: string,
  readingTarget: {
    reference: string;
    bookName: string;
    chapterNumber: number;
  },
): void {
  const parsed = parseBibleReference(reflectionReference);
  if (
    reflectionReference !== readingTarget.reference ||
    parsed.bookName.toLowerCase() !== readingTarget.bookName.toLowerCase() ||
    parsed.chapterNumber !== readingTarget.chapterNumber
  ) {
    throw new Error(
      `Home reflection/reading mismatch: ${reflectionReference} !== ${readingTarget.reference}`,
    );
  }
}

export function dayOfYear(now = new Date()): number {
  return getHomeLocalDay(now).dayIndex;
}

export function getTodaysVerse(dayIndex = dayOfYear()) {
  return {
    reference:
      DAILY_VERSE_REFERENCES[dayIndex % DAILY_VERSE_REFERENCES.length],
  };
}

export function getTodaysReflection(dayIndex = dayOfYear()) {
  const count = DAILY_REFLECTIONS.length;
  const index = ((dayIndex % count) + count) % count;
  return DAILY_REFLECTIONS[index];
}
