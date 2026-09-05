import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldShowOdbAfternoonHint } from "../lib/odb-afternoon-hint";

function localDate(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

describe("shouldShowOdbAfternoonHint", () => {
  it("shows when the served post is yesterday and it is morning", () => {
    assert.equal(
      shouldShowOdbAfternoonHint("2026-09-04", localDate(2026, 9, 5, 8, 0)),
      true,
    );
  });

  it("hides when the served post is today, even in the afternoon", () => {
    assert.equal(
      shouldShowOdbAfternoonHint("2026-09-05", localDate(2026, 9, 5, 15, 0)),
      false,
    );
  });

  it("hides when the served post is today in the morning", () => {
    assert.equal(
      shouldShowOdbAfternoonHint("2026-09-05", localDate(2026, 9, 5, 8, 0)),
      false,
    );
  });

  it("shows when the served post is yesterday, just after local midnight", () => {
    assert.equal(
      shouldShowOdbAfternoonHint("2026-09-04", localDate(2026, 9, 5, 0, 1)),
      true,
    );
  });

  it("hides when the served post is in the future", () => {
    assert.equal(
      shouldShowOdbAfternoonHint("2026-09-06", localDate(2026, 9, 5, 8, 0)),
      false,
    );
  });

  it("compares local calendar dates, not UTC ISO dates", () => {
    const justAfterMidnight = localDate(2026, 9, 5, 0, 15);
    assert.equal(shouldShowOdbAfternoonHint("2026-09-04", justAfterMidnight), true);
    assert.equal(shouldShowOdbAfternoonHint("2026-09-05", justAfterMidnight), false);
  });

  it("uses Melbourne's calendar date near UTC midnight", () => {
    // 2026-09-04 14:30 UTC = 2026-09-05 00:30 AEST
    const melbourneAfterMidnight = new Date("2026-09-04T14:30:00.000Z");
    assert.equal(
      shouldShowOdbAfternoonHint(
        "2026-09-04",
        melbourneAfterMidnight,
        "Australia/Melbourne",
      ),
      true,
    );
    assert.equal(
      shouldShowOdbAfternoonHint(
        "2026-09-05",
        melbourneAfterMidnight,
        "Australia/Melbourne",
      ),
      false,
    );
    assert.equal(
      shouldShowOdbAfternoonHint("2026-09-04", melbourneAfterMidnight, "UTC"),
      false,
    );
  });

  it("hides when the served date is missing or malformed", () => {
    const morning = localDate(2026, 9, 5, 8, 0);
    assert.equal(shouldShowOdbAfternoonHint(undefined, morning), false);
    assert.equal(shouldShowOdbAfternoonHint("", morning), false);
    assert.equal(shouldShowOdbAfternoonHint("not-a-date", morning), false);
  });
});
