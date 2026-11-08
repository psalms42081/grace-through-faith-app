import { transformBibleHtml } from "@youversion/platform-core/server";
import { JSDOM } from "jsdom";
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

const FOOTNOTE = "[data-verse-footnote]";

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** Text of an element without verse labels or footnote anchors. */
function readingText(el: Element): string {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll(`.yv-vlbl, ${FOOTNOTE}`).forEach((node) => node.remove());
  return cleanText(copy.textContent);
}

function footnoteText(anchor: Element): string {
  const holder = anchor.ownerDocument.createElement("div");
  holder.innerHTML = anchor.getAttribute("data-verse-footnote-content") ?? "";
  holder.querySelectorAll(".fr").forEach((node) => node.remove());
  return cleanText(holder.textContent);
}

function isHeadingBlock(cls: string): boolean {
  const classes = cls.split(/\s+/);
  return classes.includes("yv-h") || /^(?:s\d*|ms\d*|mt\d*|d|r|qa\d*|sp|cl)$/i.test(classes[0] ?? "");
}

/**
 * Normalise a YouVersion `format=html` passage into verses, headings, paragraphs
 * and footnotes. The YouVersion SDK's server transformer cleans the markup first:
 * every verse fragment is wrapped in `.yv-v[v]` and each footnote becomes an
 * anchor carrying its own content.
 */
export function parseYouVersionChapterHtml(
  rawHtml: string,
  context: { code: string; bookId: number; chapter: number },
): YouVersionChapter {
  const { html } = transformBibleHtml(rawHtml);
  const doc = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`).window.document;

  const verseText = new Map<number, string>();
  const order: number[] = [];
  const headings: ProviderHeading[] = [];
  const paragraphs: ProviderParagraph[] = [];
  const footnotes: YouVersionFootnote[] = [];
  let pendingHeadings: ProviderHeading[] = [];

  const blocks = [...doc.querySelectorAll("div[class]")].filter((div) => !div.querySelector("div[class]"));
  for (const block of blocks) {
    const cls = (block.getAttribute("class") ?? "").trim();
    const wrappers = [...block.querySelectorAll(".yv-v[v]")].filter((el) => !el.parentElement?.closest(".yv-v[v]"));

    if (!wrappers.length) {
      if (isHeadingBlock(cls)) {
        const heading = readingText(block);
        if (heading) pendingHeadings.push(/^qa/i.test(cls) ? { text: heading, kind: "qa" } : { text: heading });
      }
      continue;
    }

    const blockVerses: number[] = [];
    wrappers.forEach((wrapper, index) => {
      const verse = parseInt(wrapper.getAttribute("v") ?? "", 10);
      if (!Number.isFinite(verse) || verse <= 0) return;
      if (!verseText.has(verse)) {
        verseText.set(verse, "");
        order.push(verse);
      }
      blockVerses.push(verse);
      if (pendingHeadings.length) {
        headings.push(...pendingHeadings.map((heading) => ({ ...heading, beforeVerse: verse })));
        pendingHeadings = [];
      }
      wrapper.querySelectorAll(FOOTNOTE).forEach((anchor) => {
        const text = footnoteText(anchor);
        if (text) footnotes.push({ verse, text });
      });
      const text = readingText(wrapper);
      if (!text) return;
      const existing = verseText.get(verse);
      verseText.set(verse, existing ? `${existing}${index === 0 ? "\n" : " "}${text}` : text);
    });

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
