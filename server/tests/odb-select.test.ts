import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOdbTodayCacheFresh, pickPublishedForDate } from "../odb-select";

describe("ODB published-day selection", () => {
  const posts = [
    { id: 3, date: "2026-09-02", title: "future" },
    { id: 2, date: "2026-08-31", title: "Christ in Me" },
    { id: 1, date: "2026-08-30", title: "older" },
  ];

  it("returns the exact date when it has been published", () => {
    const picked = pickPublishedForDate(
      [...posts, { id: 4, date: "2026-09-01", title: "today" }],
      "2026-09-01",
    );
    assert.equal(picked?.exact, true);
    assert.equal(picked?.post.title, "today");
  });

  it("falls back to the most recent published day instead of erroring", () => {
    const picked = pickPublishedForDate(posts, "2026-09-01");
    assert.equal(picked?.exact, false);
    assert.equal(picked?.post.date, "2026-08-31");
    assert.equal(picked?.post.title, "Christ in Me");
  });

  it("does not serve a future calendar date", () => {
    const picked = pickPublishedForDate(posts, "2026-08-30");
    assert.equal(picked?.post.date, "2026-08-30");
    assert.equal(picked?.exact, true);
  });

  it("returns null when nothing has been published yet", () => {
    assert.equal(pickPublishedForDate([{ date: "2026-09-02" }], "2026-09-01"), null);
    assert.equal(pickPublishedForDate([], "2026-09-01"), null);
  });

  it("rechecks today's date every 15 minutes even after an Aug 31 match", () => {
    const now = Date.parse("2026-09-02T00:00:00+10:00");
    const exactAug31 = {
      todayDateKey: "2026-08-31",
      today: { date: "2026-08-31" },
      ts: now - 60 * 1000,
    };
    assert.equal(isOdbTodayCacheFresh(exactAug31, "2026-09-02", now), false);

    const fallbackForSep2 = {
      todayDateKey: "2026-09-02",
      today: { date: "2026-08-31" },
      ts: now - 16 * 60 * 1000,
    };
    assert.equal(isOdbTodayCacheFresh(fallbackForSep2, "2026-09-02", now), false);

    const recentCheck = {
      todayDateKey: "2026-09-02",
      today: { date: "2026-09-02" },
      ts: now - 5 * 60 * 1000,
    };
    assert.equal(isOdbTodayCacheFresh(recentCheck, "2026-09-02", now), true);

    const exactButStale = {
      todayDateKey: "2026-09-02",
      today: { date: "2026-09-02" },
      ts: now - 24 * 60 * 60 * 1000,
    };
    assert.equal(isOdbTodayCacheFresh(exactButStale, "2026-09-02", now), false);
  });
});
