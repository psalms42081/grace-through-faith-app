/**
 * Installed PWAs often keep the JS heap when "closed". A one-shot session
 * flag then blocks the reload that would pick up a new deploy. Compare the
 * running entry script to a fresh index.html, and key the reload flag to
 * that new script so the same build does not loop.
 */
export const PWA_RELOAD_PREFIX = "im-pwa-sw-reloaded:";

const ENTRY_SRC = /src="(\/_expo\/static\/js\/web\/entry-[^"]+)"/;

export function entryScriptFromHtml(html: string): string | null {
  const match = html.match(ENTRY_SRC);
  return match?.[1] ?? null;
}

export function shellNeedsReload(pageScript: string | null | undefined, freshHtml: string): boolean {
  const fresh = entryScriptFromHtml(freshHtml);
  if (!pageScript || !fresh) return false;
  return pageScript !== fresh;
}

export function reloadStorageKey(token: string): string {
  return `${PWA_RELOAD_PREFIX}${token}`;
}

export function shouldReloadNow(getItem: (key: string) => string | null, token: string): boolean {
  if (!token) return false;
  return getItem(reloadStorageKey(token)) !== "1";
}

export function markReloaded(setItem: (key: string, value: string) => void, token: string): void {
  setItem(reloadStorageKey(token), "1");
}
