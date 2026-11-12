import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { SCRIPTURE_FOR_TODAY_KJV } from "../data/scripture-for-today-kjv";

const LOCALE_CODES = readdirSync(new URL("../lib/i18n/locales", import.meta.url))
  .filter((name) => name.endsWith(".json"))
  .map((name) => name.replace(/\.json$/, ""));
import {
  joinVerseWords,
  scriptureQuestionIndex,
  selectLessonScripture,
  verseTranslationOrder,
} from "../lib/scripture-for-today";
import { SCRIPTURE_FOR_TODAY_REFERENCES } from "../lib/scripture-for-today-refs";
import { fallbackScripture } from "../lib/scripture-for-today-fallback";

const ADULT_SABBATH = `
<blockquote><p>Memory Text: “PLACEHOLDER VERSE WORDS” (1 Corinthians 10:11, NASB).</p></blockquote>
<p>Read for This Week's Study: <a class="verse">Jeremiah 4:3</a>, <a class="verse">Numbers 13:26–30</a>.</p>
`;

const ADULT_SUNDAY = `
<p>Read <a class="verse">Numbers 14:4–11</a>. What do you notice?</p>
<p>Read <a class="verse">Numbers 13:26–30</a>.</p>
`;

const ADULT_TUESDAY = `<p>Read 2 Chronicles 36:15, 16.</p>`;

const ADULT_FRIDAY = `<p>A closing thought with no Bible reference.</p>`;

const INVERSE_SABBATH = `<p>Read This Week's Passage: <a class="verse">Jeremiah 36:20–32</a></p>`;

const INVERSE_SUNDAY = `
<p><a class="verse">Jer. 6:8–19, 26</a></p>
<p><a class="verse">Jeremiah 32</a></p>
<p><a class="verse">Jer. 32:15</a></p>
`;

const INVERSE_INSIGHT = `<p>A paragraph of reflection with no reference.</p>`;

