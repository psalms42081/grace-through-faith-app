/**
 * PLACEHOLDER dataset for EGW Today fallback.
 * Do not ship until real excerpts are reviewed and substituted below.
 * Rotation is deterministic by device-local calendar day (see getEgwFallbackDevotion).
 */
export type EgwFallbackBook =
  | "Steps to Christ"
  | "The Desire of Ages"
  | "Christ's Object Lessons";

export type EgwFallbackDevotion = {
  id: string;
  book: EgwFallbackBook;
  chapterTitle: string;
  excerpt: string;
  source: string;
};

export const EGW_FALLBACK_BOOK_IDS: Record<EgwFallbackBook, number> = {
  "Steps to Christ": 108,
  "The Desire of Ages": 130,
  "Christ's Object Lessons": 15,
};

export const EGW_FALLBACK_DEVOTIONS: EgwFallbackDevotion[] = [
  {
    id: "stc-placeholder-1",
    book: "Steps to Christ",
    chapterTitle: "[PLACEHOLDER] Chapter title — Steps to Christ",
    excerpt:
      "[PLACEHOLDER] Supply the reviewed Steps to Christ excerpt here before this ships.",
    source: "[PLACEHOLDER] Source citation — Steps to Christ",
  },
  {
    id: "da-placeholder-1",
    book: "The Desire of Ages",
    chapterTitle: "[PLACEHOLDER] Chapter title — The Desire of Ages",
    excerpt:
      "[PLACEHOLDER] Supply the reviewed Desire of Ages excerpt here before this ships.",
    source: "[PLACEHOLDER] Source citation — The Desire of Ages",
  },
  {
    id: "col-placeholder-1",
    book: "Christ's Object Lessons",
    chapterTitle: "[PLACEHOLDER] Chapter title — Christ's Object Lessons",
    excerpt:
      "[PLACEHOLDER] Supply the reviewed Christ's Object Lessons excerpt here before this ships.",
    source: "[PLACEHOLDER] Source citation — Christ's Object Lessons",
  },
];
