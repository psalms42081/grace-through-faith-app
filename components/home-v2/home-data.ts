// Path B Home v2 — local daily content.
// Copied from app/(tabs)/index.tsx (monolith is under a "do not restructure" rule,
// so these are duplicated rather than exported from the route file).
// If the monolith's lists change, mirror the change here until index-legacy retires.

export const DAILY_VERSE_REFERENCES = [
  "John 3:16",
  "Psalm 23:1",
  "Proverbs 3:5",
  "Philippians 4:13",
  "Joshua 1:9",
  "Isaiah 40:31",
  "Romans 8:28",
];

export const DAILY_REFLECTIONS = [
  { thought: "Grace is not a doctrine to be memorised but a Person to be embraced. Today, let Christ's unmerited favour reshape every anxious thought.", reference: "Ephesians 2:8-9" },
  { thought: "The cross does not merely pardon the past; it empowers the present. Walk today in the strength of the One who conquered death.", reference: "Galatians 2:20" },
  { thought: "Sabbath rest is heaven's rhythm set in time \u2014 a weekly reminder that our worth is not in what we produce but in Whose we are.", reference: "Exodus 20:8-11" },
  { thought: "Prayer is not convincing God to act; it is aligning our hearts with the One who is already working all things for good.", reference: "Romans 8:28" },
  { thought: "When we behold Christ, we become like Him \u2014 not by straining to imitate, but by gazing until His character becomes our own.", reference: "2 Corinthians 3:18" },
  { thought: "Hope is not wishful thinking. It is the anchor of the soul, fastened to the promise of a God who cannot lie.", reference: "Hebrews 6:19" },
  { thought: "Love your neighbour not because they deserve it, but because you have been loved beyond all deserving. Grace received becomes grace given.", reference: "1 John 4:19" },
];

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
  return DAILY_REFLECTIONS[dayIndex % DAILY_REFLECTIONS.length];
}
