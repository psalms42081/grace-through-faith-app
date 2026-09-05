/**
 * Daily Home hero illustrations (Verse / Signpost / Reflection).
 * Motifs from the existing 26-asset set, each transparent and 1:1.
 * Five scripture motifs, no repeats and no gold. The sixth slot held
 * rhythm-listen.png (coral headphones) for a while; a media motif read wrong
 * beside lamp/candle/sunburst/olive/path, so the list is deliberately five.
 * Keep it at five or more — TAB_OFFSET below assumes the list can hold three
 * distinct entries.
 */
export const HERO_VERSE_ILLUSTRATION_LIST = [
  { id: "lamp", file: "plan-prayer.png", label: "lamp" },
  { id: "candle", file: "rhythm-reflection.png", label: "candle" },
  { id: "sunburst", file: "rhythm-morning.png", label: "sunburst" },
  { id: "olive", file: "plan-health.png", label: "olive branch" },
  { id: "path", file: "plan-youth.png", label: "path" },
] as const;

export type HeroVerseIllustrationId =
  (typeof HERO_VERSE_ILLUSTRATION_LIST)[number]["id"];

export type HeroIllustrationTab = "verse" | "signpost" | "reflection";

/**
 * Consecutive offsets, so on any day the three tabs land on three consecutive
 * entries of the list. With a list of length n >= 3 the residues
 * (base+0), (base+1), (base+2) mod n are pairwise distinct — their pairwise
 * differences are 1, 1 and 2, none of which is 0 mod n — so the three tabs can
 * never collide. At n = 5 that leaves two entries unseen each day and the whole
 * list cycles every 5 days.
 */
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

/**
 * Every rotation asset is a 1024x1024 square. HeroCard multiplies the measured
 * art column width by this to get an explicit pixel height, because
 * react-native-web ignores `aspectRatio` on `Image` and falls back to the
 * intrinsic 1024px height. home-hero-coherence.test.ts pins this against the
 * PNG headers on disk so a non-square asset fails loudly.
 */
export const HERO_ART_ASPECT = 1;

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
