import {
  alignMapsToSurface,
  formatStrongId,
  normalizeAlignWord,
  tokenizeVerseSurface,
  type AlignableMap,
} from "@/lib/reader-word-study";

export type StrongConcordanceUse = {
  verseId: string;
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
  bookName: string;
  abbreviation?: string | null;
  translatedWords?: Array<string | null>;
};

export type ConcordanceBookCount = {
  bookId: number;
  bookName: string;
  count: number;
};

export type ConcordanceSnippetPart = {
  text: string;
  bold: boolean;
};

export type ConcordanceSnippet = {
  parts: ConcordanceSnippetPart[];
  leadingEllipsis: boolean;
  trailingEllipsis: boolean;
};

export function concordanceHeading(
  strongId: string,
  lemma?: string | null,
  transliteration?: string | null,
  useCount?: number | null,
): string {
  const id = formatStrongId(strongId);
  const bits = [id];
  const word = (lemma ?? "").trim();
  const xlit = (transliteration ?? "").trim();
  if (word) bits.push(word);
  if (xlit) bits.push(xlit);
  const head = bits.join(" · ");
  if (typeof useCount === "number" && Number.isFinite(useCount)) {
    const uses = useCount === 1 ? "1 use" : `${useCount} uses`;
    return `${head} — ${uses} in the KJV`;
  }
  return head;
}

export function formatUseReference(bookName: string, chapter: number, verse: number): string {
  return `${bookName} ${chapter}:${verse}`;
}

export function formatBookBreakdown(books: ConcordanceBookCount[]): string {
  return books.map((book) => `${book.bookName} ${book.count}`).join(" · ");
}

