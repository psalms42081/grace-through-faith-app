import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  SHEET_ACTION_SCOPE,
  VERSE_RANGE_DASH,
  buildHighlightSheetPayload,
  buildSelectionCopyText,
  collapseVerseRanges,
  formatSelectionPreview,
  formatVerseRangeLabel,
  highlightIdsForVerses,
  toggleVerseSelection,
} from "../lib/verse-selection";

describe("toggleVerseSelection", () => {
  it("adds a verse that is not selected (select-add)", () => {
    assert.deepEqual(toggleVerseSelection([], 1), [1]);
    assert.deepEqual(toggleVerseSelection([1], 3), [1, 3]);
    assert.deepEqual(toggleVerseSelection([1, 3], 2), [1, 2, 3]);
  });

  it("removes a verse that is already selected (select-remove)", () => {
    assert.deepEqual(toggleVerseSelection([1], 1), []);
    assert.deepEqual(toggleVerseSelection([1, 2, 3], 2), [1, 3]);
    assert.deepEqual(toggleVerseSelection([7, 1, 3], 7), [1, 3]);
  });

  it("keeps the selection sorted by verse number", () => {
    assert.deepEqual(toggleVerseSelection([7, 1], 3), [1, 3, 7]);
  });
});

describe("formatVerseRangeLabel / collapseVerseRanges", () => {
  it("formats a single verse", () => {
    assert.equal(collapseVerseRanges([7]), "7");
    assert.equal(formatVerseRangeLabel("1 Chronicles", 14, [7]), "1 Chronicles 14:7");
  });

  it("formats a contiguous range with an en-dash", () => {
    assert.equal(collapseVerseRanges([1, 2, 3]), `1${VERSE_RANGE_DASH}3`);
    assert.equal(
      formatVerseRangeLabel("1 Chronicles", "14", [1, 2, 3]),
      `1 Chronicles 14:1${VERSE_RANGE_DASH}3`,
    );
  });

  it("formats non-contiguous ranges as comma-separated groups", () => {
    assert.equal(collapseVerseRanges([1, 2, 3, 7]), `1${VERSE_RANGE_DASH}3, 7`);
    assert.equal(
      formatVerseRangeLabel("1 Chronicles", 14, [1, 2, 3, 7]),
      `1 Chronicles 14:1${VERSE_RANGE_DASH}3, 7`,
    );
  });

  it("collapses mixed runs and ignores order/duplicates", () => {
    assert.equal(
      collapseVerseRanges([10, 1, 2, 3, 7, 8, 3]),
      `1${VERSE_RANGE_DASH}3, 7${VERSE_RANGE_DASH}8, 10`,
    );
    assert.equal(collapseVerseRanges([1, 3, 5]), "1, 3, 5");
  });
});

describe("formatSelectionPreview", () => {
  it("returns the first verse text as-is when only one is selected", () => {
    assert.equal(formatSelectionPreview(["Now Hiram king of Tyre sent messengers."]), "Now Hiram king of Tyre sent messengers.");
  });

  it("appends an ellipsis when more than one verse is selected", () => {
    assert.equal(
      formatSelectionPreview(["Now Hiram king of Tyre sent messengers.", "And David knew."]),
      "Now Hiram king of Tyre sent messengers.\u2026",
    );
  });
});

describe("highlight-sheet payload", () => {
  const verses = [
    { verse: 7, text: "Elishama, Beeliada and Eliphelet." },
    { verse: 1, text: "Now Hiram king of Tyre sent messengers." },
    { verse: 2, text: "And David knew that the LORD had established him." },
    { verse: 3, text: "In Jerusalem David took more wives." },
  ];

  it("builds the combined range, first-verse preview, and full copy text", () => {
    const payload = buildHighlightSheetPayload({
      bookName: "1 Chronicles",
      chapter: 14,
      translation: "NIV",
      verses,
    });
    assert.equal(payload.reference, `1 Chronicles 14:1${VERSE_RANGE_DASH}3, 7`);
    assert.equal(payload.preview, "Now Hiram king of Tyre sent messengers.\u2026");
    assert.equal(payload.firstVerse?.verse, 1);
    assert.deepEqual(payload.verseNumbers, [1, 2, 3, 7]);
    assert.equal(
      payload.copyText,
      buildSelectionCopyText({
        bookName: "1 Chronicles",
        chapter: 14,
        translation: "NIV",
        verses,
      }),
    );
    assert.match(payload.copyText, /Now Hiram/);
    assert.match(payload.copyText, /Elishama/);
    assert.match(payload.copyText, new RegExp(`1 Chronicles 14:1${VERSE_RANGE_DASH}3, 7 \\(NIV\\)`));
  });

  it("scopes colour/clear/copy/share to the full selection and the rest to the first verse", () => {
    const payload = buildHighlightSheetPayload({
      bookName: "1 Chronicles",
      chapter: 14,
      translation: "NIV",
      verses,
    });
    assert.equal(payload.actionScope.color, "all");
    assert.equal(payload.actionScope.clear, "all");
    assert.equal(payload.actionScope.copy, "all");
    assert.equal(payload.actionScope.share, "all");
    assert.equal(payload.actionScope.explain, "first");
    assert.equal(payload.actionScope.note, "first");
    assert.equal(payload.actionScope.compare, "first");
    assert.equal(payload.actionScope.save, "first");
    assert.equal(SHEET_ACTION_SCOPE.explain, "first");
  });
});

describe("highlightIdsForVerses", () => {
  it("matches stored highlight rows by verse id or book/chapter/verse", () => {
    const ids = highlightIdsForVerses(
      [
        { id: "h-a", verseId: "niv-13-14-1" },
        { id: "h-b", verseId: "other", bookId: 13, chapter: 14, verse: 7 },
        { id: "h-skip", verseId: "other", bookId: 13, chapter: 14, verse: 9 },
      ],
      [
        { id: "niv-13-14-1", verse: 1 },
        { id: "niv-13-14-7", verse: 7 },
      ],
      13,
      14,
    );
    assert.deepEqual(ids.sort(), ["h-a", "h-b"]);
  });
});

describe("reader wiring", () => {
  it("toggles selection by verse number and renders selectedVerses.has in prose", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    const prose = readFileSync(new URL("../components/reader/TypographyPreviewProse.tsx", import.meta.url), "utf8");
    assert.match(reader, /toggleVerseSelection/);
    assert.match(reader, /buildHighlightSheetPayload/);
    assert.match(reader, /highlightIdsForVerses/);
    assert.match(reader, /selectedVerses=\{selectedVerseSet\}/);
    assert.match(reader, /setSelectedVerseNums\(\(prev\) => \(prev\.length === 0 \? \[item\.verse\] : prev\)\)/);
    assert.match(reader, /setSelectedVerseNums\(\[\]\);\s*setSheetOpen\(false\);/);
    assert.match(prose, /selectedVerses\.has\(v\.verse\)/);
    assert.match(prose, /IS_WEB \? undefined : \{ accessibilityRole: "button"/);
  });
});
