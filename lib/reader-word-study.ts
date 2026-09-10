import { normalizeStrongId } from "@/lib/step-bible-tagged";

export type VerseSurfaceToken = {
  surface: string;
  kind: "word" | "sep";
};

export type AlignedWordToken = VerseSurfaceToken & {
  mapIndex: number | null;
};

export type ReaderStrongMap = {
  map: {
    strongId: string;
    wordPosition: number;
    originalWord: string;
    translatedWord: string | null;
  };
  entry: {
    id: string;
    language: string;
    lemma: string;
    transliteration: string | null;
    pronunciation: string | null;
    definition: string;
    kjvUsage: string | null;
  } | null;
};

/** Display Strong's numbers without leading zeros: G25, H7225. */
export function formatStrongId(raw: string | null | undefined): string {
  return normalizeStrongId(raw ?? "") ?? (raw ?? "").trim().toUpperCase();
}

export function tokenizeVerseSurface(text: string): VerseSurfaceToken[] {
  const tokens: VerseSurfaceToken[] = [];
  const re = /([A-Za-z][A-Za-z']*)|([^A-Za-z]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match[1]) tokens.push({ surface: match[1], kind: "word" });
    else if (match[2]) tokens.push({ surface: match[2], kind: "sep" });
  }
  return tokens;
}

function normalizeGloss(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Walk STEP glosses in verse order and attach them to KJV surface words.
 * Unmatched English words stay untappable (mapIndex null).
 */
export function alignMapsToSurface(
  text: string,
  maps: Array<{ translatedWord?: string | null; map?: { translatedWord?: string | null } }>,
): AlignedWordToken[] {
  const tokens = tokenizeVerseSurface(text).map((token) => ({
    ...token,
    mapIndex: null as number | null,
  }));
  const wordIndexes = tokens
    .map((token, index) => (token.kind === "word" ? index : -1))
    .filter((index) => index >= 0);

  maps.forEach((item, mapIndex) => {
    const glossWords = normalizeGloss(item.translatedWord ?? item.map?.translatedWord ?? "")
      .split(" ")
      .filter(Boolean);
    if (glossWords.length === 0) return;

    const unusedMatch = (start: number, span: number): boolean => {
      if (start + span > wordIndexes.length) return false;
      for (let i = 0; i < span; i += 1) {
        const token = tokens[wordIndexes[start + i]!];
        if (!token || token.mapIndex != null) return false;
        if (normalizeGloss(token.surface) !== glossWords[i]) return false;
      }
      return true;
    };

    let found: number | null = null;
    let span = 1;
    for (let start = 0; start < wordIndexes.length; start += 1) {
      if (unusedMatch(start, glossWords.length)) {
        found = start;
        span = glossWords.length;
        break;
      }
    }
    if (found == null) {
      for (let start = 0; start < wordIndexes.length; start += 1) {
        const token = tokens[wordIndexes[start]!];
        if (token && token.mapIndex == null && normalizeGloss(token.surface) === glossWords[0]) {
          found = start;
          span = 1;
          break;
        }
      }
    }
    if (found == null) return;

    for (let i = 0; i < span; i += 1) {
      const tokenIndex = wordIndexes[found + i];
      if (tokenIndex == null) continue;
      tokens[tokenIndex]!.mapIndex = mapIndex;
    }
  });

  return tokens;
}
