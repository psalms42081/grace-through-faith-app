import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isSaturdayDate } from "../scripts/publish-pioneer-reading";
import {
  isPartialWordRange,
  normalizeWordRange,
  splitVerseWordPieces,
  wordInRange,
  wordRangeExcerpt,
} from "../lib/verse-word-range";

describe("verse word ranges", () => {
  it("indexes words and skips whitespace", () => {
    const pieces = splitVerseWordPieces("The LORD is my shepherd");
    const words = pieces.filter((piece) => piece.kind === "word");
    assert.deepEqual(words.map((piece) => piece.text), ["The", "LORD", "is", "my", "shepherd"]);
    assert.deepEqual(words.map((piece) => piece.index), [0, 1, 2, 3, 4]);
  });

  it("washes only the selected inclusive range", () => {
    const range = normalizeWordRange(3, 1);
    assert.deepEqual(range, { start: 1, end: 3 });
    assert.equal(wordInRange(1, range), true);
    assert.equal(wordInRange(3, range), true);
    assert.equal(wordInRange(0, range), false);
    assert.equal(wordRangeExcerpt("The LORD is my shepherd", 1, 3), "LORD is my");
    assert.equal(isPartialWordRange({ startWord: 1, endWord: 3 }), true);
    assert.equal(isPartialWordRange({ startWord: null, endWord: null }), false);
  });

  it("keeps whole-verse tap and adds range selection only when word study is off", () => {
    const prose = readFileSync(new URL("../components/reader/TypographyPreviewProse.tsx", import.meta.url), "utf8");
    const sheet = readFileSync(new URL("../components/reader/VerseSheet.tsx", import.meta.url), "utf8");
    const library = readFileSync(new URL("../app/library.tsx", import.meta.url), "utf8");
    assert.match(prose, /wordStudyMode && useWordTokens \?/);
    assert.match(prose, /VerseWordSpans/);
    assert.match(prose, /onVerseTap\(v\)/);
    assert.match(sheet, /Study this verse in the KJV/);
    assert.match(sheet, /!isKjvTranslation\(translation\)/);
    assert.match(library, /saved-highlight-remove-/);
    assert.match(library, /DELETE", `\/api\/highlights\/\$\{id\}`/);
    assert.match(library, /removeSessionHighlight/);
  });
});

describe("publish pioneer reading", () => {
  it("accepts Saturday week starts only", () => {
    assert.equal(isSaturdayDate("2026-09-05"), true);
    assert.equal(isSaturdayDate("2026-09-06"), false);
    assert.equal(isSaturdayDate("09-05-2026"), false);
  });
});
