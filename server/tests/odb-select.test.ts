import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  ODB_DEFAULT_TIME_ZONE,
  odbDateKeyFromTimeZone,
  pickPublishedForDate,
} from "../odb-select";
import { mapWpPost, rowToOdbJson } from "../odb-map";

const repoRoot = path.resolve(process.cwd());

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

describe("ODB WP mapping", () => {
  it("maps listing posts to body_text fields used by /api/odb/today", () => {
    const row = mapWpPost({
      id: 99,
      title: { rendered: "Christ in Me" },
      date: "2026-08-31T00:00:00",
      author_name: "ODB",
      verse: "<p>Galatians 2:20</p>",
      passage: "<a href=\"https://biblegateway.com/?search=Galatians+2%3A20\">Gal 2:20</a>",
      content: { rendered: "<p>Body &amp; hope</p>" },
      link: "https://odb.org/2026/08/31/christ-in-me",
    });
    assert.equal(row?.date, "2026-08-31");
    assert.equal(row?.bodyText, "Body & hope");
    assert.equal(row?.scriptureRef, "Galatians 2:20");
    const json = rowToOdbJson(row!);
    assert.equal(json.content, "Body & hope");
    assert.equal(json.verseRef, "Galatians 2:20");
    assert.equal(json.url, "https://odb.org/2026/08/31/christ-in-me");
  });
});

describe("ODB today timezone", () => {
  it("defaults to Australia/Melbourne when no timeZone is provided", () => {
    assert.equal(ODB_DEFAULT_TIME_ZONE, "Australia/Melbourne");
    const instant = new Date("2025-12-31T14:30:00.000Z");
    assert.equal(odbDateKeyFromTimeZone(undefined, instant), "2026-01-01");
    assert.equal(odbDateKeyFromTimeZone("", instant), "2026-01-01");
  });

  it("honors ?timeZone= when provided", () => {
    const instant = new Date("2025-12-31T14:30:00.000Z");
    assert.equal(odbDateKeyFromTimeZone("UTC", instant), "2025-12-31");
    assert.equal(odbDateKeyFromTimeZone("America/New_York", instant), "2025-12-31");
  });
});

describe("migration 0011 odb_posts", () => {
  it("is the numbered 0011 file with a date primary key", () => {
    const migrationsDir = path.join(repoRoot, "migrations");
    const files0011 = readdirSync(migrationsDir).filter((f) => f.startsWith("0011_"));
    assert.deepEqual(files0011, ["0011_odb_posts.sql"]);
    assert.equal(existsSync(path.join(migrationsDir, "0011_odb_posts.sql")), true);
    const sql = readFileSync(path.join(migrationsDir, "0011_odb_posts.sql"), "utf8");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS "public"\."odb_posts"/);
    assert.match(sql, /"date" date PRIMARY KEY/);
    assert.doesNotMatch(sql, /timestamptz PRIMARY KEY/);
    assert.match(sql, /body_text/);
    assert.match(sql, /scripture_ref/);
    assert.match(sql, /reading_ref/);
    assert.match(sql, /source_url/);
    assert.match(sql, /fetched_at" timestamptz/);
  });
});
