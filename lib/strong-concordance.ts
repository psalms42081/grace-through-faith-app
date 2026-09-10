import { formatStrongId } from "@/lib/reader-word-study";

export type StrongConcordanceUse = {
  verseId: string;
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
  bookName: string;
  abbreviation?: string | null;
};

export function concordanceHeading(strongId: string, lemma?: string | null): string {
  const id = formatStrongId(strongId);
  const word = (lemma ?? "").trim();
  return word ? `${id}  ${word}` : id;
}

export function formatUseReference(bookName: string, chapter: number, verse: number): string {
  return `${bookName} ${chapter}:${verse}`;
}
