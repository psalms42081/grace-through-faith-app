import { SCRIPTURE_FOR_TODAY_KJV } from "@/data/scripture-for-today-kjv";

export interface FallbackScripture {
  bookId: number;
  chapter: number;
  displayVerses: number[];
  linkVerses: number[];
  reference: string;
  fromLesson: false;
  text: string;
  translation: "KJV";
}

/** Built-in verse for a local day of the year. Day 1 is 1 January. */
export function fallbackScripture(dayOfYear: number): FallbackScripture {
  const length = SCRIPTURE_FOR_TODAY_KJV.length;
  const index = (Math.max(1, Math.floor(dayOfYear)) - 1) % length;
  const row = SCRIPTURE_FOR_TODAY_KJV[index];
  return {
    bookId: row.bookId,
    chapter: row.chapter,
    displayVerses: [row.verse],
    linkVerses: [row.verse],
    reference: row.reference,
    fromLesson: false,
    text: row.text,
    translation: "KJV",
  };
}
