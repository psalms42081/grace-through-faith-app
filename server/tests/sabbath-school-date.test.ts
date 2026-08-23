import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findTodayDayNumber,
  formatSabbathSchoolDate,
  normalizeSabbathSchoolTimeZone,
  sabbathSchoolDateAtUtcMidnight,
} from "../services/sabbath-school-date";

describe("Sabbath School local calendar date", () => {
  const sydneyMondayMorning = new Date("2026-08-23T22:37:00.000Z");

  it("uses the member's local date instead of the UTC date", () => {
    assert.equal(
      formatSabbathSchoolDate(sydneyMondayMorning, "Australia/Sydney"),
      "24/08/2026"
    );
    assert.equal(
      formatSabbathSchoolDate(sydneyMondayMorning, "UTC"),
      "23/08/2026"
    );
  });

  it("selects Monday rather than Sunday for the reported Sydney case", () => {
    const days = [
      { date: "22/08/2026", dayNumber: 1 },
      { date: "23/08/2026", dayNumber: 2 },
      { date: "24/08/2026", dayNumber: 3 },
    ];

    assert.equal(
      findTodayDayNumber(days, sydneyMondayMorning, "Australia/Sydney"),
      3
    );
    assert.equal(findTodayDayNumber(days, sydneyMondayMorning, "UTC"), 2);
  });

  it("uses the same local date for current-lesson range comparisons", () => {
    assert.equal(
      sabbathSchoolDateAtUtcMidnight(
        sydneyMondayMorning,
        "Australia/Sydney"
      ).toISOString(),
      "2026-08-24T00:00:00.000Z"
    );
  });

  it("falls back safely when a client supplies an invalid timezone", () => {
    assert.equal(normalizeSabbathSchoolTimeZone("not/a-time-zone"), "UTC");
    assert.equal(
      formatSabbathSchoolDate(sydneyMondayMorning, "not/a-time-zone"),
      "23/08/2026"
    );
  });
});