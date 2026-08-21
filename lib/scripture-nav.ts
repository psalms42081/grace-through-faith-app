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

export function navigateToScripture(scripture: ScriptureRef, translation?: string): void {
  const verse = parseVerseFromRef(scripture.ref);
  let url = verse
    ? `/read/${scripture.bookId}/${scripture.chapter}?verse=${verse}`
    : `/read/${scripture.bookId}/${scripture.chapter}`;
  if (translation) {
    url += (url.includes("?") ? "&" : "?") + `translation=${encodeURIComponent(translation)}`;
  }
  router.push(url as any);
}

export function navigateToScriptureByParts(
  bookId: number,
  chapter: number,
  verse?: number | string,
  translation?: string
): void {
  let url = verse
    ? `/read/${bookId}/${chapter}?verse=${verse}`
    : `/read/${bookId}/${chapter}`;
  if (translation) {
    url += (url.includes("?") ? "&" : "?") + `translation=${encodeURIComponent(translation)}`;
  }
  router.push(url as any);
}
