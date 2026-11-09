import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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
    assert.match(settings, /renderRow\("notifications-outline", "Notifications"/);
    assert.match(settings, /router\.push\("\/\(tabs\)\/profile"/);
    assert.doesNotMatch(settings, /Profile → Notifications/);
    assert.doesNotMatch(settings, /Streak Notifications/);
    assert.doesNotMatch(settings, /Daily Reminder Time/);
    assert.match(toggle, /activeThumbColor: PATH_B_SWITCH_THUMB/);
    const spans = readFileSync(
      path.join(process.cwd(), "components", "reader", "VerseWordSpans.tsx"),
      "utf8",
    );
    assert.match(spans, /VerseTextRuns[\s\S]*style=\{spoken \? \{ color: WORDS_OF_CHRIST_INK \} : undefined\}/);
  });

  it("inks the words of Christ in split and verse-per-line reading", () => {
    const reader = readFileSync(
      path.join(process.cwd(), "app", "read", "[bookId]", "[chapter].tsx"),
      "utf8",
    );
    assert.doesNotMatch(reader, /<VerseTextRuns text=\{v\.text\} \/>/);
    assert.match(
      reader,
      /spokenRanges=\{spokenRangesForLine\(\{[\s\S]*?readingTranslation: translation,[\s\S]*?lineTranslation: translation,/,
    );
    assert.match(
      reader,
      /spokenRanges=\{spokenRangesForLine\(\{[\s\S]*?readingTranslation: translation,[\s\S]*?lineTranslation: splitTranslation,/,
    );
    assert.match(reader, /Red letters available in KJV/);
    const spoken = readFileSync(
      path.join(process.cwd(), "components", "reader", "VerseSpokenText.tsx"),
      "utf8",
    );
    assert.match(spoken, /SPOKEN_STYLE = \{ color: WORDS_OF_CHRIST_INK \}/);
  });

  it("serves a build-stamped service worker so returning browsers update", () => {
    const server = readFileSync(path.join(process.cwd(), "server", "index.ts"), "utf8");
    assert.doesNotMatch(server, /copyFileSync\(publicSwPath, distSwPath\)/);
    assert.match(server, /replaceAll\("__SW_BUILD_ID__", buildId\)/);
    const sw = readFileSync(path.join(process.cwd(), "dist", "sw.js"), "utf8");
    assert.doesNotMatch(sw, /__SW_BUILD_ID__/);
    assert.match(sw, /const BUILD_ID = "[a-f0-9]{12}";/);
  });

  it("ships the KJV words-of-Christ table in the web export", () => {
    const dir = path.join(process.cwd(), "dist", "_expo", "static", "js", "web");
    const files = readdirSync(dir).filter((name) => name.endsWith(".js"));
    assert.ok(files.length > 0, "web export has no JS bundle");
    const bundle = files.map((name) => readFileSync(path.join(dir, name), "utf8")).join("\n");
    assert.match(bundle, /"40\.5\.3":\s*\[\s*\[\s*0\s*,\s*12\s*\]\s*\]/);
  });
});
