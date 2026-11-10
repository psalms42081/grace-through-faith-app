import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { consecutiveReadingStreak } from "../shared/calendar-date";
import { footnoteSuperscript, splitLeadingFootnote } from "../lib/scripture-footnote";
import { findScriptureCitations } from "../lib/scripture-reference";

describe("consecutive reading streak", () => {
  it("counts each ticked calendar day once, through today", () => {
    assert.equal(consecutiveReadingStreak(["2026-11-08", "2026-11-09"], "2026-11-09"), 2);
    assert.equal(consecutiveReadingStreak(["2026-11-09", "2026-11-09"], "2026-11-09"), 1);
  });

  it("keeps a streak that ended yesterday and stops at a gap", () => {
    assert.equal(consecutiveReadingStreak(["2026-11-07", "2026-11-08"], "2026-11-09"), 2);
    assert.equal(consecutiveReadingStreak(["2026-11-06", "2026-11-08"], "2026-11-09"), 1);
    assert.equal(consecutiveReadingStreak(["2026-11-01"], "2026-11-09"), 0);
  });
});

describe("pioneer footnote markers", () => {
  it("lifts a bare number immediately before a scripture citation", () => {
    const text = "the cloud by day. 10 Exodus 40:38 and the fire by night.";
    const [hit] = findScriptureCitations(text);
    assert.ok(hit);
    const gap = text.slice(0, hit.start);
    const marker = splitLeadingFootnote(gap);
    assert.equal(marker.digits, "10");
    assert.equal(footnoteSuperscript(marker.digits!), "¹⁰");
    assert.match(marker.plain, /cloud by day\. $/);
  });

  it("leaves years and citation numbers alone", () => {
    assert.equal(splitLeadingFootnote("published 1844 ").digits, null);
    assert.equal(splitLeadingFootnote("Exodus ").digits, null);
  });
});

describe("second Android build sources", () => {
  it("pops hardware back on the focused screen and does not send a pushed reader home", () => {
    const hook = readFileSync(new URL("../lib/use-hardware-back-to-home.ts", import.meta.url), "utf8");
    const root = readFileSync(new URL("../app/_layout.tsx", import.meta.url), "utf8");
    assert.match(hook, /if \(!navigation\.isFocused\(\)\) return false/);
    assert.match(hook, /if \(canPopStack\) \{\s*router\.back\(\);\s*return true;/);
    assert.match(root, /if \(router\.canGoBack\(\)\) \{\s*router\.back\(\);\s*return true;/);
  });

  it("gives every nested reader span the paragraph line height", () => {
    const prose = readFileSync(new URL("../components/reader/TypographyPreviewProse.tsx", import.meta.url), "utf8");
    assert.match(prose, /fontSize: superSize, lineHeight: bodyLine/);
    assert.doesNotMatch(prose, /lineHeight: superSize \* 1\.2/);
    assert.match(prose, /lineHeight=\{bodyLine\}/);
  });

  it("embeds YouTube with an app origin and a timed fallback", () => {
    const player = readFileSync(new URL("../app/sermon-player.tsx", import.meta.url), "utf8");
    assert.match(player, /baseUrl: embedOrigin/);
    assert.match(player, /iframe_api/);
    assert.match(player, /player failed to load within 8 seconds/);
    assert.match(player, /setTimeout\(markFailed, 8000\)/);
    assert.match(player, /autoplay:0/);
    assert.match(player, /autoplay=0/);
    assert.match(player, /useVideoSurfaceActive/);
    assert.match(player, /mediaPlaybackRequiresUserAction/);
    assert.match(player, /accessibilityLabel="Play video"/);
    assert.match(player, /Open in YouTube/);
    assert.doesNotMatch(player, /allow="[^"]*autoplay/);
    assert.doesNotMatch(player, /Platform\.OS !== "android"/);
  });
});
