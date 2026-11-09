import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { bibleBookName, findScriptureCitations, parseScriptureReference } from "../lib/scripture-reference";
import { VERSE_SELECTION_WASH } from "../lib/verse-selection";

describe("scripture overlay href", () => {
  it("pushes a root-stack path so concordance stays mounted", () => {
    const nav = readFileSync(new URL("../lib/scripture-nav.ts", import.meta.url), "utf8");
    assert.match(nav, /export const SCRIPTURE_OVERLAY_PATH = "\/scripture"/);
    assert.match(nav, /pathname: SCRIPTURE_OVERLAY_PATH/);
    assert.match(nav, /params\.verse = String\(opts\.verse\)/);
  });
});

describe("bible book names", () => {
  it("resolves the English title from the book id before a passage request", () => {
    assert.equal(bibleBookName(40), "Matthew");
    assert.equal(bibleBookName("40"), "Matthew");
    assert.equal(bibleBookName(23), "Isaiah");
    assert.equal(bibleBookName(19), "Psalms");
    assert.equal(bibleBookName("19"), "Psalms");
    assert.equal(bibleBookName(66), "Revelation");
    assert.equal(bibleBookName(0), "");
    assert.equal(bibleBookName("nope"), "");
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

  it("keeps the book and the verse range together", () => {
    const range = findScriptureCitations("See 2 Cor. 3:14–18.");
    assert.equal(range.length, 1);
    assert.equal(range[0].bookId, 47);
    assert.equal(range[0].text, "2 Cor. 3:14–18");
    assert.equal(range[0].verse, 14);
    assert.equal(range[0].verseEnd, 18);
    const chronicles = parseScriptureReference("2 Chronicles 36:15, 16");
    assert.equal(chronicles?.bookId, 14);
    assert.equal(chronicles?.verse, 15);
    assert.equal(chronicles?.verseEnd, 16);
    const abbreviated = parseScriptureReference("2 Chron. 36:11");
    assert.equal(abbreviated?.bookId, 14);
    assert.equal(abbreviated?.chapter, 36);
    assert.equal(abbreviated?.verse, 11);
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
    const anchor = readFileSync(new URL("../lib/reader-verse-anchor.ts", import.meta.url), "utf8");
    assert.match(reader, /NAV_VERSE_WASH_HOLD_MS = 2000/);
    assert.match(reader, /scrollDomToVerse/);
    assert.match(anchor, /querySelectorAll/);
    assert.match(anchor, /data-verse/);
    assert.match(anchor, /reverse\(\)\.find/);
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
