import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickPublishedForDate } from "../odb-select";

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
});