function glossPhrases(translatedWord: string): string[][] {
  const words = [...translatedWord.matchAll(/[A-Za-z']+/g)].map((match) => match[0]);
  if (words.length === 0) return [];
  const phrases: string[][] = [words];
  const joined = words.map((word) => normalizeAlignWord(word)).join("");
  if (joined === "forever" || joined === "ever") phrases.push(["for", "ever"]);
  if (joined === "evermore") phrases.push(["ever", "more"]);
  phrases.sort((a, b) => b.length - a.length);
  return phrases;
}

function matchPhraseAt(
  words: Array<{ index: number; surface: string }>,
  start: number,
  phrase: string[],
): number | null {
  if (start + phrase.length > words.length) return null;
  for (let i = 0; i < phrase.length; i++) {
    if (normalizeAlignWord(words[start + i]!.surface) !== normalizeAlignWord(phrase[i]!)) {
      return null;
    }
  }
  return start + phrase.length - 1;
}

function findGlossSpans(
  tokens: ReturnType<typeof tokenizeVerseSurface>,
  translatedWords: Array<string | null | undefined>,
): boolean[] {
  const bold = tokens.map(() => false);
  const wordSlots = tokens
    .map((token, index) => (token.kind === "word" ? { index, surface: token.surface } : null))
    .filter((slot): slot is { index: number; surface: string } => slot != null);

  for (const gloss of translatedWords) {
    const phrases = glossPhrases(gloss ?? "");
    if (phrases.length === 0) continue;
    let found = false;
    for (const phrase of phrases) {
      for (let start = 0; start < wordSlots.length; start++) {
        const already = wordSlots.slice(start, start + phrase.length).every((slot) => bold[slot.index]);
        if (already) continue;
        const end = matchPhraseAt(wordSlots, start, phrase);
        if (end == null) continue;
        for (let i = start; i <= end; i++) {
          const slot = wordSlots[i];
          if (!slot) continue;
          bold[slot.index] = true;
          const next = tokens[slot.index + 1];
          const following = wordSlots[i + 1];
          if (i < end && next?.kind === "sep" && following) bold[slot.index + 1] = true;
        }
        found = true;
        break;
      }
      if (found) break;
    }
  }

  if (!bold.some(Boolean) && translatedWords.some((word) => (word ?? "").trim())) {
    const aligned = alignMapsToSurface(
      tokens.map((token) => token.surface).join(""),
      translatedWords.map((translatedWord) => ({ translatedWord }) satisfies AlignableMap),
    );
    let cursor = 0;
    for (const token of aligned) {
      const from = cursor;
      cursor += token.surface.length;
      if (token.kind !== "word" || token.mapIndex == null) continue;
      let consumed = 0;
      for (let i = 0; i < tokens.length; i++) {
        const surface = tokens[i]!.surface;
        const tokenStart = consumed;
        consumed += surface.length;
        if (tokenStart >= cursor) break;
        if (consumed <= from) continue;
        if (tokens[i]!.kind === "word") bold[i] = true;
      }
    }
  }

  return bold;
}

function tokenCharOffsets(tokens: ReturnType<typeof tokenizeVerseSurface>): Array<{ start: number; end: number }> {
  const offsets: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const token of tokens) {
    offsets.push({ start: cursor, end: cursor + token.surface.length });
    cursor += token.surface.length;
  }
  return offsets;
}

function snapWindow(
  tokens: ReturnType<typeof tokenizeVerseSurface>,
  offsets: Array<{ start: number; end: number }>,
  matchStart: number,
  matchEnd: number,
  maxChars: number,
): { start: number; end: number } {
  const textLen = offsets[offsets.length - 1]?.end ?? 0;
  if (matchEnd - matchStart >= maxChars || textLen <= maxChars) {
    return { start: matchStart, end: matchEnd > matchStart ? matchEnd : textLen };
  }
  const suffixPad = Math.min(8, Math.max(0, textLen - matchEnd));
  let end = Math.min(textLen, matchEnd + suffixPad);
  let start = Math.max(0, end - maxChars);
  if (start > matchStart) start = matchStart;
  if (end - start < maxChars) end = Math.min(textLen, start + maxChars);
  let startToken = tokens.findIndex((_, i) => offsets[i]!.end > start);
  if (startToken < 0) startToken = 0;
  if (tokens[startToken]?.kind === "word" && offsets[startToken]!.start < start) {
    start = offsets[startToken]!.start;
  } else {
    start = offsets[startToken]?.start ?? start;
  }
  let endToken = tokens.length - 1;
  for (let i = 0; i < tokens.length; i++) {
    if (offsets[i]!.start >= end) {
      endToken = Math.max(0, i - 1);
      break;
    }
  }
  end = offsets[endToken]?.end ?? end;
  if (start > matchStart) start = matchStart;
  if (end < matchEnd) end = matchEnd;
  return { start, end };
}

function mergeParts(parts: ConcordanceSnippetPart[]): ConcordanceSnippetPart[] {
  const merged: ConcordanceSnippetPart[] = [];
  for (const part of parts) {
    if (!part.text) continue;
    const last = merged[merged.length - 1];
    if (last && last.bold === part.bold) last.text += part.text;
    else merged.push({ ...part });
  }
  return merged;
}

const DEFAULT_SNIPPET_CHARS = 72;

/**
 * Bold every surface span that carries the searched Strong's number.
 * Never clip a match: full verse, or a window centred on the bold word(s)
 * with "…" on either side.
 */
export function buildConcordanceSnippet(
  verseText: string,
  translatedWords: Array<string | null | undefined> = [],
  maxChars = DEFAULT_SNIPPET_CHARS,
): ConcordanceSnippet {
  const tokens = tokenizeVerseSurface(verseText);
  const bold = findGlossSpans(tokens, translatedWords);
  const offsets = tokenCharOffsets(tokens);
  const textLen = offsets[offsets.length - 1]?.end ?? verseText.length;

  const boldIndexes = bold
    .map((isBold, index) => (isBold ? index : -1))
    .filter((index) => index >= 0);
  if (boldIndexes.length === 0) {
    return {
      parts: mergeParts(tokens.map((token) => ({ text: token.surface, bold: false }))),
      leadingEllipsis: false,
      trailingEllipsis: false,
    };
  }
  const matchStart = boldIndexes.length ? offsets[boldIndexes[0]!]!.start : 0;
  const matchEnd = boldIndexes.length ? offsets[boldIndexes[boldIndexes.length - 1]!]!.end : textLen;
  const window = snapWindow(tokens, offsets, matchStart, matchEnd, maxChars);

  const parts: ConcordanceSnippetPart[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const { start, end } = offsets[i]!;
    if (end <= window.start || start >= window.end) continue;
    const from = Math.max(0, window.start - start);
    const to = Math.min(tokens[i]!.surface.length, window.end - start);
    parts.push({
      text: tokens[i]!.surface.slice(from, to),
      bold: bold[i] === true,
    });
  }

  return {
    parts: mergeParts(parts),
    leadingEllipsis: window.start > 0,
    trailingEllipsis: window.end < textLen,
  };
}

export function snippetVisibleText(snippet: ConcordanceSnippet): string {
  const body = snippet.parts.map((part) => part.text).join("");
  return `${snippet.leadingEllipsis ? "…" : ""}${body}${snippet.trailingEllipsis ? "…" : ""}`;
}
