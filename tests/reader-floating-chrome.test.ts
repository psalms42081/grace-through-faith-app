import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  NATIVE_TAB_BAR_HEIGHT,
  READER_FLOATING_CHROME_HEIGHT,
  WEB_TAB_BAR_HEIGHT,
  floatingChromeHiddenAfterScroll,
  nativeTabBarHeight,
  TAB_SCROLL_CLEARANCE,
  tabScrollBottomPad,
  readerChromeBottom,
  readerScrollBottomPad,
  readerScrollEndAir,
  readerTabBarClearance,
} from "../lib/reader-floating-chrome";

describe("reader floating chrome", () => {
  it("sits just above the tab bar and leaves scaled air under the last verse", () => {
    assert.equal(readerChromeBottom(WEB_TAB_BAR_HEIGHT), 84);
    assert.equal(readerChromeBottom(0, 48), 48);
    assert.equal(nativeTabBarHeight(48), NATIVE_TAB_BAR_HEIGHT + 48);
    assert.equal(tabScrollBottomPad(0, "android"), NATIVE_TAB_BAR_HEIGHT + TAB_SCROLL_CLEARANCE);
    assert.equal(tabScrollBottomPad(48, "android"), nativeTabBarHeight(48) + TAB_SCROLL_CLEARANCE);
    assert.equal(tabScrollBottomPad(34, "web"), WEB_TAB_BAR_HEIGHT + 34 + TAB_SCROLL_CLEARANCE);
    assert.equal(readerChromeBottom(nativeTabBarHeight(48), 48), nativeTabBarHeight(48));
    assert.equal(readerTabBarClearance(false), 0);
    assert.equal(readerTabBarClearance(true, undefined, "web"), 84);
    assert.equal(readerTabBarClearance(true, undefined, "android"), 64);
    assert.equal(readerTabBarClearance(true, 90), 90);
    assert.equal(readerScrollEndAir(1), 80);
    assert.equal(readerScrollEndAir(2), 128);
    const pad = readerScrollBottomPad({
      tabBarHeight: 84,
      safeBottom: 0,
      fontScale: 2,
      chromeHeight: READER_FLOATING_CHROME_HEIGHT,
    });
    assert.equal(pad, READER_FLOATING_CHROME_HEIGHT + 8 + 84 + 128);
    assert.ok(pad > 84 + READER_FLOATING_CHROME_HEIGHT);
  });

  it("hides on scroll down and returns on scroll up, chapter end, or a tap", () => {
    const down = floatingChromeHiddenAfterScroll({
      y: 80,
      dy: 20,
      viewportHeight: 600,
      contentHeight: 2000,
      currentlyHidden: false,
    });
    const up = floatingChromeHiddenAfterScroll({
      y: 40,
      dy: -20,
      viewportHeight: 600,
      contentHeight: 2000,
      currentlyHidden: true,
    });
    const end = floatingChromeHiddenAfterScroll({
      y: 1400,
      dy: 20,
      viewportHeight: 600,
      contentHeight: 2000,
      currentlyHidden: true,
    });
    assert.equal(down, true);
    assert.equal(up, false);
    assert.equal(end, false);

    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    const tabs = readFileSync(new URL("../app/(tabs)/_layout.tsx", import.meta.url), "utf8");
    assert.match(reader, /isTabReader \|\| Platform\.OS === "web"/);
    assert.match(reader, /nativeTabBarHeight\(insets\.bottom\)/);
    assert.match(reader, /bottom: chromeBottom/);
    assert.match(tabs, /nativeTabBarHeight\(insets\.bottom\)/);
    assert.match(tabs, /paddingBottom: insets\.bottom/);
    assert.match(reader, /if \(useNewTypography\) setStripHidden\(false\)/);
    assert.match(reader, /onTouchEnd=\{useNewTypography \? onPreviewChromeTouchEnd/);
    assert.match(reader, /testID="reader-floating-chrome"/);
  });
});
