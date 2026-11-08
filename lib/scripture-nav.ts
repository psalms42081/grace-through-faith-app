import { router } from "expo-router";

export const SCRIPTURE_OVERLAY_PATH = "/scripture";

export interface ScriptureRef {
  ref: string;
  bookId: number;
  chapter: number;
}

export function parseVerseFromRef(ref: string): string | undefined {
  const match = ref.match(/:(\d+)/);
  return match ? match[1] : undefined;
}

export function scriptureOverlayHref(opts: {
  bookId: number | string;
  chapter: number | string;
  verse?: number | string;
  verseEnd?: number | string;
  verses?: number[];
  translation?: string;
}): { pathname: "/scripture"; params: Record<string, string> } {
  const params: Record<string, string> = {
    bookId: String(opts.bookId),
    chapter: String(opts.chapter),
  };
  if (opts.verse !== undefined && String(opts.verse).length > 0) {
    params.verse = String(opts.verse);
  }
  if (opts.verseEnd !== undefined && String(opts.verseEnd).length > 0) {
    params.verseEnd = String(opts.verseEnd);
  }
  if (opts.verses && opts.verses.length > 0) {
    params.verses = opts.verses.join(",");
  }
  if (opts.translation) {
    params.translation = opts.translation;
  }
  return { pathname: SCRIPTURE_OVERLAY_PATH, params };
}

/** Push the reader on the root stack so the source screen (concordance / EGW / SS) stays mounted. */
export function navigateToScripture(scripture: ScriptureRef, translation?: string): void {
  const verse = parseVerseFromRef(scripture.ref);
  router.push(
    scriptureOverlayHref({
      bookId: scripture.bookId,
      chapter: scripture.chapter,
      verse,
      translation,
    }) as any,
  );
}

export function navigateToScriptureByParts(
  bookId: number,
  chapter: number,
  verse?: number | string,
  translation?: string,
  verseEnd?: number,
  verses?: number[],
): void {
  router.push(
    scriptureOverlayHref({
      bookId,
      chapter,
      verse,
      translation,
      verseEnd,
      verses,
    }) as any,
  );
}
