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
    morph?: string | null;
  };
  entry: {
    id: string;
    language: string;
    lemma: string;
    transliteration: string | null;
    pronunciation: string | null;
    definition: string;
    extendedDefinition?: string | null;
    kjvUsage: string | null;
    derivation?: string | null;
  } | null;
};

export type AlignableMap = {
  translatedWord?: string | null;
  kjvUsage?: string | null;
  map?: { translatedWord?: string | null };
  entry?: { kjvUsage?: string | null };
};

const STOP = new Set(
  "a an the of to in for and or but so as by at on from with without into unto upon than that this these those he she it they we i thou thee ye you me my his her its their our thy your is are was were be been being am not no nor neither him them us".split(
    " ",
  ),
);

const EQUIV: Record<string, readonly string[]> = {
  yahweh: ["lord", "jehovah"],
  jehovah: ["lord", "yahweh"],
  lord: ["yahweh", "jehovah"],
  amen: ["verily"],
  verily: ["amen"],
  signs: ["miracles", "sign", "miracle"],
  miracles: ["signs", "miracle", "sign"],
  miracle: ["sign"],
  sign: ["miracle"],
  sheep: ["shepherd", "shepherds"],
  shepherd: ["sheep"],
  shepherds: ["sheep"],
  you: ["thou", "thee", "ye"],
  thou: ["you", "thee", "ye"],
  thee: ["you", "thou"],
  ye: ["you", "thou"],
  yourself: ["thou", "thee", "you"],
  able: ["can"],
  can: ["able"],
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

export function normalizeAlignWord(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z]/g, "");
}

export function foldKjvVariants(raw: string): string[] {
  const w = normalizeAlignWord(raw);
  if (!w) return [];
  const out = new Set<string>([w]);
  const strip = (re: RegExp, min = 2) => {
    if (re.test(w)) {
      const next = w.replace(re, "");
      if (next.length >= min) out.add(next);
    }
  };
  strip(/eth$/);
  strip(/est$/);
  strip(/ath$/);
  strip(/ith$/);
  strip(/iest$/);
  strip(/ied$/);
  strip(/ies$/);
  strip(/ing$/);
  strip(/ed$/);
  strip(/es$/);
  strip(/ly$/);
  strip(/st$/);
  strip(/s$/);
  if (w.endsWith("eth") && w.length > 4) out.add(`${w.slice(0, -3)}e`);
  if (w.endsWith("est") && w.length > 4) out.add(`${w.slice(0, -3)}e`);
  return [...out];
}

export function wordsSimilar(a: string, b: string): boolean {
  const va = foldKjvVariants(a);
  const vb = foldKjvVariants(b);
  if (va.length === 0 || vb.length === 0) return false;
  for (const x of va) {
    for (const y of vb) {
      if (x === y) return true;
      const n = Math.min(x.length, y.length);
      if (n >= 3 && (x.startsWith(y) || y.startsWith(x))) return true;
    }
  }
  const na = normalizeAlignWord(a);
  const nb = normalizeAlignWord(b);
  const eqA = EQUIV[na];
  const eqB = EQUIV[nb];
  if (eqA?.some((w) => foldKjvVariants(w).some((x) => vb.includes(x)))) return true;
  if (eqB?.some((w) => foldKjvVariants(w).some((x) => va.includes(x)))) return true;
  return false;
}

const PRONOUN = new Set(
  "me my him his her them their you your us our i we it its thee thou thy ye".split(" "),
);

export function isAlignStopWord(raw: string): boolean {
  return STOP.has(normalizeAlignWord(raw));
}

function isPronounWord(raw: string): boolean {
  return PRONOUN.has(normalizeAlignWord(raw));
}

function glossLooksLikeParticle(item: AlignableMap): boolean {
  const gloss = glossPhrase(item.translatedWord ?? item.map?.translatedWord ?? "");
  if (gloss.length === 0) return false;
  return gloss.every((word) => isAlignStopWord(word) && !isPronounWord(word));
}

function glossLooksLikePronounOnly(item: AlignableMap): boolean {
  const gloss = glossPhrase(item.translatedWord ?? item.map?.translatedWord ?? "");
  return gloss.length > 0 && gloss.every(isPronounWord);
}

function trimPhraseStops(words: string[]): string[] {
  const next = [...words];
  while (
    next.length > 1 &&
    isAlignStopWord(next[0]!) &&
    !isPronounWord(next[0]!)
  ) {
    next.shift();
  }
  while (
    next.length > 1 &&
    isAlignStopWord(next[next.length - 1]!) &&
    !isPronounWord(next[next.length - 1]!)
  ) {
    next.pop();
  }
  return next;
}

