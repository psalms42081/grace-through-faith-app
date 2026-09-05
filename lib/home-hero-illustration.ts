/**
 * Daily Home hero illustrations (Verse / Signpost / Reflection).
 * Motifs from the existing 26-asset set — no dove in that set.
 */
export const HERO_VERSE_ILLUSTRATION_LIST = [
  { id: "lamp", file: "plan-prayer.png", label: "lamp" },
  { id: "candle", file: "rhythm-reflection.png", label: "candle" },
  { id: "sunburst", file: "rhythm-morning.png", label: "sunburst" },
  { id: "open-book", file: "rhythm-plan.png", label: "open book" },
  { id: "olive", file: "plan-health.png", label: "olive branch" },
  { id: "path", file: "plan-youth.png", label: "path" },
] as const;

export type HeroVerseIllustrationId =
  (typeof HERO_VERSE_ILLUSTRATION_LIST)[number]["id"];

export type HeroIllustrationTab = "verse" | "signpost" | "reflection";

const TAB_OFFSET: Record<HeroIllustrationTab, number> = {
  verse: 0,
  signpost: 1,
  reflection: 2,
};

export function heroIllustrationForDay(
  dayIndex: number,
  tab: HeroIllustrationTab,
): (typeof HERO_VERSE_ILLUSTRATION_LIST)[number] {
  const n = HERO_VERSE_ILLUSTRATION_LIST.length;
  const base = ((dayIndex % n) + n) % n;
  const index = (base + TAB_OFFSET[tab]) % n;
  return HERO_VERSE_ILLUSTRATION_LIST[index];
}
