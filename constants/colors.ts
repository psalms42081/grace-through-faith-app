const gold = "#C9933A";
const coral = "#E8604C";
const navy = "#1A1F3C";
const parchment = "#F5EFE0";
const ink = "#2C1810";

const Colors = {
  light: {
    background: parchment,
    backgroundSecondary: "#FFF8EC",
    backgroundCard: "#FFFDF6",
    backgroundElevated: "#FFFFFF",
    surface: "#FFFFFF",
    text: ink,
    textSecondary: "#7A6855",
    textMuted: "#A89880",
    accent: coral,
    accentDark: "#C24431",
    accentSoft: "rgba(232,96,76,0.08)",
    primary: navy,
    border: "#DDD0B8",
    borderLight: "#EDE5D5",
    tint: coral,
    tabIconDefault: "#A89880",
    tabIconSelected: coral,
    divider: "#E8DCC8",
    error: "#C0392B",
    danger: "#C0392B",
    success: "#2E7D32",
    bookmarkBlue: "#2563EB",
    highlightYellow: "rgba(255, 215, 0, 0.35)",
    highlightPink: "rgba(255, 150, 150, 0.35)",
    shimmer1: "#EDE5D5",
    shimmer2: "#F5EFE0",
  },
  dark: {
    background: "#050507",
    backgroundSecondary: "#191A25",
    backgroundCard: "#21222E",
    backgroundElevated: "#292A38",
    surface: "#21222E",
    text: "#F0EBE0",
    textSecondary: "#9A8E7A",
    textMuted: "#6A6070",
    accent: gold,
    accentDark: "#A87828",
    accentSoft: "rgba(201,147,58,0.08)",
    primary: "#1A1B26",
    border: "#2C2D3A",
    borderLight: "#22232E",
    tint: gold,
    tabIconDefault: "#6A6070",
    tabIconSelected: gold,
    divider: "#262732",
    error: "#E57373",
    danger: "#E57373",
    success: "#66BB6A",
    bookmarkBlue: "#60A5FA",
    highlightYellow: "rgba(255, 215, 0, 0.20)",
    highlightPink: "rgba(255, 150, 150, 0.20)",
    shimmer1: "#21222E",
    shimmer2: "#191A25",
  },
};

function getSabbathTheme(base: typeof Colors.dark | typeof Colors.light, isDark: boolean) {
  // Sabbath chrome inherits accent/tint from the base theme (Path B coral on light).
  // Gold #D4A245 is reserved for candle/sunset glyphs — not buttons, chips, or labels.
  if (isDark) {
    return {
      ...base,
      background: "#080806",
      backgroundSecondary: "#0E0D09",
      backgroundCard: "#16150F",
      backgroundElevated: "#1E1D16",
      surface: "#16150F",
      border: "#1F1E17",
      borderLight: "#181710",
    };
  }
  return {
    ...base,
    background: "#F7F0E0",
    backgroundSecondary: "#FFF6E4",
    backgroundCard: "#FFFBF0",
  };
}

// ── Path B (light) tokens — v12 light-first redesign ─────────────────────────
// Added alongside legacy tokens (90+ screens still reference Colors above —
// do not delete old tokens until every screen has migrated).
// ⚠️ Production ink is #1F1A12. Some canvas frames used a blue token as a
// rendering workaround — never port that blue.
const PathB = {
  surface: "#FBF7EE", // app background, light default
  surfaceCard: "#FFFFFF", // card surfaces
  ink: "#1F1A12", // primary text
  inkMuted: "#8A8A8A", // secondary text, metadata
  coral: "#E8604C", // brand accent: primary buttons, active tab, streak, progress
  coralInk: "#C24431", // small coral text (eyebrows, active tab labels) — WCAG-safe
  gold: "#C9933A", // heritage: streak flame + analytics only
  // Category tokens
  catSabbath: "#2A8C82", // teal — Sabbath School
  catEGW: "#C77A2B", // amber — EGW / devotionals
  catPlans: "#6E4FB8", // violet — Reading Plans
  catBible: "#5B6B7A", // blue-grey — Bible
  catSignpost: "#3A6FA8", // blue — Signposts/topics
  catHealth: "#7A9B76", // sage
  catSun: "#E8C25C", // soft yellow
  // SS gradient (deep teal → sea-green)
  ssGradient: ["#1F7A70", "#4CAF8E"] as const,
};

export { getSabbathTheme, PathB };
export default Colors;
