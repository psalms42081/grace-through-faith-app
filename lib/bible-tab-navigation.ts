export const BIBLE_TAB_BOOKS = "/(tabs)/read";
export const HOME_TAB_PATH = "/home-v2";

export type BibleTabRouter = {
  back: () => void;
  replace: (href: any) => void;
  navigate: (href: any) => void;
};

export function isBibleTabSegments(segments: readonly string[]): boolean {
  return segments[0] === "(tabs)" && (segments as string[]).includes("read");
}

/** True only when this stack (not a parent tab) has a screen to pop. */
export function stackCanGoBackFromState(state: { type?: string; index?: number } | undefined): boolean {
  if (state?.type === "stack" && typeof state.index === "number") {
    return state.index > 0;
  }
  return false;
}

export function bibleTabReaderPath(bookId: number | string, chapter: number | string, translation?: string): string {
  const base = `${BIBLE_TAB_BOOKS}/${bookId}/${chapter}`;
  if (!translation) return base;
  return `${base}?translation=${encodeURIComponent(translation)}`;
}

export function bibleTabBookPath(bookId: number | string): string {
  return `${BIBLE_TAB_BOOKS}/${bookId}`;
}

/** Header / in-app back: pop if possible; from the tab reader at root go to Books. */
export function goBibleReaderBack(
  routerRef: BibleTabRouter,
  canPopStack: boolean,
  isTabReader: boolean,
): void {
  if (canPopStack) {
    routerRef.back();
    return;
  }
  if (isTabReader) {
    routerRef.replace(BIBLE_TAB_BOOKS);
    return;
  }
  routerRef.replace(HOME_TAB_PATH);
}

/** Books list in-app back: pop if pushed; hide the control at stack root instead of dispatching GO_BACK. */
export function goBibleBooksBack(routerRef: BibleTabRouter, canPopStack: boolean): void {
  if (canPopStack) routerRef.back();
}

export function openBibleTabBooks(routerRef: BibleTabRouter, canPopStack: boolean): void {
  if (canPopStack) {
    routerRef.navigate(BIBLE_TAB_BOOKS);
    return;
  }
  routerRef.replace(BIBLE_TAB_BOOKS);
}

export function goHomeTab(routerRef: BibleTabRouter): void {
  routerRef.replace(HOME_TAB_PATH);
}
