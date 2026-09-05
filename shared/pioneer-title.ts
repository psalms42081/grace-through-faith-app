/** Display-only chapter titles. Never write these back to the database. */

/**
 * Leading chapter marker only:
 * - "02 - …", "02. …", "12: …"
 * - "Chapter 1 — …", "Ch. 3. …"
 * 1–3 digits so years like 1844 stay put. Requires a separator so a title
 * that merely starts with a number is left alone.
 */
const LEADING_CHAPTER_NUMBER =
  /^\s*(?:(?:chapter|ch)\.?\s+)?\d{1,3}\s*[-–—.:)]+\s*/i;

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "nor",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

function isAllCaps(text: string): boolean {
  return /[A-Z]/.test(text) && !/[a-z]/.test(text);
}

function titleCaseWord(word: string, forceCap: boolean): string {
  if (!word) return word;
  if (word.includes("-")) {
    return word
      .split("-")
      .map((part, index) => titleCaseWord(part, forceCap && index === 0))
      .join("-");
  }
  const match = word.match(/^([^A-Za-z]*)([A-Za-z][A-Za-z'’]*)([^A-Za-z]*)$/);
  if (!match) return word;
  const [, lead, body, trail] = match;
  const lower = body.toLowerCase();
  if (!forceCap && SMALL_WORDS.has(lower)) {
    return `${lead}${lower}${trail}`;
  }
  return `${lead}${lower.charAt(0).toUpperCase()}${lower.slice(1)}${trail}`;
}

function toTitleCase(text: string): string {
  const words = text.split(/\s+/);
  return words
    .map((word, index) =>
      titleCaseWord(word, index === 0 || index === words.length - 1),
    )
    .join(" ");
}

export function displayPioneerChapterTitle(raw: string): string {
  if (typeof raw !== "string") return "";
  const stripped = raw.replace(LEADING_CHAPTER_NUMBER, "").trim();
  if (!stripped) return "";
  if (!isAllCaps(stripped)) return stripped;
  return toTitleCase(stripped);
}

/** @deprecated Use displayPioneerChapterTitle */
export const formatPioneerChapterTitle = displayPioneerChapterTitle;
