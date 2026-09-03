import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addCalendarDays,
  getCalendarDate,
  getCalendarDayIndex,
  getSabbathDateKey,
  getSundayWeekStartDateKey,
  normalizeTimeZone,
} from "../../shared/calendar-date";

describe("shared local calendar dates", () => {
  it("uses Melbourne's date when it differs from UTC", () => {
    const instant = new Date("2026-01-01T00:30:00.000Z");
    assert.equal(getCalendarDate(instant, "Australia/Melbourne").dateKey, "2026-01-01");

    const previousUtcDay = new Date("2025-12-31T14:30:00.000Z");
    assert.equal(
      getCalendarDate(previousUtcDay, "Australia/Melbourne").dateKey,
      "2026-01-01"
    );
    assert.equal(getCalendarDate(previousUtcDay, "UTC").dateKey, "2025-12-31");
  });

  it("stays on local calendar dates across Melbourne DST changes", () => {
    assert.equal(
      getCalendarDate(
        new Date("2026-10-03T16:30:00.000Z"),
        "Australia/Melbourne"
      ).dateKey,
      "2026-10-04"
    );
    assert.equal(
      getCalendarDate(
        new Date("2026-04-04T16:30:00.000Z"),
        "Australia/Melbourne"
      ).dateKey,
      "2026-04-05"
    );
  });

  it("derives leap-day and year-boundary day indexes locally", () => {
    assert.equal(
      getCalendarDayIndex(
        new Date("2024-02-28T13:30:00.000Z"),
        "Australia/Melbourne"
      ),
      60
    );
    assert.equal(
      getCalendarDayIndex(
        new Date("2025-12-31T13:30:00.000Z"),
        "Australia/Melbourne"
      ),
      1
    );
  });

  it("falls back to UTC for missing, malformed, and invalid zones", () => {
    const instant = new Date("2025-12-31T13:30:00.000Z");
    assert.equal(normalizeTimeZone(undefined), "UTC");
    assert.equal(normalizeTimeZone("not/a-zone"), "UTC");
    assert.equal(normalizeTimeZone("x".repeat(101)), "UTC");
    assert.equal(getCalendarDate(instant, undefined).dateKey, "2025-12-31");
    assert.equal(getCalendarDate(instant, "not/a-zone").dateKey, "2025-12-31");
  });

  it("computes yesterday across leap and year boundaries", () => {
    assert.equal(addCalendarDays("2024-03-01", -1), "2024-02-29");
    assert.equal(addCalendarDays("2026-01-01", -1), "2025-12-31");
  });

  it("uses the local weekday and Sunday week boundary", () => {
    const melbourneMondayUtcSunday = new Date("2026-08-23T14:30:00.000Z");
    const local = getCalendarDate(
      melbourneMondayUtcSunday,
      "Australia/Melbourne"
    );
    assert.equal(local.dateKey, "2026-08-24");
    assert.equal(local.weekday, 1);
    assert.equal(
      getSundayWeekStartDateKey(
        melbourneMondayUtcSunday,
        "Australia/Melbourne"
      ),
      "2026-08-23"
    );

    const melbourneSundayUtcSaturday = new Date("2026-08-22T14:30:00.000Z");
    assert.equal(
      getSundayWeekStartDateKey(
        melbourneSundayUtcSaturday,
        "Australia/Melbourne"
      ),
      "2026-08-23"
    );
    assert.equal(
      getSundayWeekStartDateKey(melbourneSundayUtcSaturday, "UTC"),
      "2026-08-16"
    );
  });

  it("returns the Saturday that closes the local Sunday–Saturday week", () => {
    const melbourneFriday = new Date("2026-09-03T22:00:00.000Z");
    assert.equal(
      getSabbathDateKey(melbourneFriday, "Australia/Melbourne"),
      "2026-09-05"
    );
    assert.equal(getSabbathDateKey(melbourneFriday, "UTC"), "2026-09-05");
  });
});