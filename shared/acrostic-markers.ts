/**
 * Some local texts (BBE) open each Psalm 119 stanza with the Hebrew letter in angle
 * brackets, stored HTML-escaped: "&lt;ALEPH&gt; Happy are they…". Printed editions set
 * these as stanza headings, so they become acrostic headings instead of verse text.
 */
const LEADING_MARKER = /^\s*(?:&lt;|<)([A-Z]{2,8})(?:&gt;|>)\s*/;

export interface AcrosticHeading {
  text: string;
  beforeVerse: number;
  kind: "qa";
}

function titleCase(letter: string): string {
  return letter.charAt(0) + letter.slice(1).toLowerCase();
}

/** Verse text without a leading letter marker. */
export function stripAcrosticMarker(text: string): string {
  return text.replace(LEADING_MARKER, "");
}

export function extractAcrosticHeadings<T extends { verse: number; text: string }>(
  verses: T[],
): { verses: T[]; headings: AcrosticHeading[] } {
  const headings: AcrosticHeading[] = [];
  const cleaned = verses.map((verse) => {
    const match = LEADING_MARKER.exec(verse.text);
    if (!match) return verse;
    headings.push({ text: titleCase(match[1]), beforeVerse: verse.verse, kind: "qa" });
    return { ...verse, text: verse.text.slice(match[0].length) };
  });
  return { verses: cleaned, headings };
}
