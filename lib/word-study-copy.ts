/** First-time-reader copy for the word-study sheet. */

import { alignMapsToSurface } from "./reader-word-study";

export function wordStudyLanguageLabel(language?: string | null): "Hebrew" | "Greek" {
  return language === "gr" ? "Greek" : "Hebrew";
}

/** KJV phrase this STEP token covers, including multi-word spans like "for ever". */
export function wordStudyEnglishPhrase(opts: {
  surface: string;
  verseText?: string | null;
  translatedWord?: string | null;
  kjvUsage?: string | null;
}): string {
  const surface = (opts.surface ?? "").replace(/\s+/g, " ").trim();
  const verseText = (opts.verseText ?? "").replace(/\s+/g, " ").trim();
  const translatedWord = (opts.translatedWord ?? "").replace(/\s+/g, " ").trim();
  if (verseText) {
    const aligned = alignMapsToSurface(verseText, [
      {
        translatedWord: translatedWord || surface,
        kjvUsage: opts.kjvUsage,
      },
    ]);
    const hit = aligned.find((token) => token.kind === "word" && token.mapIndex === 0);
    const phrase = (hit?.surface ?? "").replace(/\s+/g, " ").trim();
    if (phrase) return phrase;
  }
  return surface;
}

export function wordStudyPlainSentence(opts: {
  bookName?: string | null;
  chapter?: number | null;
  verse?: number | null;
  language?: string | null;
  lemma?: string | null;
  transliteration?: string | null;
  surface: string;
}): string {
  const lang = wordStudyLanguageLabel(opts.language);
  const ref =
    opts.bookName && opts.chapter && opts.verse
      ? `${opts.bookName} ${opts.chapter}:${opts.verse}`
      : "";
  const lemma = (opts.lemma ?? "").trim();
  const xlit = (opts.transliteration ?? "").trim();
  const original = lemma ? ` ${lemma}` : "";
  const translitBit = xlit ? ` (${xlit})` : "";
  const quoted = opts.surface.replace(/\s+/g, " ").trim();
  if (ref) {
    return `In ${ref}, the ${lang}${original}${translitBit} is translated '${quoted}'.`;
  }
  return `The ${lang}${original}${translitBit} is translated '${quoted}'.`;
}

function firstGlossClause(raw: string): string {
  let text = raw.replace(/\s+/g, " ").trim();
  text = text.replace(/^:--\s*/, "");
  text = text.replace(/^from\s+[HG]\d+\s*;?\s*/i, "");
  text = text.replace(/^properly,?\s+/i, "");
  const cut = text.search(/\bi\.e\.|;/);
  if (cut >= 8) text = text.slice(0, cut);
  text = text.replace(/[,:;.\s]+$/, "").trim();
  const commaParts = text.split(",").map((part) => part.trim()).filter(Boolean);
  if (commaParts.length > 3) {
    text = commaParts.slice(0, 3).join(", ");
  }
  if (text.length > 140) {
    const clipped = text.slice(0, 140);
    const lastSpace = clipped.lastIndexOf(" ");
    text = (lastSpace > 80 ? clipped.slice(0, lastSpace) : clipped).trim();
  }
  return text;
}

/** One-sentence meaning from the short Strong's gloss, never the full 1890 article. */
export function lexiconShortMeaning(
  definition?: string | null,
  kjvUsage?: string | null,
): string {
  const rawDef = (definition ?? "").replace(/\s+/g, " ").trim();
  const looksLike1890 = /\bi\.e\.|properly,|from\s+[HG]\d+/i.test(rawDef) || rawDef.length > 120;
  const usage = (kjvUsage ?? "").replace(/^:--/, "").replace(/\s+/g, " ").trim();
  const source = looksLike1890 && usage ? usage : rawDef || usage;
  const clause = firstGlossClause(source);
  if (!clause) return "";
  const body = clause.charAt(0).toLowerCase() + clause.slice(1);
  return `It means ${body}.`;
}

export function lexiconFullDefinition(
  definition?: string | null,
  extendedDefinition?: string | null,
): string {
  const primary = (definition ?? "").replace(/\s+/g, " ").trim();
  const extended = (extendedDefinition ?? "").replace(/\s+/g, " ").trim();
  if (extended && extended.length > primary.length + 20 && extended !== primary) {
    return `${primary}${primary.endsWith(".") ? "" : "."} ${extended}`.trim();
  }
  return primary;
}
