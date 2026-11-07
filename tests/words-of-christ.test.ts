import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  WORDS_OF_CHRIST_INK,
  WORDS_OF_CHRIST_SOURCE,
  wordsOfChristRanges,
} from "../lib/words-of-christ";

describe("words of Christ", () => {
  it("stores KJV word ranges and leaves narrative verses unmarked", () => {
    assert.deepEqual(wordsOfChristRanges(43, 3, 16), [{ start: 0, end: 24 }]);
    assert.deepEqual(wordsOfChristRanges(40, 3, 15), [{ start: 6, end: 20 }]);
    assert.deepEqual(wordsOfChristRanges(43, 3, 1), []);
    assert.equal(WORDS_OF_CHRIST_INK, "#C24431");
    assert.match(WORDS_OF_CHRIST_SOURCE, /public-domain King James/);
  });

  it("is a reader setting that applies only in the KJV", () => {
    const reader = readFileSync(
      path.join(process.cwd(), "app", "read", "[bookId]", "[chapter].tsx"),
      "utf8",
    );
    assert.match(reader, /Words of Christ in red/);
    assert.match(reader, /wordsOfChrist && isKjvTranslation\(translation\)/);
    assert.match(reader, /reader-words-of-christ-switch/);
  });
});
