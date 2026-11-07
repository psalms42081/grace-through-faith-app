export type PlanPaceStatus = "complete" | "open" | "locked";

export type PlanPaceDay = {
  dayNumber: number;
  status: PlanPaceStatus;
  canComplete: boolean;
};

/**
 * One completion per local calendar day. Completing a day opens the next
 * day for reading, and that next day cannot be marked complete until a
 * later local date. Every day after that stays locked.
 */
export function pacePlanDays(input: {
  dayNumbers: number[];
  completed: { dayNumber: number; localDate: string | null }[];
  today: string;
}): PlanPaceDay[] {
  const numbers = [...new Set(input.dayNumbers)]
    .filter((dayNumber) => Number.isInteger(dayNumber) && dayNumber > 0)
    .sort((a, b) => a - b);
  const completed = new Map<number, string | null>();
  for (const row of input.completed) {
    if (!completed.has(row.dayNumber)) completed.set(row.dayNumber, row.localDate);
  }
  const completedToday = [...completed.values()].some((date) => date === input.today);
  const next = numbers.find((dayNumber) => !completed.has(dayNumber)) ?? null;
  return numbers.map((dayNumber) => {
    if (completed.has(dayNumber)) {
      return { dayNumber, status: "complete", canComplete: false };
    }
    if (dayNumber === next) {
      return { dayNumber, status: "open", canComplete: !completedToday };
    }
    return { dayNumber, status: "locked", canComplete: false };
  });
}
