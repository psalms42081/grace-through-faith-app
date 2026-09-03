export const PIONEER_EXAMPLE_READING_ID = "votw-waggoner-chr-ch1";
export const PIONEER_EXAMPLE_WORD_BUDGET = 800;

export type PublishedReadingCandidate = {
  id: string;
  weekStart: string | null;
  sortOrder: number;
};

export function slicePioneerParagraphs(
  paragraphs: string[],
  start: number,
  end: number,
): string[] {
  if (paragraphs.length === 0) return [];
  const from = Math.min(paragraphs.length, Math.max(1, Math.floor(start)));
  const to = Math.min(paragraphs.length, Math.max(from, Math.floor(end)));
  return paragraphs.slice(from - 1, to);
}

export function paragraphEndForWordBudget(
  paragraphs: string[],
  budget = PIONEER_EXAMPLE_WORD_BUDGET,
): number {
  if (paragraphs.length === 0) return 1;
  let words = 0;
  for (let i = 0; i < paragraphs.length; i += 1) {
    words += paragraphs[i]
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    if (words >= budget) return i + 1;
  }
  return paragraphs.length;
}

export function selectPioneerWeekReading<T extends PublishedReadingCandidate>(
  readings: T[],
  sabbathDate: string,
): T | null {
  if (readings.length === 0) return null;
  const forWeek = readings
    .filter((row) => row.weekStart === sabbathDate)
    .sort(compareReadings);
  if (forWeek[0]) return forWeek[0];

  const dated = readings
    .filter((row) => row.weekStart)
    .sort((a, b) => {
      const dateCmp = (b.weekStart || "").localeCompare(a.weekStart || "");
      if (dateCmp !== 0) return dateCmp;
      return compareReadings(a, b);
    });
  if (dated[0]) return dated[0];

  return [...readings].sort(compareReadings)[0] ?? null;
}

function compareReadings(
  a: PublishedReadingCandidate,
  b: PublishedReadingCandidate,
): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.id.localeCompare(b.id);
}
