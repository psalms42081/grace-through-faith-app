/** Collapsed verse-sheet chrome height (handle + ref + actions), excluding tab-bar inset. */
export const VERSE_SHEET_COLLAPSED_HEIGHT = 124;

/** Highlight washes shown on the collapsed verse sheet. */
export const VERSE_SHEET_HIGHLIGHTS = [
  { key: "yellow" as const, bg: "#FFF176", label: "Yellow" },
  { key: "green" as const, bg: "#A5D6A7", label: "Green" },
  { key: "blue" as const, bg: "#90CAF9", label: "Blue" },
  { key: "rose" as const, bg: "#F8BBD0", label: "Rose" },
];

export type VerseSheetHighlightKey = (typeof VERSE_SHEET_HIGHLIGHTS)[number]["key"];

export const VERSE_SHEET_ATTRIBUTION =
  "Tagging: STEP Bible (CC BY 4.0) · Lexicon: Strong's (public domain) · Classic commentaries: public domain";

/** Sheet header uses an ASCII hyphen for ranges, e.g. Psalms 23:1-3. */
export function formatSheetReference(
  bookName: string,
  chapter: number | string,
  verses: number[],
): string {
  const sorted = [...new Set(verses.filter((n) => Number.isFinite(n)))].sort((a, b) => a - b);
  const title = bookName.trim() || "Scripture";
  if (sorted.length === 0) return `${title} ${chapter}`;
  const parts: string[] = [];
  let start = sorted[0]!;
  let prev = start;
  for (let i = 1; i <= sorted.length; i += 1) {
    const next = sorted[i];
    if (next === prev + 1) {
      prev = next;
      continue;
    }
    parts.push(start === prev ? String(start) : `${start}-${prev}`);
    if (next != null) {
      start = prev = next;
    }
  }
  return `${title} ${chapter}:${parts.join(", ")}`;
}

export function firstThreeLines(text: string): { preview: string; hasMore: boolean } {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return { preview: "", hasMore: false };
  const byNl = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (byNl.length > 1) {
    const preview = byNl.slice(0, 3).join("\n");
    return { preview, hasMore: byNl.length > 3 || preview.length < trimmed.length };
  }
  const sentences = trimmed.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [trimmed];
  const preview = sentences.slice(0, 3).join(" ").trim();
  return { preview, hasMore: preview.length < trimmed.length };
}

export function isAiGeneratedSource(source: string | null | undefined): boolean {
  if (!source) return true;
  const value = source.trim().toLowerCase();
  if (!value) return true;
  return value === "ai" || value === "generated" || value.includes("ai-generated") || value.includes("openai");
}
