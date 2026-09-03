import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSabbathDateKey } from "../../shared/calendar-date";
import { publicDomainLine } from "../../shared/pioneer-authors";
import {
  paragraphEndForWordBudget,
  selectPioneerWeekReading,
  slicePioneerParagraphs,
} from "../../shared/pioneer-passage";

describe("Sabbath-week selection for Voice of the Week", () => {
  it("uses the Saturday that ends the Melbourne week containing today", () => {
    // Friday 4 Sep 2026 08:00 Melbourne = Thursday 3 Sep 22:00 UTC
    const fridayMorning = new Date("2026-09-03T22:00:00.000Z");
    assert.equal(
      getSabbathDateKey(fridayMorning, "Australia/Melbourne"),
      "2026-09-05",
    );

    const saturdayMorning = new Date("2026-09-04T22:00:00.000Z");
    assert.equal(
      getSabbathDateKey(saturdayMorning, "Australia/Melbourne"),
      "2026-09-05",
    );

    const sundayMorning = new Date("2026-09-05T22:00:00.000Z");
    assert.equal(
      getSabbathDateKey(sundayMorning, "Australia/Melbourne"),
      "2026-09-12",
    );
  });

  it("prefers the published reading for this Sabbath, else the most recent dated one", () => {
    const rows = [
      { id: "older", weekStart: "2026-08-29", sortOrder: 0 },
      { id: "this-week", weekStart: "2026-09-05", sortOrder: 2 },
      { id: "this-week-first", weekStart: "2026-09-05", sortOrder: 0 },
      { id: "undated", weekStart: null, sortOrder: 0 },
    ];
    assert.equal(selectPioneerWeekReading(rows, "2026-09-05")?.id, "this-week-first");
    assert.equal(selectPioneerWeekReading(rows, "2026-09-12")?.id, "this-week-first");
    assert.equal(
      selectPioneerWeekReading(
        rows.filter((row) => !row.weekStart),
        "2026-09-05",
      )?.id,
      "undated",
    );
    assert.equal(selectPioneerWeekReading([], "2026-09-05"), null);
  });
});

describe("Pioneer passage helpers", () => {
  it("slices paragraphs with 1-based inclusive bounds", () => {
    assert.deepEqual(slicePioneerParagraphs(["a", "b", "c"], 1, 2), ["a", "b"]);
    assert.deepEqual(slicePioneerParagraphs(["a", "b"], 0, 9), ["a", "b"]);
    assert.deepEqual(slicePioneerParagraphs([], 1, 3), []);
  });

  it("takes whole paragraphs until about 800 words", () => {
    const short = "word ".repeat(100).trim();
    const paragraphs = [short, short, short, short, short, short, short, short, "tail"];
    assert.equal(paragraphEndForWordBudget(paragraphs, 800), 8);
    assert.equal(paragraphEndForWordBudget([short], 800), 1);
  });

  it("formats the public-domain line without AI language", () => {
    assert.equal(
      publicDomainLine("Ellet Joseph Waggoner", "Christ and His Righteousness", 1890),
      "Public domain — Ellet Joseph Waggoner, Christ and His Righteousness (1890)",
    );
  });
});
