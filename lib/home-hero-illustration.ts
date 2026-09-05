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

/** Text column stays ~62% of the card so copy never sits on the art. */
export const HERO_TEXT_COL_RATIO = 0.62;
export const HERO_TEXT_COL_MIN_RATIO = 0.6;
/** Default art width; phones with a long Signpost drop to the narrow ratio. */
export const HERO_ART_RATIO = 0.32;
export const HERO_ART_RATIO_NARROW = 0.26;
export const HERO_BODY_PAD_LEFT = 24;
const ART_GAP = 12;

/** Prefer 32% art; drop to 26% when 32% would squeeze the text column below 60%. */
export function heroArtRatioForWidth(stageWidth: number): number {
  const textW = stageWidth * HERO_TEXT_COL_RATIO;
  const roomForArt = stageWidth - HERO_BODY_PAD_LEFT - textW - ART_GAP;
  if (roomForArt >= stageWidth * HERO_ART_RATIO) return HERO_ART_RATIO;
  return HERO_ART_RATIO_NARROW;
}
