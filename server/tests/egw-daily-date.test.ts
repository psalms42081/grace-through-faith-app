import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveEgwDailyCalendar } from "../services/egwService";

describe("EGW today uses device-local calendar date", () => {
  it("uses Melbourne's date, month, and day when they differ from UTC", () => {
    const previousUtcDay = new Date("2025-12-31T14:30:00.000Z");
    const melbourne = resolveEgwDailyCalendar(
      previousUtcDay,
      "Australia/Melbourne"
    );
    const utc = resolveEgwDailyCalendar(previousUtcDay, "UTC");

    assert.equal(melbourne.dateKey, "2026-01-01");
    assert.equal(melbourne.dayOfMonthIndex, 0);
    assert.equal(melbourne.bookIndex, 0);

    assert.equal(utc.dateKey, "2025-12-31");
    assert.equal(utc.dayOfMonthIndex, 30);
    assert.equal(utc.bookIndex, 11 % 3);
  });

  it("does not fall back to UTC toISOString for the displayed date", () => {
    const eveningUtc = new Date("2026-08-30T14:30:00.000Z");
    const melbourne = resolveEgwDailyCalendar(
      eveningUtc,
      "Australia/Melbourne"
    );
    assert.equal(melbourne.dateKey, "2026-08-31");
    assert.notEqual(melbourne.dateKey, eveningUtc.toISOString().split("T")[0]);
    assert.equal(melbourne.dayOfMonthIndex, 30);
    assert.equal(melbourne.bookIndex, 7 % 3);
  });
});
