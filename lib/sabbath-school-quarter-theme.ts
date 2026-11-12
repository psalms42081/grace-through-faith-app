export const SABBATH_SCHOOL_FALLBACK_COLOR = "#1F7A70";
export const SABBATH_SCHOOL_PENDING_SURFACE = "#1F1A12";

export interface SabbathSchoolQuarterTheme {
  primary: string;
  gradient: readonly [string, string];
  tint: string;
  border: string;
}

function normalizeHexColor(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const short = raw.match(/^#([0-9a-f]{3})$/i);
  if (short) {
    return `#${short[1]
      .split("")
      .map((part) => part + part)
      .join("")
      .toUpperCase()}`;
  }
  const full = raw.match(/^#([0-9a-f]{6})$/i);
  return full ? `#${full[1].toUpperCase()}` : null;
}

function channels(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function toHex(values: [number, number, number]): string {
  return `#${values
    .map((value) => Math.round(value).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function mixWithBlack(hex: string, amount: number): string {
  return toHex(channels(hex).map((value) => value * (1 - amount)) as [number, number, number]);
}

function relativeLuminance(hex: string): number {
  const linear = channels(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function whiteContrast(hex: string): number {
  return 1.05 / (relativeLuminance(hex) + 0.05);
}

function ensureWhiteTextContrast(hex: string): string {
  let safe = hex;
  for (let step = 0; step < 8 && whiteContrast(safe) < 4.5; step += 1) {
    safe = mixWithBlack(hex, (step + 1) * 0.08);
  }
  return whiteContrast(safe) >= 4.5 ? safe : SABBATH_SCHOOL_FALLBACK_COLOR;
}

export function getSabbathSchoolQuarterTheme(
  colorPrimary?: string | null,
): SabbathSchoolQuarterTheme {
  const normalized = normalizeHexColor(colorPrimary);
  const primary = ensureWhiteTextContrast(
    normalized ?? SABBATH_SCHOOL_FALLBACK_COLOR,
  );

  return {
    primary,
    gradient: [primary, mixWithBlack(primary, 0.16)],
    tint: `${primary}14`,
    border: `${primary}40`,
  };
}

function withAlpha(hex: string, alpha: number): string {
  const [red, green, blue] = channels(hex);
  return `rgba(${red},${green},${blue},${alpha})`;
}

export interface SabbathSchoolSplashScrim {
  /** Quarterly colour at about 35% — the top-right, where the artwork shows. */
  light: string;
  /** Quarterly colour at about 80% — the left side, behind the title and switch. */
  strong: string;
  /** Same colour, fully clear, so gradients fade instead of turning black. */
  clear: string;
  /** Extra quarterly tint along the bottom, behind the buttons. */
  bottom: string;
}

/** Soft shadow so white words stay readable on the lighter splash. */
export const SABBATH_SCHOOL_SPLASH_TEXT_SHADOW = {
  textShadowColor: "rgba(0,0,0,0.55)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 8,
};

/**
 * Quarterly-coloured veil. Light at the top-right so the picture stays
 * visible; stronger down the left and along the bottom where the words sit.
 */
export function sabbathSchoolSplashScrim(
  colorPrimary?: string | null,
): SabbathSchoolSplashScrim {
  const primary = getSabbathSchoolQuarterTheme(colorPrimary).primary;
  return {
    light: withAlpha(primary, 0.35),
    strong: withAlpha(primary, 0.8),
    clear: withAlpha(primary, 0),
    bottom: withAlpha(primary, 0.22),
  };
}