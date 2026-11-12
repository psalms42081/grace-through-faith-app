import { pacePlanDays, type PlanPaceDay } from "./plan-pacing";

/** How long the last verse must stay on screen before the day counts. */
export const PLAN_END_DWELL_MS = 3000;

export type PlanPart = {
  dayNumber: number;
  bookId: number;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
};

export type PlanReadingSource = "scroll" | "listen";

export type PlanCardStatus = "reading" | "done-today" | "finished";

export function planPartKey(part: Pick<PlanPart, "bookId" | "chapter" | "verseStart" | "verseEnd">): string {
  return `${part.bookId}:${part.chapter}:${part.verseStart ?? 0}:${part.verseEnd ?? 0}`;
}

/**
 * The bottom edge of a measured verse row is inside the viewport.
 * A verse taller than the screen counts only once its last line has been
 * scrolled into view.
 */
export function verseBottomReached(input: {
  verseTop: number;
  verseHeight: number;
  scrollY: number;
  viewportHeight: number;
}): boolean {
  if (input.verseHeight <= 0 || input.viewportHeight <= 0) return false;
  const bottom = input.verseTop + input.verseHeight;
  const viewBottom = input.scrollY + input.viewportHeight;
  return bottom <= viewBottom + 1 && bottom > input.scrollY;
}

/**
 * Where the watched verse ends in the scroll content.
 * A whole chapter ends at the text (content height minus the padding that
 * follows it). A verse range ends that fraction of the way down the text,
 * so a larger text size moves the point farther down the page.
 */
export function passageEndOffset(input: {
  contentHeight: number;
  bottomPadding: number;
  targetVerse: number;
  lastVerse: number;
}): number {
  const textEnd = Math.max(0, input.contentHeight - Math.max(0, input.bottomPadding));
  if (input.lastVerse <= 1 || input.targetVerse >= input.lastVerse) return textEnd;
  return textEnd * (input.targetVerse / input.lastVerse);
}

export function passageEndReached(input: {
  scrollY: number;
  viewportHeight: number;
  contentHeight: number;
  bottomPadding: number;
  targetVerse: number;
  lastVerse: number;
}): boolean {
  if (input.viewportHeight <= 0 || input.contentHeight <= 0) return false;
  const end = passageEndOffset(input);
  return input.scrollY + input.viewportHeight >= end - 1;
}

export function passageLabel(
  bookName: string,
  part: Pick<PlanPart, "chapter" | "verseStart" | "verseEnd">,
): string {
  if (part.verseStart) {
    const end = part.verseEnd && part.verseEnd !== part.verseStart ? `–${part.verseEnd}` : "";
    return `${bookName} ${part.chapter}:${part.verseStart}${end}`;
  }
  return `${bookName} ${part.chapter}`;
}

export function partMatchesReading(
  part: PlanPart,
  event: {
    bookId: number;
    chapter: number;
    verse: number;
    source: PlanReadingSource;
    chapterLastVerse: number;
  },
): boolean {
  if (part.bookId !== event.bookId || part.chapter !== event.chapter) return false;
  if (event.source === "listen") return true;
  const required = part.verseEnd ?? event.chapterLastVerse;
  if (!Number.isInteger(required) || required < 1) return false;
  return event.verse >= required;
}

export function completedDayRows(input: {
  dayNumbers: number[];
  rows: { dayNumber: number; localDate: string | null }[];
  currentDay: number;
  planComplete: boolean;
}): { dayNumber: number; localDate: string | null }[] {
  if (input.rows.length > 0) return input.rows;
  const numbers = [...new Set(input.dayNumbers)].sort((a, b) => a - b);
  if (input.planComplete) {
    return numbers.map((dayNumber) => ({ dayNumber, localDate: null }));
  }
  return numbers
    .filter((dayNumber) => dayNumber < input.currentDay)
    .map((dayNumber) => ({ dayNumber, localDate: null }));
}

export function planCardState(input: {
  dayNumbers: number[];
  completed: { dayNumber: number; localDate: string | null }[];
  today: string;
  focusPartsDone: number;
  focusPartsTotal: number;
}): {
  status: PlanCardStatus;
  focusDay: number | null;
  completedDays: number;
  percent: number;
  partsDone: number;
  partsTotal: number;
  pace: PlanPaceDay[];
} {
  const pace = pacePlanDays({
    dayNumbers: input.dayNumbers,
    completed: input.completed,
    today: input.today,
  });
  const completedDays = pace.filter((day) => day.status === "complete").length;
  const total = pace.length;
  const percent = total === 0 ? 0 : Math.round((completedDays / total) * 100);
  const doneToday = input.completed.find((row) => row.localDate === input.today)?.dayNumber ?? null;
  if (total > 0 && completedDays === total) {
    const last = pace[pace.length - 1]?.dayNumber ?? null;
    return {
      status: "finished",
      focusDay: last,
      completedDays,
      percent,
      partsDone: input.focusPartsTotal,
      partsTotal: input.focusPartsTotal,
      pace,
    };
  }
  if (doneToday != null) {
    return {
      status: "done-today",
      focusDay: doneToday,
      completedDays,
      percent,
      partsDone: input.focusPartsTotal,
      partsTotal: input.focusPartsTotal,
      pace,
    };
  }
  const open = pace.find((day) => day.status === "open") ?? null;
  return {
    status: "reading",
    focusDay: open?.dayNumber ?? null,
    completedDays,
    percent,
    partsDone: input.focusPartsDone,
    partsTotal: input.focusPartsTotal,
    pace,
  };
}
