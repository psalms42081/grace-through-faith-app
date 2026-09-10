/** Scroll the reader to a verse that arrived from concordance / EGW / SS. */

export function scrollDomToVerse(verseNum: number): boolean {
  if (typeof document === "undefined") return false;
  const labeled = document.querySelector(`[aria-label="Verse ${verseNum}"]`);
  const marked = document.querySelector(`[data-verse="${verseNum}"]`);
  const el = (labeled || marked) as HTMLElement | null;
  if (!el || typeof el.scrollIntoView !== "function") return false;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
}
