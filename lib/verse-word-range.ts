export type VerseWordPiece =
  | { kind: "word"; index: number; text: string }
  | { kind: "gap"; text: string };

export type WordRange = { start: number; end: number };

/** Whitespace-separated words. Indexes are 0-based and skip gaps. */
export function splitVerseWordPieces(text: string): VerseWordPiece[] {
  const parts = text.split(/(\s+)/);
  let index = 0;
  const pieces: VerseWordPiece[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      pieces.push({ kind: "gap", text: part });
      continue;
    }
    pieces.push({ kind: "word", index, text: part });
    index += 1;
  }
  return pieces;
}

export function verseWordCount(text: string): number {
  return splitVerseWordPieces(text).filter((piece) => piece.kind === "word").length;
}

export function normalizeWordRange(a: number, b: number): WordRange {
  const start = Math.max(0, Math.min(a, b));
  const end = Math.max(0, Math.max(a, b));
  return { start, end };
}

export function wordInRange(index: number, range: WordRange | null | undefined): boolean {
  if (!range) return false;
  return index >= range.start && index <= range.end;
}

export function isPartialWordRange<T extends { startWord?: number | null; endWord?: number | null }>(
  row: T,
): row is T & { startWord: number; endWord: number } {
  return typeof row.startWord === "number" && typeof row.endWord === "number" && row.endWord >= row.startWord;
}

export function wordRangeExcerpt(text: string, start: number, end: number): string {
  const words = splitVerseWordPieces(text)
    .filter((piece): piece is { kind: "word"; index: number; text: string } => piece.kind === "word")
    .filter((piece) => piece.index >= start && piece.index <= end)
    .map((piece) => piece.text);
  return words.join(" ");
}