describe("selectLessonScripture", () => {
  it("uses the Adult Memory Text on Sabbath and ignores the lesson's own words", () => {
    const choice = selectLessonScripture({
      days: [{ dayNumber: 1, content: ADULT_SABBATH }],
      todayDayNumber: 1,
      track: "adult",
    });
    assert.ok(choice);
    assert.equal(choice.reference, "1 Corinthians 10:11");
    assert.deepEqual(choice.displayVerses, [11]);
    assert.deepEqual(choice.linkVerses, [11]);
    assert.equal(choice.fromLesson, true);
    assert.equal(JSON.stringify(choice).includes("PLACEHOLDER"), false);
  });

  it("uses the first Read line, skips the weekly study list, and clips a long range to three verses", () => {
    const choice = selectLessonScripture({
      days: [
        { dayNumber: 1, content: ADULT_SABBATH },
        { dayNumber: 2, content: ADULT_SUNDAY },
      ],
      todayDayNumber: 2,
      track: "adult",
    });
    assert.ok(choice);
    assert.equal(choice.reference, "Numbers 14:4–11");
    assert.deepEqual(choice.displayVerses, [4, 5, 6]);
    assert.deepEqual(choice.linkVerses, [4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("keeps a two-verse Read line whole", () => {
    const choice = selectLessonScripture({
      days: [
        { dayNumber: 1, content: ADULT_SABBATH },
        { dayNumber: 4, content: ADULT_TUESDAY },
      ],
      todayDayNumber: 4,
      track: "adult",
    });
    assert.ok(choice);
    assert.equal(choice.reference, "2 Chronicles 36:15–16");
    assert.deepEqual(choice.displayVerses, [15, 16]);
    assert.deepEqual(choice.linkVerses, [15, 16]);
  });

  it("keeps the week's Memory Text when the day has no Bible reference", () => {
    const choice = selectLessonScripture({
      days: [
        { dayNumber: 1, content: ADULT_SABBATH },
        { dayNumber: 7, content: ADULT_FRIDAY },
      ],
      todayDayNumber: 7,
      track: "adult",
    });
    assert.ok(choice);
    assert.equal(choice.reference, "1 Corinthians 10:11");
    assert.equal(choice.fromLesson, true);
    assert.equal(JSON.stringify(choice).includes("PLACEHOLDER"), false);
  });

  it("uses InVerse This Week's Passage and shows the first three verses of a long range", () => {
    const choice = selectLessonScripture({
      days: [{ dayNumber: 1, content: INVERSE_SABBATH }],
      todayDayNumber: 1,
      track: "inverse",
    });
    assert.ok(choice);
    assert.equal(choice.reference, "Jeremiah 36:20–32");
    assert.deepEqual(choice.displayVerses, [20, 21, 22]);
    assert.equal(choice.linkVerses[0], 20);
    assert.equal(choice.linkVerses[choice.linkVerses.length - 1], 32);
    assert.equal(choice.linkVerses.length, 13);
  });

  it("uses the first short range when an InVerse day has no Read line", () => {
    const choice = selectLessonScripture({
      days: [
        { dayNumber: 1, content: INVERSE_SABBATH },
        { dayNumber: 2, content: INVERSE_SUNDAY },
      ],
      todayDayNumber: 2,
      track: "inverse",
    });
    assert.ok(choice);
    assert.equal(choice.reference, "Jeremiah 32:15");
    assert.deepEqual(choice.displayVerses, [15]);
  });

  it("keeps the week's passage when InVerse inSight has no reference", () => {
    const choice = selectLessonScripture({
      days: [
        { dayNumber: 1, content: INVERSE_SABBATH },
        { dayNumber: 6, content: INVERSE_INSIGHT },
      ],
      todayDayNumber: 6,
      track: "inverse",
    });
    assert.ok(choice);
    assert.equal(choice.reference, "Jeremiah 36:20–32");
    assert.deepEqual(choice.displayVerses, [20, 21, 22]);
    assert.equal(choice.fromLesson, true);
  });

  it("returns null when the week has no usable reference", () => {
    const choice = selectLessonScripture({
      days: [
        { dayNumber: 1, content: "<p>No reference on Sabbath.</p>" },
        { dayNumber: 3, content: "<p>No reference today.</p>" },
      ],
      todayDayNumber: 3,
      track: "adult",
    });
    assert.equal(choice, null);
  });

  it("keeps a Read range of four verses whole", () => {
    const choice = selectLessonScripture({
      days: [
        { dayNumber: 1, content: ADULT_SABBATH },
        { dayNumber: 3, content: "<p>Read Exodus 3:7–10.</p>" },
      ],
      todayDayNumber: 3,
      track: "adult",
    });
    assert.ok(choice);
    assert.equal(choice.reference, "Exodus 3:7–10");
    assert.deepEqual(choice.displayVerses, [7, 8, 9, 10]);
  });
});

describe("scripture for today fallback", () => {
  it("has one public-domain verse for every day of a leap year", () => {
    assert.equal(SCRIPTURE_FOR_TODAY_REFERENCES.length, 366);
    assert.equal(SCRIPTURE_FOR_TODAY_KJV.length, 366);
    assert.equal(new Set(SCRIPTURE_FOR_TODAY_REFERENCES).size, 366);
    for (const row of SCRIPTURE_FOR_TODAY_KJV) {
      assert.equal(row.text.includes("<"), false);
      assert.ok(row.text.length > 8);
    }
  });

  it("uses the built-in verse without a lesson line", () => {
    const verse = fallbackScripture(1);
    assert.equal(verse.fromLesson, false);
    assert.equal(verse.reference, SCRIPTURE_FOR_TODAY_KJV[0].reference);
    assert.equal(verse.text, SCRIPTURE_FOR_TODAY_KJV[0].text);
    const leap = fallbackScripture(366);
    assert.equal(leap.reference, SCRIPTURE_FOR_TODAY_KJV[365].reference);
  });

  it("rotates the reflection question by day of year", () => {
    assert.equal(scriptureQuestionIndex(1), 0);
    assert.equal(scriptureQuestionIndex(30), 29);
    assert.equal(scriptureQuestionIndex(31), 0);
    assert.equal(scriptureQuestionIndex(366), scriptureQuestionIndex(6));
  });

  it("tries the chosen translation, then the language Bible, then KJV", () => {
    assert.deepEqual(verseTranslationOrder("NIV", "es"), ["NIV", "RV1909", "KJV"]);
    assert.deepEqual(verseTranslationOrder("KJV", "en"), ["KJV"]);
  });

  it("joins only the requested verses from our Bible rows", () => {
    const text = joinVerseWords(
      [
        { verse: 4, text: "Four." },
        { verse: 5, text: "Five." },
        { verse: 6, text: "Six." },
      ],
      [4, 5, 6],
    );
    assert.equal(text, "Four. Five. Six.");
    assert.equal(joinVerseWords([{ verse: 4, text: "Four." }], [4, 5]), null);
  });
});

describe("scripture for today copy", () => {
  it("is translated in every supported locale", () => {
    assert.equal(LOCALE_CODES.length, 22);
    for (const code of LOCALE_CODES) {
      const json = JSON.parse(
        readFileSync(new URL(`../lib/i18n/locales/${code}.json`, import.meta.url), "utf8"),
      ) as {
        scriptureForToday?: { label?: string; fromLesson?: string; discoverTitle?: string; questions?: string[] };
      };
      const copy = json.scriptureForToday;
      assert.ok(copy, code);
      assert.ok(copy.label && copy.label.length > 3, code);
      assert.ok((copy.fromLesson ?? "").length > 10, code);
      assert.equal(copy.questions?.length, 30, code);
      for (const question of copy.questions ?? []) {
        assert.equal(typeof question, "string");
        assert.ok(question.length > 4, `${code}: ${question}`);
      }
    }
    const english = JSON.parse(
      readFileSync(new URL("../lib/i18n/locales/en.json", import.meta.url), "utf8"),
    ) as { scriptureForToday: { questions: string[] } };
    assert.equal(english.scriptureForToday.questions[0], "What does this show you about God?");
    for (const code of LOCALE_CODES) {
      if (code === "en") continue;
      const json = JSON.parse(
        readFileSync(new URL(`../lib/i18n/locales/${code}.json`, import.meta.url), "utf8"),
      ) as { scriptureForToday: { label: string; questions: string[] } };
      assert.notEqual(json.scriptureForToday.label, "Scripture for today");
      assert.notEqual(json.scriptureForToday.questions[0], english.scriptureForToday.questions[0]);
    }
  });
});
