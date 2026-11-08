import {
  findScriptureCitations,
  parseScriptureReferenceList,
  type ScriptureCitation,
} from "@/lib/scripture-reference";

export interface LessonScriptureRef {
  bookId: number;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  verses: number[] | null;
  text: string;
}

export type LessonInline =
  | { kind: "text"; text: string }
  | ({ kind: "scripture" } & LessonScriptureRef);

export type LessonBlock =
  | { kind: "reading"; inlines: LessonInline[] }
  | { kind: "instruction"; inlines: LessonInline[] }
  | { kind: "question"; key: string; text: string; inlines: LessonInline[] };

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  mdash: "—",
  ndash: "–",
};

const ABBREVIATION =
  /^(?:mr|mrs|ms|dr|st|vs|vv|cf|eg|ie|p|pp|no|vol|ch|chap|num|jer|deut|matt|chron|cor|pet|gal|ps|psa|isa|exod|heb|mal|john|gen|ex|lev|josh|sam|kgs|chr|rom|phil|col|tim|thess|tit|jas|rev|nkjv|nasb|niv|kjv|esv|nrsv|nlt)$/i;

function decodeHtml(value: string): string {
  return value
    .replace(/&([a-z]+);/gi, (entity, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? entity)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(parseInt(decimal, 10)));
}

export function lessonHtmlToText(html: string): string {
  return decodeHtml(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

function toRef(hit: ScriptureCitation): LessonScriptureRef {
  return {
    bookId: hit.bookId,
    chapter: hit.chapter,
    verseStart: hit.verse ?? null,
    verseEnd: hit.verseEnd ?? null,
    verses: hit.verses ?? null,
    text: hit.text,
  };
}

export function inlinesFromText(text: string): LessonInline[] {
  const hits = findScriptureCitations(text);
  if (hits.length === 0) return text ? [{ kind: "text", text }] : [];
  const inlines: LessonInline[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start > cursor) inlines.push({ kind: "text", text: text.slice(cursor, hit.start) });
    inlines.push({ kind: "scripture", ...toRef(hit) });
    cursor = hit.end;
  }
  if (cursor < text.length) inlines.push({ kind: "text", text: text.slice(cursor) });
  return inlines;
}

export function lessonQuestionKey(text: string, index: number): string {
  const source = `${index}\n${text.replace(/\s+/g, " ").trim().toLowerCase()}`;
  let hash = 5381;
  for (let i = 0; i < source.length; i += 1) {
    hash = Math.imul(hash, 33) ^ source.charCodeAt(i);
  }
  return `q${(hash >>> 0).toString(36)}`;
}

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch !== "." && ch !== "?" && ch !== "!") continue;
    const next = text[i + 1];
    if (next && !/\s/.test(next)) continue;
    if (ch === ".") {
      const word = text.slice(start, i).match(/([A-Za-z]+)$/)?.[1] ?? "";
      if (word && ABBREVIATION.test(word)) continue;
    }
    const sentence = text.slice(start, i + 1).trim();
    if (sentence) sentences.push(sentence);
    start = i + 1;
  }
  const tail = text.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}

function isQuestion(sentence: string): boolean {
  return sentence.endsWith("?");
}

function blockFromSentences(text: string, questionIndex: { value: number }): LessonBlock[] {
  const blocks: LessonBlock[] = [];
  for (const sentence of splitSentences(text)) {
    if (isQuestion(sentence)) {
      const key = lessonQuestionKey(sentence, questionIndex.value);
      questionIndex.value += 1;
      blocks.push({
        kind: "question",
        key,
        text: sentence,
        inlines: inlinesFromText(sentence),
      });
    } else {
      blocks.push({ kind: "instruction", inlines: inlinesFromText(sentence) });
    }
  }
  return blocks;
}

function readingBlock(text: string): LessonBlock | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return { kind: "reading", inlines: inlinesFromText(cleaned) };
}

/**
 * Every scripture reference Adventech marks with a verse anchor, in order,
 * with the range written in the anchor.
 */
export function collectMarkedScriptureRefs(html: string): LessonScriptureRef[] {
  const refs: LessonScriptureRef[] = [];
  const pattern = /<a\b[^>]*\bclass="verse"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const label = lessonHtmlToText(match[1] ?? "");
    for (const hit of parseScriptureReferenceList(label)) refs.push(toRef(hit));
  }
  return refs;
}

function visibleAndNotes(html: string): { visible: string; notes: string } {
  const hiddenAt = html.search(/<div\b[^>]*style="[^"]*display:\s*none/i);
  if (hiddenAt < 0) return { visible: html, notes: "" };
  return { visible: html.slice(0, hiddenAt), notes: html.slice(hiddenAt) };
}

function pushParagraph(
  blocks: LessonBlock[],
  inner: string,
  forceInstruction: boolean,
  questionIndex: { value: number },
): boolean {
  const code = inner.match(/<code\b[^>]*>([\s\S]*?)<\/code>/i);
  if (code) {
    blocks.push(...blockFromSentences(lessonHtmlToText(code[1]), questionIndex));
    return false;
  }
  const text = lessonHtmlToText(inner);
  if (!text) return forceInstruction;
  if (forceInstruction) {
    blocks.push({ kind: "instruction", inlines: inlinesFromText(text) });
    return false;
  }
  const reading = readingBlock(text);
  if (reading) blocks.push(reading);
  return false;
}

function parseRegion(html: string, questionIndex: { value: number }): LessonBlock[] {
  const blocks: LessonBlock[] = [];
  const token =
    /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>|<p\b[^>]*>([\s\S]*?)<\/p>|<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi;
  let forceInstruction = false;
  for (const match of html.matchAll(token)) {
    if (match[1]) {
      const heading = lessonHtmlToText(match[2] ?? "");
      if (!heading) continue;
      if (/^read for\b/i.test(heading)) {
        blocks.push({ kind: "instruction", inlines: inlinesFromText(heading) });
        forceInstruction = true;
      } else {
        const reading = readingBlock(heading);
        if (reading) blocks.push(reading);
        forceInstruction = false;
      }
      continue;
    }
    if (match[3] != null) {
      forceInstruction = pushParagraph(blocks, match[3], forceInstruction, questionIndex);
      continue;
    }
    if (match[4] != null) {
      const inner = match[4];
      const paragraphs = [...inner.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((item) => item[1]);
      const pieces = paragraphs.length > 0 ? paragraphs : [inner];
      for (const piece of pieces) {
        forceInstruction = pushParagraph(blocks, piece, forceInstruction, questionIndex);
      }
    }
  }
  return blocks;
}

/** Printed-lesson blocks: body, set-apart reading instructions, then each question. */
export function parseLessonDay(html: string): LessonBlock[] {
  const { visible, notes } = visibleAndNotes(html);
  const questionIndex = { value: 0 };
  const blocks = parseRegion(visible, questionIndex);
  const noteText = lessonHtmlToText(notes);
  if (noteText) {
    const title = noteText.match(/Supplemental EGW Notes/i)?.[0];
    if (title) {
      blocks.push({ kind: "reading", inlines: [{ kind: "text", text: "Supplemental EGW Notes" }] });
    }
    const noteBlocks = parseRegion(notes, questionIndex).filter((block) => {
      if (block.kind !== "reading") return true;
      const text = block.inlines.map((inline) => inline.text).join("");
      return !/supplemental egw notes/i.test(text);
    });
    blocks.push(...noteBlocks);
  }
  return blocks;
}
