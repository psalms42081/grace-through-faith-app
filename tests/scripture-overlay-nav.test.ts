import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { findScriptureCitations, parseScriptureReference } from "../lib/scripture-reference";
import { VERSE_SELECTION_WASH } from "../lib/verse-selection";

describe("scripture overlay href", () => {
  it("pushes a root-stack path so concordance stays mounted", () => {
    const nav = readFileSync(new URL("../lib/scripture-nav.ts", import.meta.url), "utf8");
    assert.match(nav, /export const SCRIPTURE_OVERLAY_PATH = "\/scripture"/);
    assert.match(nav, /pathname: SCRIPTURE_OVERLAY_PATH/);
    assert.match(nav, /params\.verse = String\(opts\.verse\)/);
  });
});

describe("scripture citations", () => {
  it("parses Ps. and full Psalm forms", () => {
    assert.deepEqual(parseScriptureReference("Ps. 23:2"), { bookId: 19, chapter: 23, verse: 2 });
    assert.deepEqual(parseScriptureReference("Psalm 23:2"), { bookId: 19, chapter: 23, verse: 2 });
  });

  it("finds inline citations in pioneer / SS prose", () => {
    const hits = findScriptureCitations("See Ps. 23:2 and John 10:11.");
    assert.equal(hits.length, 2);
    assert.equal(hits[0].bookId, 19);
    assert.equal(hits[0].verse, 2);
    assert.equal(hits[1].bookId, 43);
    assert.equal(hits[1].verse, 11);
  });
});

describe("concordance and verse-sheet reader hop", () => {
  it("routes concordance taps through the overlay helper", () => {
    const concordance = readFileSync(new URL("../app/strong-concordance.tsx", import.meta.url), "utf8");
    const nav = readFileSync(new URL("../lib/scripture-nav.ts", import.meta.url), "utf8");
    assert.match(concordance, /navigateToScriptureByParts/);
    assert.match(nav, /pathname: SCRIPTURE_OVERLAY_PATH/);
    assert.match(nav, /router\.push/);
  });

  it("scrolls to the verse and holds the selection wash for two seconds", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(reader, /NAV_VERSE_WASH_HOLD_MS = 2000/);
    assert.match(reader, /scrollDomToVerse/);
    assert.match(reader, /VERSE_SELECTION_WASH/);
    assert.match(reader, /isScriptureOverlay/);
    assert.match(reader, /router\.back\(\)/);
    assert.equal(VERSE_SELECTION_WASH, "rgba(31,26,18,0.10)");
  });

  it("keeps EGW and Sabbath School rows on the root stack", () => {
    const sheet = readFileSync(new URL("../components/reader/VerseSheet.tsx", import.meta.url), "utf8");
    assert.match(sheet, /pathname: "\/pioneer-chapter"/);
    assert.match(sheet, /SABBATH_SCHOOL_READING_OVERLAY/);
    assert.doesNotMatch(sheet, /buildSabbathSchoolTabRoute/);
  });
});
