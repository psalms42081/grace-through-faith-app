/** Scroll the reader to a verse that arrived from concordance / EGW / SS. */
function isLaidOut(el: Element): boolean {
  const r = (el as HTMLElement).getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

export function scrollDomToVerse(verseNum: number): boolean {
  if (typeof document === "undefined") return false;
  const nodes = [
    ...document.querySelectorAll(`[data-verse="${verseNum}"]`),
    ...document.querySelectorAll(`[aria-label="Verse ${verseNum}"]`),
    ...document.querySelectorAll(`#reader-verse-${verseNum}`),
  ];
  // Tab reader stays mounted under /scripture, so verse 27 exists twice.
  // Prefer a laid-out node, last in document order (the overlay).
  const el = [...nodes].reverse().find(isLaidOut) as HTMLElement | undefined;
  if (!el || typeof el.scrollIntoView !== "function") return false;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
}
