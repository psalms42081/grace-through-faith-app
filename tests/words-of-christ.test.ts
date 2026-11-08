import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  RED_LETTERS_STORAGE_KEY,
  WORDS_OF_CHRIST_INK,
  WORDS_OF_CHRIST_SOURCE,
  redLettersFromStorage,
  wordsOfChristRanges,
} from "../lib/words-of-christ";

describe("words of Christ", () => {
  it("stores KJV word ranges and leaves narrative verses unmarked", () => {
    assert.deepEqual(wordsOfChristRanges(43, 3, 16), [{ start: 0, end: 24 }]);
    assert.deepEqual(wordsOfChristRanges(40, 3, 15), [{ start: 6, end: 20 }]);
    assert.deepEqual(wordsOfChristRanges(43, 3, 1), []);
    assert.equal(wordsOfChristRanges(40, 5, 1).length, 0);
    assert.deepEqual(wordsOfChristRanges(40, 5, 3), [{ start: 0, end: 12 }]);
    assert.deepEqual(wordsOfChristRanges(43, 14, 1), [{ start: 0, end: 13 }]);
    assert.deepEqual(wordsOfChristRanges(43, 14, 6), [{ start: 4, end: 21 }]);
    assert.equal(WORDS_OF_CHRIST_INK, "#C24431");
    assert.match(WORDS_OF_CHRIST_SOURCE, /public-domain King James/);
  });

  it("follows the Settings Red Letters switch and applies only in the KJV", () => {
    assert.equal(RED_LETTERS_STORAGE_KEY, "@gtf/setting-red-letters");
    assert.equal(redLettersFromStorage(null), true);
    assert.equal(redLettersFromStorage("false"), false);
    const reader = readFileSync(
      path.join(process.cwd(), "app", "read", "[bookId]", "[chapter].tsx"),
      "utf8",
    );
    const settings = readFileSync(path.join(process.cwd(), "app", "settings.tsx"), "utf8");
    const toggle = readFileSync(
      path.join(process.cwd(), "components", "settings", "PathBSwitch.tsx"),
      "utf8",
    );
    assert.match(reader, /wordsOfChrist && isKjvTranslation\(translation\)/);
    assert.match(reader, /RED_LETTERS_STORAGE_KEY/);
    assert.doesNotMatch(reader, /reader-words-of-christ-switch/);
    assert.doesNotMatch(reader, /Words of Christ in red/);
    assert.match(settings, /Red Letters/);
    assert.match(settings, /settings-red-letters/);
    assert.match(settings, /Profile → Notifications/);
    assert.doesNotMatch(settings, /Daily Reminder Time/);
    assert.match(toggle, /activeThumbColor: PATH_B_SWITCH_THUMB/);
  });
});
