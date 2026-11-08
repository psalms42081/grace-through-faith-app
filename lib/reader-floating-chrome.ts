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

/** Distance from the screen bottom to the chrome row. */
export function readerChromeBottom(tabBarHeight: number): number {
  return Math.max(0, tabBarHeight);
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
