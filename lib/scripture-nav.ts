import { router } from "expo-router";

export interface ScriptureRef {
  ref: string;
  bookId: number;
  chapter: number;
}

export function parseVerseFromRef(ref: string): string | undefined {
  const match = ref.match(/:(\d+)/);
  return match ? match[1] : undefined;
}

export function navigateToScripture(scripture: ScriptureRef): void {
  const verse = parseVerseFromRef(scripture.ref);
  const url = verse
    ? `/read/${scripture.bookId}/${scripture.chapter}?verse=${verse}`
    : `/read/${scripture.bookId}/${scripture.chapter}`;
  router.push(url as any);
}

export function navigateToScriptureByParts(
  bookId: number,
  chapter: number,
  verse?: number | string
): void {
  const url = verse
    ? `/read/${bookId}/${chapter}?verse=${verse}`
    : `/read/${bookId}/${chapter}`;
  router.push(url as any);
}
