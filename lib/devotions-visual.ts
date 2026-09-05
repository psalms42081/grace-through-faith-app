import { PathB } from "@/constants/colors";

/**
 * Voice of the Week wash.
 * Sabbath sea-glass (#DFF6F2) is used around the app but is not a named token
 * in constants/colors.ts (only catSabbath ink #2A8C82 and ssGradient).
 * Use PathB.catPlans violet at 10% so the card reads live — not slate catBible,
 * and not ODB amber or EGW oat.
 */
export const VOTW_CATEGORY_TOKEN = "catPlans" as const;
export const VOTW_CATEGORY_HEX = PathB.catPlans;
export const VOTW_CARD_TINT = "rgba(110, 79, 184, 0.10)";
/** catPlans #6E4FB8 at 10% on white — solid equivalent of VOTW_CARD_TINT. */
export const VOTW_WASH_ON_WHITE = "#F0EDF8";

export const DEVOTIONS_CORAL_LINKS = {
  browseShelf: { label: "Browse the shelf", href: "/pioneer-shelf" },
  allSeries: { label: "All series", href: "/devotionals" },
  allPlans: { label: "All plans", href: "/plans" },
} as const;

/** Home Daily Rhythm illustration scale (44 disc / 28 art). */
export const HOME_RHYTHM_ILLUSTRATION = { disc: 44, image: 28 } as const;

/** List-row line icons: Lucide 1.5px stroke, PathB.ink at 70%. */
export const SERIES_ROW_ICON = {
  strokeWidth: 1.5,
  color: "rgba(31, 26, 18, 0.70)",
  size: 20,
} as const;

export const DEVOTIONS_SECTION_HEADINGS = [
  { title: "Daily Reading", subtitle: "A short pause for the day" },
  { title: "Inspiration", subtitle: "Pioneer writings and Ellen White" },
  { title: "Devotional Series", subtitle: "Scripture, context, and a prayerful response" },
  { title: "Reading Plans", subtitle: "A steady way through Scripture" },
  { title: "Your Shelf", subtitle: "Finished journeys worth remembering" },
] as const;

export type SeriesArtKey =
  | "doctrine"
  | "prophecy"
  | "end-times"
  | "prayer"
  | "health"
  | "sabbath"
  | "youth"
  | "family"
  | "relationships"
  | "forgiveness"
  | "identity"
  | "new-believers"
  | "spiritual-growth"
  | "mental-health"
  | "seasonal";

/** Lucide export names — one line icon per named series category/theme. */
export type SeriesRowIconName =
  | "Sunrise"
  | "Anchor"
  | "Heart"
  | "HandHeart"
  | "Flame"
  | "User"
  | "Users"
  | "Leaf"
  | "Sprout"
  | "Scroll"
  | "Church"
  | "BookOpen";

const SERIES_ART_RULES: { key: SeriesArtKey; needles: string[] }[] = [
  { key: "end-times", needles: ["end time", "end-times", "second coming"] },
  { key: "prophecy", needles: ["prophecy", "fulfillment", "daniel", "revelation"] },
  { key: "new-believers", needles: ["new believer", "new in christ", "first steps"] },
  { key: "mental-health", needles: ["mental", "anxiety", "depression"] },
  { key: "relationships", needles: ["relationship"] },
  { key: "forgiveness", needles: ["forgiv"] },
  { key: "sabbath", needles: ["sabbath"] },
  { key: "prayer", needles: ["prayer"] },
  { key: "health", needles: ["health", "healing"] },
  { key: "youth", needles: ["youth", "teen", "young"] },
  { key: "family", needles: ["family", "parent"] },
  { key: "identity", needles: ["identity", "character"] },
  { key: "seasonal", needles: ["seasonal", "lent"] },
  { key: "doctrine", needles: ["doctrine", "christology", "belief", "kingdom"] },
  {
    key: "spiritual-growth",
    needles: ["spiritual", "comfort", "encouragement", "faith", "perseverance", "warfare", "growth"],
  },
];

/**
 * Keyword → Lucide. Specific themes before faith/strength so titles like
 * "Grace Upon Grace" (theme grace,faith) keep HandHeart, not Anchor.
 * Dove and Mirror are not lucide-react-native exports.
 */
const SERIES_ROW_ICON_RULES: { icon: SeriesRowIconName; needles: string[] }[] = [
  { icon: "Sunrise", needles: ["hope", "death", "resurrection"] },
  { icon: "HandHeart", needles: ["grace"] },
  { icon: "Heart", needles: ["peace", "comfort"] },
  { icon: "Flame", needles: ["prayer"] },
  { icon: "User", needles: ["identity"] },
  { icon: "Users", needles: ["relationship"] },
  { icon: "Leaf", needles: ["seasonal"] },
  { icon: "Sprout", needles: ["spiritual growth", "spiritual-growth", "spiritual"] },
  { icon: "Scroll", needles: ["prophecy", "prophetic", "prophecies"] },
  { icon: "Church", needles: ["sanctuary"] },
  { icon: "Anchor", needles: ["faith", "strength"] },
];

function haystack(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ")
    .toLowerCase();
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

export const VOTW_EYEBROW_CONTRAST = contrastRatio(VOTW_CATEGORY_HEX, VOTW_WASH_ON_WHITE);

/** Map a series theme/category/title to a plan illustration key. Null = no illustration. */
export function resolveSeriesArtKey(input: {
  theme?: string | null;
  category?: string | null;
  title?: string | null;
}): SeriesArtKey | null {
  const text = haystack([input.theme, input.category, input.title]);
  if (!text) return null;
  for (const rule of SERIES_ART_RULES) {
    if (rule.needles.some((needle) => text.includes(needle))) {
      return rule.key;
    }
  }
  return null;
}

/**
 * Category line icon for list rows. Never empty — unknown categories use BookOpen.
 * Illustrations stay off list rows.
 */
export function resolveSeriesRowIconName(input: {
  theme?: string | null;
  category?: string | null;
  title?: string | null;
}): SeriesRowIconName {
  const text = haystack([input.theme, input.category, input.title]);
  if (!text) return "BookOpen";
  for (const rule of SERIES_ROW_ICON_RULES) {
    if (rule.needles.some((needle) => text.includes(needle))) {
      return rule.icon;
    }
  }
  return "BookOpen";
}

/** Category-token wash + ink when no illustration matches. */
export function seriesArtFallback(category?: string | null): { tint: string; ink: string } {
  const c = (category || "").toLowerCase();
  if (c.includes("sabbath") || c.includes("comfort") || c.includes("prayer")) {
    return { tint: "#DFF6F2", ink: PathB.catSabbath };
  }
  if (c.includes("health") || c.includes("mental") || c.includes("spiritual") || c.includes("growth")) {
    return { tint: "#E7F2DF", ink: PathB.catHealth };
  }
  if (c.includes("bible") || c.includes("scripture") || c.includes("prophec") || c.includes("warfare")) {
    return { tint: "#E4E9F5", ink: PathB.catBible };
  }
  if (c.includes("plan") || c.includes("doctrine") || c.includes("christolog") || c.includes("kingdom") || c.includes("foundations")) {
    return { tint: "#EAE6FA", ink: PathB.catPlans };
  }
  return { tint: "#FFF0D9", ink: PathB.catEGW };
}
