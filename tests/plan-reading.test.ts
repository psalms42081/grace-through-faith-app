import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLAN_END_DWELL_MS,
  partMatchesReading,
  passageEndOffset,
  passageEndReached,
  planCardState,
  verseBottomReached,
} from "../lib/plan-reading";

describe("passage end", () => {
  it("waits three seconds after the end is on screen", () => {
    assert.equal(PLAN_END_DWELL_MS, 3000);
  });

  it("counts a short passage that fits, and a tall verse only once its bottom is in view", () => {
    assert.equal(verseBottomReached({
      verseTop: 40,
      verseHeight: 80,
      scrollY: 0,
      viewportHeight: 700,
    }), true);
    assert.equal(verseBottomReached({
      verseTop: 20,
      verseHeight: 900,
      scrollY: 0,
      viewportHeight: 700,
    }), false);
    assert.equal(verseBottomReached({
      verseTop: 20,
      verseHeight: 900,
      scrollY: 230,
      viewportHeight: 700,
    }), true);
  });

  it("moves the end farther down the page at a larger text size", () => {
    const small = passageEndOffset({
      contentHeight: 1200,
      bottomPadding: 160,
      targetVerse: 31,
      lastVerse: 31,
    });
    const large = passageEndOffset({
      contentHeight: 2800,
      bottomPadding: 220,
      targetVerse: 31,
      lastVerse: 31,
    });
    assert.equal(small, 1040);
    assert.equal(large, 2580);
    assert.equal(passageEndReached({
      scrollY: 0,
      viewportHeight: 700,
      contentHeight: 560,
      bottomPadding: 160,
      targetVerse: 10,
      lastVerse: 10,
    }), true);
    assert.equal(passageEndReached({
      scrollY: 0,
      viewportHeight: 700,
      contentHeight: 2800,
      bottomPadding: 220,
      targetVerse: 31,
      lastVerse: 31,
    }), false);
  });
});

describe("plan reading match", () => {
  const isaiah41 = { dayNumber: 2, bookId: 23, chapter: 41, verseStart: null, verseEnd: null };

  it("counts the last verse of the plan chapter and ignores a later chapter", () => {
    assert.equal(partMatchesReading(isaiah41, {
      bookId: 23,
      chapter: 41,
      verse: 29,
      source: "scroll",
      chapterLastVerse: 29,
    }), true);
    assert.equal(partMatchesReading(isaiah41, {
      bookId: 23,
      chapter: 45,
      verse: 1,
      source: "scroll",
      chapterLastVerse: 25,
    }), false);
    assert.equal(partMatchesReading(isaiah41, {
      bookId: 23,
      chapter: 41,
      verse: 1,
      source: "listen",
      chapterLastVerse: 29,
    }), true);
  });

  it("needs the end of a verse range", () => {
    const range = { dayNumber: 1, bookId: 40, chapter: 6, verseStart: 9, verseEnd: 13 };
    assert.equal(partMatchesReading(range, {
      bookId: 40,
      chapter: 6,
      verse: 12,
      source: "scroll",
      chapterLastVerse: 34,
    }), false);
    assert.equal(partMatchesReading(range, {
      bookId: 40,
      chapter: 6,
      verse: 13,
      source: "scroll",
      chapterLastVerse: 34,
    }), true);
  });
});

describe("plan card", () => {
  const days = [1, 2, 3, 4, 5, 6, 7];

  it("keeps one completion per local date and shows the finished day until tomorrow", () => {
    const reading = planCardState({
      dayNumbers: days,
      completed: [{ dayNumber: 1, localDate: null }],
      today: "2026-11-12",
      focusPartsDone: 0,
      focusPartsTotal: 1,
    });
    assert.equal(reading.status, "reading");
    assert.equal(reading.focusDay, 2);
    assert.equal(reading.percent, 14);

    const done = planCardState({
      dayNumbers: days,
      completed: [
        { dayNumber: 1, localDate: null },
        { dayNumber: 2, localDate: "2026-11-12" },
      ],
      today: "2026-11-12",
      focusPartsDone: 1,
      focusPartsTotal: 1,
    });
    assert.equal(done.status, "done-today");
    assert.equal(done.focusDay, 2);
    assert.equal(done.percent, 29);
    assert.equal(done.pace.find((day) => day.dayNumber === 3)?.canComplete, false);
  });
});
