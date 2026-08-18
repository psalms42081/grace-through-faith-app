// GTF Path B — Track 2 "Light Sweep" pinned light theme.
// Screens converted in this track force this palette instead of useTheme()
// (useTheme currently always returns the dark palette). Shape mirrors
// constants/colors.ts RegularTheme so it can drop in for `theme`.
export const SWEEP_LIGHT = {
  background: "#FBF7EE",
  backgroundSecondary: "#F1EBDD",
  backgroundCard: "#FFFFFF",
  backgroundElevated: "#FFFFFF",
  surface: "#FFFFFF",
  text: "#1F1A12",
  textSecondary: "#3F3A31",
  textMuted: "#6B6660",
  accent: "#E8604C",
  accentDark: "#C24431", // coralInk — small coral text on light surfaces
  accentSoft: "rgba(232,96,76,0.08)",
  primary: "#FFFFFF", // former dark hero surface → flat white card (text must be ink)
  border: "#E7E0D2",
  borderLight: "#F1EBDD",
  tint: "#E8604C",
  tabIconDefault: "#6B6660",
  tabIconSelected: "#E8604C",
  divider: "#EDE6D8",
  error: "#C0392B",
  danger: "#C0392B",
  success: "#2E7D32",
  bookmarkBlue: "#2563EB",
  highlightYellow: "rgba(255, 215, 0, 0.35)",
  highlightPink: "rgba(255, 150, 150, 0.35)",
  shimmer1: "#F1EBDD",
  shimmer2: "#FBF7EE",
} as const;
