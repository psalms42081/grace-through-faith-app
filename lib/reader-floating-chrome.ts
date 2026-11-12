/** paddingTop 8 + listen button 36 + paddingBottom 8. */
export const READER_FLOATING_CHROME_HEIGHT = 8 + 36 + 8;
export const WEB_TAB_BAR_HEIGHT = 84;
export const NATIVE_TAB_BAR_HEIGHT = 64;
const END_AIR_LINES = 2;
const BODY_LINE = 32;
const END_EPSILON = 24;

export function readerTabBarClearance(
  isTabReader: boolean,
  measured?: number | null,
  os?: string,
): number {
  if (typeof measured === "number" && measured > 0) return measured;
  if (!isTabReader) return 0;
  return os === "web" ? WEB_TAB_BAR_HEIGHT : NATIVE_TAB_BAR_HEIGHT;
}

/**
 * Android/iOS tab bar content plus the system nav inset.
 * The tab bar style uses this as its explicit height, so the floating
 * chrome can sit on its top edge. Web keeps a fixed 84px bar.
 */
export function nativeTabBarHeight(safeBottom: number): number {
  return NATIVE_TAB_BAR_HEIGHT + Math.max(0, safeBottom);
}

/** Air between the last row and the top of the tab bar. */
export const TAB_SCROLL_CLEARANCE = 24;

/**
 * Bottom padding for a scroll view that sits under the tab bar.
 * Native bar height already includes the safe-area inset, so the inset
 * is not added a second time. Web's bar is a fixed 84 and does not
 * include the inset, so the inset is added there.
 */
export function tabScrollBottomPad(safeBottom: number, os: string): number {
  const inset = Math.max(0, safeBottom);
  if (os === "web") return WEB_TAB_BAR_HEIGHT + inset + TAB_SCROLL_CLEARANCE;
  return nativeTabBarHeight(inset) + TAB_SCROLL_CLEARANCE;
}

/**
 * Distance from the screen bottom to the chrome row.
 * A positive tab bar height already includes the safe-area inset.
 * With no tab bar, lift the chrome by the safe-area inset alone.
 */
export function readerChromeBottom(tabBarHeight: number, safeBottom = 0): number {
  if (tabBarHeight > 0) return tabBarHeight;
  return Math.max(0, safeBottom);
}

export function readerScrollEndAir(fontScale: number): number {
  const scaled = BODY_LINE * Math.max(1, fontScale) * END_AIR_LINES;
  return Math.max(80, scaled);
}

export function readerScrollBottomPad(opts: {
  tabBarHeight: number;
  safeBottom: number;
  fontScale: number;
  chromeHeight: number;
}): number {
  const floor = opts.tabBarHeight > 0 ? opts.tabBarHeight : opts.safeBottom;
  return opts.chromeHeight + 8 + floor + readerScrollEndAir(opts.fontScale);
}

export function floatingChromeHiddenAfterScroll(opts: {
  y: number;
  dy: number;
  viewportHeight: number;
  contentHeight: number;
  currentlyHidden: boolean;
}): boolean {
  const atEnd = opts.y + opts.viewportHeight >= opts.contentHeight - END_EPSILON;
  if (atEnd) return false;
  if (opts.dy > 6) return true;
  if (opts.dy < -6) return false;
  return opts.currentlyHidden;
}
