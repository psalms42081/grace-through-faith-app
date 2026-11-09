const SUPERSCRIPT_DIGITS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

/** Footnote digits as superscript characters, so they don't change the paragraph line height. */
export function footnoteSuperscript(digits: string): string {
  return digits.replace(/\d/g, (digit) => SUPERSCRIPT_DIGITS[Number(digit)] ?? digit);
}

/**
 * A bare footnote number sitting immediately before a scripture citation,
 * e.g. "10 Exodus 40:38". The number itself is not a link.
 */
export function splitLeadingFootnote(gap: string): { plain: string; digits: string | null } {
  const match = /(\d{1,3})\s+$/.exec(gap);
  if (!match || match.index == null || !match[1]) return { plain: gap, digits: null };
  if (match.index > 0 && /\d/.test(gap.charAt(match.index - 1))) {
    return { plain: gap, digits: null };
  }
  return { plain: gap.slice(0, match.index), digits: match[1] };
}
