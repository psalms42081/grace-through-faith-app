import { PathB } from "@/constants/colors";

/** Voice of the Week uses PathB.catBible — unused by ODB amber or EGW oat. */
export const VOTW_CATEGORY_TOKEN = "catBible" as const;
export const VOTW_CATEGORY_HEX = PathB.catBible;

/** Soft wash of catBible (#5B6B7A) at ~12% on white — not a new Path B token. */
export const VOTW_CARD_TINT = "rgba(91, 107, 122, 0.12)";

export const DEVOTIONS_CORAL_LINKS = {
  browseShelf: { label: "Browse the shelf", href: "/pioneer-shelf" },
  allSeries: { label: "All series", href: "/devotionals" },
  allPlans: { label: "All plans", href: "/plans" },
} as const;

/** Home Daily Rhythm illustration scale (44 disc / 28 art). */
export const HOME_RHYTHM_ILLUSTRATION = { disc: 44, image: 28 } as const;

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
  { key: "youth", needles: ["youth", "teen"] },
  { key: "family", needles: ["family", "parent"] },
  { key: "identity", needles: ["identity", "character"] },
  { key: "seasonal", needles: ["seasonal", "lent"] },
  { key: "doctrine", needles: ["doctrine", "christology", "belief", "kingdom"] },
  {
    key: "spiritual-growth",
    needles: ["spiritual", "comfort", "encouragement", "faith", "perseverance", "warfare", "growth"],
  },
];

function haystack(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ")
    .toLowerCase();
}

/** Map a series theme/category/title to a plan illustration key. Null = tinted-disc fallback. */
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

/** Category-token wash + ink when no illustration matches. */
export function seriesArtFallback(category?: string | null): { tint: string; ink: string } {
  const c = (category || "").toLowerCase();
  if (c.includes("sabbath")) return { tint: "#DFF6F2", ink: PathB.catSabbath };
  if (c.includes("health")) return { tint: "#E7F2DF", ink: PathB.catHealth };
  if (c.includes("bible") || c.includes("scripture")) return { tint: "#E4E9F5", ink: PathB.catBible };
  if (c.includes("plan")) return { tint: "#EAE6FA", ink: PathB.catPlans };
  return { tint: "#FFF0D9", ink: PathB.catEGW };
}
