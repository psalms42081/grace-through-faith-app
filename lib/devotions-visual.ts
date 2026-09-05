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

/** Lucide export names — one line icon per catalog series, plus category fallbacks. */
export type SeriesRowIconName =
  | "Sunrise"
  | "Sun"
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
  | "Shield"
  | "Lightbulb"
  | "Moon"
  | "Eye"
  | "Footprints"
  | "Feather"
  | "Landmark"
  | "Cross"
  | "Music"
  | "Mountain"
  | "BookOpen";

export type CatalogSeriesRowIcon = {
  slug: string;
  title: string;
  icon: SeriesRowIconName;
};

/** Stable lookup key for series slug, id, or title (apostrophes and punctuation dropped). */
export function seriesRowKey(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * One Lucide icon per approved catalog series, keyed by stable title slug.
 * Plan IDs are UUIDs at seed time, so slug + title are the durable keys.
 */
export const CATALOG_SERIES_ROW_ICONS: readonly CatalogSeriesRowIcon[] = [
  { slug: "foundations-of-faith", title: "Foundations of Faith", icon: "Landmark" },
  { slug: "the-life-of-christ", title: "The Life of Christ", icon: "Cross" },
  { slug: "psalms-of-comfort", title: "Psalms of Comfort", icon: "Music" },
  { slug: "women-of-the-bible", title: "Women of the Bible", icon: "Users" },
  { slug: "prophets-and-prophecy", title: "Prophets and Prophecy", icon: "Eye" },
  { slug: "parables-of-jesus", title: "Parables of Jesus", icon: "Sprout" },
  { slug: "walking-through-the-wilderness", title: "Walking Through the Wilderness", icon: "Footprints" },
  { slug: "the-armor-of-god", title: "The Armor of God", icon: "Shield" },
  { slug: "the-sabbath-rest", title: "The Sabbath Rest", icon: "Moon" },
  { slug: "daniels-prophecies-end-time-visions", title: "Daniel's Prophecies — End-Time Visions", icon: "Scroll" },
  { slug: "gods-health-blueprint", title: "God's Health Blueprint", icon: "Leaf" },
  { slug: "the-heavenly-sanctuary", title: "The Heavenly Sanctuary", icon: "Church" },
  { slug: "death-sleep-and-resurrection", title: "Death, Sleep, and Resurrection", icon: "Sunrise" },
  { slug: "a-life-of-prayer", title: "A Life of Prayer", icon: "Flame" },
  { slug: "wisdom-for-life", title: "Wisdom for Life", icon: "Lightbulb" },
  { slug: "gods-unfailing-love", title: "God's Unfailing Love", icon: "Heart" },
  { slug: "living-in-hope", title: "Living in Hope", icon: "Sun" },
  { slug: "strength-in-weakness", title: "Strength in Weakness", icon: "Anchor" },
  { slug: "finding-peace", title: "Finding Peace", icon: "Feather" },
  { slug: "grace-upon-grace", title: "Grace Upon Grace", icon: "HandHeart" },
  { slug: "the-sermon-on-the-mount", title: "The Sermon on the Mount", icon: "Mountain" },
];

/** Extra slugs that should resolve to the same catalog row (short titles, no leading "the"). */
const SERIES_ROW_ICON_SLUG_ALIASES: Record<string, string> = {
  "daniels-prophecies": "daniels-prophecies-end-time-visions",
  "heavenly-sanctuary": "the-heavenly-sanctuary",
  "armor-of-god": "the-armor-of-god",
  "sabbath-rest": "the-sabbath-rest",
  "life-of-christ": "the-life-of-christ",
  "sermon-on-the-mount": "the-sermon-on-the-mount",
};

const SERIES_ROW_ICON_BY_SLUG: Record<string, SeriesRowIconName> = Object.fromEntries(
  CATALOG_SERIES_ROW_ICONS.flatMap((entry) => [
    [entry.slug, entry.icon],
    [seriesRowKey(entry.title), entry.icon],
  ]),
);

for (const [alias, canonical] of Object.entries(SERIES_ROW_ICON_SLUG_ALIASES)) {
  const icon = SERIES_ROW_ICON_BY_SLUG[canonical];
  if (icon) SERIES_ROW_ICON_BY_SLUG[alias] = icon;
}

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
 * Category/theme fallback when a series is not in CATALOG_SERIES_ROW_ICONS.
 * Specific themes before faith/strength so "grace,faith" keeps HandHeart.
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
  { icon: "Shield", needles: ["spiritual warfare", "warfare"] },
  { icon: "Moon", needles: ["sabbath", "rest"] },
  { icon: "Lightbulb", needles: ["wisdom"] },
  { icon: "Sprout", needles: ["spiritual growth", "spiritual-growth", "spiritual"] },
  { icon: "Scroll", needles: ["prophecy", "prophetic", "prophecies"] },
  { icon: "Church", needles: ["sanctuary", "heavenly sanctuary"] },
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
 * Series-row subtitle. Comma-tag strings ("faith,strength") become
 * "Faith, Strength". Proper labels ("Core Doctrines") stay as stored.
 */
export function formatSeriesRowThemeLabel(raw: string | null | undefined): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "Guided devotional";
  if (!trimmed.includes(",") && /\s/.test(trimmed)) return trimmed;
  return trimmed
    .split(",")
    .map((tag) => {
      const word = tag.trim();
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(", ");
}

/**
 * Per-series line icon for list rows. Look up slug/id/title first so two
 * prophetic series never share Scroll. Unknown series fall back to the
 * category/theme keyword map, then BookOpen. Illustrations stay off list rows.
 */
export function resolveSeriesRowIconName(input: {
  id?: string | null;
  slug?: string | null;
  theme?: string | null;
  category?: string | null;
  title?: string | null;
}): SeriesRowIconName {
  const keys = [input.slug, input.id, input.title]
    .flatMap((value) => {
      const key = seriesRowKey(value);
      if (!key) return [];
      const beforeDash = key.split("-end-time-")[0];
      const alias = SERIES_ROW_ICON_SLUG_ALIASES[key] ?? SERIES_ROW_ICON_SLUG_ALIASES[beforeDash];
      return alias ? [key, alias, beforeDash] : [key, beforeDash];
    })
    .filter((key, index, all) => all.indexOf(key) === index);

  for (const key of keys) {
    const icon = SERIES_ROW_ICON_BY_SLUG[key];
    if (icon) return icon;
  }

  const text = haystack([input.theme, input.category]);
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
