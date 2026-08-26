import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  assertReflectionReadingAlignment,
  formatGreeting,
  getHomeLocalDay,
  getTodaysReflection,
  parseBibleReference,
} from "../components/home-v2/home-data";

const originalTimeZone = process.env.TZ;

before(() => {
  process.env.TZ = "Australia/Melbourne";
});

after(() => {
  process.env.TZ = originalTimeZone;
});

describe("Home hero coherence", () => {
  it("uses the Melbourne-local morning across the UTC boundary", () => {
    const localDay = getHomeLocalDay(
      new Date("2026-08-25T23:58:00.000Z"),
    );

    assert.equal(localDay.dateKey, "2026-08-26");
    assert.equal(localDay.daypart, "morning");
    assert.equal(localDay.dayLabel, "Wednesday");
    assert.match(localDay.dateLine, /^Wednesday\b/);
    assert.equal(getTodaysReflection(localDay.dayIndex).reference.length > 0, true);
  });

  it("renders a clean greeting when a name is absent or placeholder punctuation", () => {
    assert.equal(formatGreeting("Good morning", null), "Good morning.");
    assert.equal(formatGreeting("Good morning", ""), "Good morning.");
    assert.equal(formatGreeting("Good morning", "..."), "Good morning.");
    assert.equal(formatGreeting("Good morning", "  Joe Example  "), "Good morning, Joe");
  });

  it("parses multi-word reflection references and fails loudly on CTA drift", () => {
    assert.deepEqual(parseBibleReference("2 Corinthians 3:18"), {
      bookName: "2 Corinthians",
      chapterNumber: 3,
    });
    assert.doesNotThrow(() =>
      assertReflectionReadingAlignment("Ephesians 2:8-9", {
        reference: "Ephesians 2:8-9",
        bookName: "Ephesians",
        chapterNumber: 2,
      }),
    );
    assert.throws(
      () =>
        assertReflectionReadingAlignment("Ephesians 2:8-9", {
          reference: "Ephesians 2:8-9",
          bookName: "John",
          chapterNumber: 3,
        }),
      /Home reflection\/reading mismatch/,
    );
  });
});