function usagePhrases(usage: string): string[][] {
  const phrases: string[][] = [];
  for (const chunk of usage.split(/[,;]/)) {
    const words = [...chunk.matchAll(/[A-Za-z']+/g)].map((m) => m[0]);
    if (words.length > 0) phrases.push(trimPhraseStops(words));
    for (const word of words) {
      if (!isAlignStopWord(word)) phrases.push([word]);
    }
  }
  return phrases;
}

function glossPhrase(translatedWord: string): string[] {
  const words = [...translatedWord.matchAll(/[A-Za-z']+/g)].map((m) => m[0]);
  const next = [...words];
  while (
    next.length > 1 &&
    isAlignStopWord(next[next.length - 1]!) &&
    !isPronounWord(next[next.length - 1]!)
  ) {
    next.pop();
  }
  return next;
}

function uniquePhrases(phrases: string[][]): string[][] {
  const seen = new Set<string>();
  const unique: string[][] = [];
  for (const phrase of phrases.sort((a, b) => b.length - a.length)) {
    const key = phrase.map((w) => normalizeAlignWord(w)).join(" ");
    if (!key || seen.has(key)) continue;
    if (phrase.every(isAlignStopWord) && !phrase.some(isPronounWord)) continue;
    seen.add(key);
    unique.push(phrase);
  }
  return unique;
}

function glossPhrasesFor(item: AlignableMap): string[][] {
  const gloss = item.translatedWord ?? item.map?.translatedWord ?? "";
  const fromGloss = glossPhrase(gloss);
  const extras: string[][] = [];
  const joined = fromGloss.map((word) => normalizeAlignWord(word)).join("");
  if (joined === "ever" || joined === "forever") extras.push(["for", "ever"]);
  if (joined === "evermore") extras.push(["ever", "more"]);
  return uniquePhrases(fromGloss.length ? [fromGloss, ...extras] : extras);
}

function usagePhrasesFor(item: AlignableMap): string[][] {
  const usage = item.kjvUsage ?? item.entry?.kjvUsage ?? "";
  return uniquePhrases(usagePhrases(usage));
}

function matchPhraseFrom(
  tokens: AlignedWordToken[],
  wordIndexes: number[],
  start: number,
  phrase: string[],
): { from: number; to: number } | null {
  let p = 0;
  let i = start;
  let from: number | null = null;
  let lastHit = start;
  while (i < wordIndexes.length && p < phrase.length) {
    const token = tokens[wordIndexes[i]!];
    if (!token) return null;
    if (token.mapIndex != null) {
      if (from != null) return null;
      i += 1;
      continue;
    }
    if (wordsSimilar(token.surface, phrase[p]!)) {
      if (from == null) from = i;
      lastHit = i;
      p += 1;
      i += 1;
      continue;
    }
    if (from != null && isAlignStopWord(token.surface)) {
      i += 1;
      continue;
    }
    return null;
  }
  if (p !== phrase.length || from == null) return null;
  return { from, to: lastHit };
}

function collapseAlignedPhrases(tokens: AlignedWordToken[]): AlignedWordToken[] {
  const out: AlignedWordToken[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token.mapIndex == null || token.kind === "sep") {
      out.push(token);
      i += 1;
      continue;
    }
    const idx = token.mapIndex;
    let surface = token.surface;
    let j = i + 1;
    while (j < tokens.length) {
      const next = tokens[j]!;
      if (next.mapIndex === idx) {
        surface += next.surface;
        j += 1;
        continue;
      }
      const following = tokens[j + 1];
      if (next.kind === "sep" && next.mapIndex == null && following?.mapIndex === idx) {
        surface += next.surface;
        j += 1;
        continue;
      }
      break;
    }
    out.push({ surface, kind: "word", mapIndex: idx });
    i = j;
  }
  return out;
}

function applyPhrases(
  tokens: AlignedWordToken[],
  wordIndexes: number[],
  mapIndex: number,
  phrases: string[][],
): boolean {
  if (tokens.some((token) => token.mapIndex === mapIndex)) return true;
  let best: { from: number; to: number; score: number } | null = null;
  for (const phrase of phrases) {
    if (phrase.length === 0) continue;
    if (phrase.every(isAlignStopWord) && !phrase.some(isPronounWord)) continue;
    for (let start = 0; start < wordIndexes.length; start += 1) {
      const hit = matchPhraseFrom(tokens, wordIndexes, start, phrase);
      if (!hit) continue;
      const score = phrase.length * 10 + (hit.to - hit.from);
      if (!best || score > best.score) best = { ...hit, score };
    }
  }
  if (!best) return false;
  for (let i = best.from; i <= best.to; i += 1) {
    const tokenIndex = wordIndexes[i];
    if (tokenIndex == null) continue;
    const token = tokens[tokenIndex];
    if (token && token.mapIndex == null) token.mapIndex = mapIndex;
  }
  return true;
}

/**
 * Attach STEP maps to KJV surface words using the stored gloss plus Strong's
 * KJV usage, so translator-English / Hebrew-order glosses still light the
 * KJV words they tag. Consecutive hits for one map collapse to a phrase.
 */
export function alignMapsToSurface(text: string, maps: AlignableMap[]): AlignedWordToken[] {
  const tokens = tokenizeVerseSurface(text).map((token) => ({
    ...token,
    mapIndex: null as number | null,
  }));
  const wordIndexes = tokens
    .map((token, index) => (token.kind === "word" ? index : -1))
    .filter((index) => index >= 0);

  maps.forEach((item, mapIndex) => {
    if (glossLooksLikePronounOnly(item)) return;
    const phrases = glossPhrasesFor(item);
    if (!phrases.some((phrase) => phrase.length > 1)) return;
    applyPhrases(tokens, wordIndexes, mapIndex, phrases);
  });
  maps.forEach((item, mapIndex) => {
    if (glossLooksLikePronounOnly(item)) return;
    applyPhrases(tokens, wordIndexes, mapIndex, glossPhrasesFor(item));
  });
  maps.forEach((item, mapIndex) => {
    if (glossLooksLikeParticle(item)) return;
    applyPhrases(tokens, wordIndexes, mapIndex, usagePhrasesFor(item));
  });
  attachLeadingGlossStops(tokens, maps);

  return collapseAlignedPhrases(tokens);
}

/**
 * Pull leading stop words from this map's STEP gloss onto the tagged span
 * (`for ever`, `he makes lie down`) even if another map already claimed them.
 */
function attachLeadingGlossStops(tokens: AlignedWordToken[], maps: AlignableMap[]): void {
  maps.forEach((item, mapIndex) => {
    const phrase = glossPhrasesFor(item)[0];
    if (!phrase || phrase.length < 2) return;
    const leadingStops: string[] = [];
    for (const word of phrase) {
      if (isAlignStopWord(word) && !isPronounWord(word)) leadingStops.push(word);
      else break;
    }
    if (leadingStops.length === 0) return;
    const firstHit = tokens.findIndex((token) => token.kind === "word" && token.mapIndex === mapIndex);
    if (firstHit < 0) return;
    let cursor = firstHit;
    for (let i = leadingStops.length - 1; i >= 0; i--) {
      let prev = cursor - 1;
      while (prev >= 0 && tokens[prev]?.kind === "sep") prev -= 1;
      const lead = tokens[prev];
      if (lead?.kind !== "word" || !wordsSimilar(lead.surface, leadingStops[i]!)) break;
      if (lead.mapIndex === mapIndex) {
        cursor = prev;
        continue;
      }
      lead.mapIndex = mapIndex;
      cursor = prev;
    }
  });
}

export type WordStudyChip = {
  surface: string;
  strongId: string;
  mapIndex: number;
};

/** Unique aligned STEP words for verse-sheet chips (English → unpadded G/H). */
export function wordStudyChipsForVerse(
  text: string,
  maps: ReaderStrongMap[],
): WordStudyChip[] {
  const aligned = alignMapsToSurface(
    text,
    maps.map((item) => ({
      translatedWord: item.map.translatedWord,
      kjvUsage: item.entry?.kjvUsage,
    })),
  );
  const chips: WordStudyChip[] = [];
  const seen = new Set<number>();
  for (const token of aligned) {
    if (token.kind !== "word" || token.mapIndex == null || seen.has(token.mapIndex)) continue;
    seen.add(token.mapIndex);
    const mapping = maps[token.mapIndex];
    if (!mapping) continue;
    const strongId = formatStrongId(mapping.map.strongId);
    if (!strongId) continue;
    chips.push({
      surface: token.surface.replace(/\s+/g, " ").trim(),
      strongId,
      mapIndex: token.mapIndex,
    });
  }
  return chips;
}

