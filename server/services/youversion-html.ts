import type { ProviderChapterStructure, ProviderHeading, ProviderParagraph } from "./scripture-service";

export interface YouVersionFootnote {
  verse: number;
  text: string;
}

export interface YouVersionChapter {
  verses: Array<{
    id: string;
    translationId: string;
    bookId: number;
    chapter: number;
    verse: number;
    text: string;
    searchVector: null;
  }>;
  providerContent: ProviderChapterStructure;
  footnotes: YouVersionFootnote[];
}

const ENTITY: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === "#") {
      const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITY[name.toLowerCase()] ?? whole;
  });
}

function plainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

/** End index (exclusive) of the span opened at `start`, honouring nested spans. */
function balancedSpanEnd(html: string, start: number): number {
  const tag = /<(\/?)span\b[^>]*>/gi;
  tag.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tag.exec(html))) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return tag.lastIndex;
  }
  return html.length;
}

const NOTE_MARK = "\u0001";
const VERSE_MARK = "\u0002";

function isHeadingBlock(cls: string): boolean {
  const classes = cls.split(/\s+/);
  return classes.includes("yv-h") || /^(?:s\d*|ms\d*|mt\d*|d|r|qa\d*|sp|cl)$/i.test(classes[0] ?? "");
}

/** Parse a YouVersion `format=html` chapter into verses, headings, paragraphs and notes. */
export function parseYouVersionChapterHtml(
  html: string,
  context: { code: string; bookId: number; chapter: number },
): YouVersionChapter {
  const verseText = new Map<number, string>();
  const order: number[] = [];
  const headings: ProviderHeading[] = [];
  const paragraphs: ProviderParagraph[] = [];
  const footnotes: YouVersionFootnote[] = [];
  let pendingHeadings: ProviderHeading[] = [];
  let currentVerse = 0;

  const append = (piece: string, newLine: boolean) => {
    const text = piece.replace(/\s+/g, " ").trim();
    if (!text || currentVerse <= 0) return;
    const existing = verseText.get(currentVerse);
    if (!existing) verseText.set(currentVerse, text);
    else verseText.set(currentVerse, existing + (newLine ? "\n" : " ") + text);
  };

  for (const block of html.matchAll(/<div\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/div>/gi)) {
    const cls = block[1].trim();
    let body = block[2];

    const notes: string[] = [];
    let rebuilt = "";
    let cursor = 0;
    for (;;) {
      const at = body.slice(cursor).search(/<span\b[^>]*class="yv-n\b[^"]*"/i);
      if (at < 0) break;
      const start = cursor + at;
      const end = balancedSpanEnd(body, start);
      const inner = body.slice(start, end).replace(/<span\b[^>]*class="fr"[^>]*>[\s\S]*?<\/span>/gi, "");
      rebuilt += body.slice(cursor, start) + NOTE_MARK + notes.length + NOTE_MARK;
      notes.push(plainText(inner));
      cursor = end;
    }
    body = rebuilt + body.slice(cursor);

    body = body
      .replace(/<span\b[^>]*class="yv-vlbl"[^>]*>[\s\S]*?<\/span>/gi, "")
      .replace(/<span\b[^>]*class="yv-v"[^>]*\bv="(\d+)[^"]*"[^>]*>\s*<\/span>/gi, `${VERSE_MARK}$1${VERSE_MARK}`)
      .replace(/<br\s*\/?>/gi, " ");
    const text = decodeEntities(body.replace(/<[^>]*>/g, ""));

    const hasVerse = text.includes(VERSE_MARK);
    if (isHeadingBlock(cls) && !hasVerse) {
      const heading = plainText(text.replace(new RegExp(`${NOTE_MARK}\\d+${NOTE_MARK}`, "g"), ""));
      if (heading) pendingHeadings.push(/^qa/i.test(cls) ? { text: heading, kind: "qa" } : { text: heading });
      continue;
    }

    const blockVerses: number[] = [];
    let firstPiece = true;
    for (const token of text.split(new RegExp(`(${VERSE_MARK}\\d+${VERSE_MARK}|${NOTE_MARK}\\d+${NOTE_MARK})`))) {
      if (token.startsWith(VERSE_MARK)) {
        currentVerse = Number(token.slice(1, -1));
        if (!verseText.has(currentVerse)) {
          verseText.set(currentVerse, "");
          order.push(currentVerse);
        }
        blockVerses.push(currentVerse);
        if (pendingHeadings.length) {
          headings.push(...pendingHeadings.map((heading) => ({ ...heading, beforeVerse: currentVerse })));
          pendingHeadings = [];
        }
        firstPiece = false;
      } else if (token.startsWith(NOTE_MARK)) {
        const note = notes[Number(token.slice(1, -1))];
        if (note && currentVerse > 0) footnotes.push({ verse: currentVerse, text: note });
      } else if (token.trim()) {
        append(token, firstPiece);
        firstPiece = false;
      }
    }
    if (blockVerses.length && /^(?:p\d*|m|nb|pi\d*|mi)$/i.test(cls.split(/\s+/)[0] ?? "")) {
      paragraphs.push({ verseStart: blockVerses[0], verseEnd: blockVerses[blockVerses.length - 1] });
    }
  }

  const prefix = context.code.toLowerCase();
  const verses = order
    .filter((verse) => (verseText.get(verse) ?? "").trim())
    .map((verse) => ({
      id: `${prefix}-${context.bookId}-${context.chapter}-${verse}`,
      translationId: context.code,
      bookId: context.bookId,
      chapter: context.chapter,
      verse,
      text: (verseText.get(verse) as string).trim(),
      searchVector: null,
    }));
  return { verses, providerContent: { headings, paragraphs }, footnotes };
}
