import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  lexiconShortMeaning,
  wordStudyEnglishPhrase,
  wordStudyPlainSentence,
} from "../lib/word-study-copy";

const GEN_3_22 =
  "And the LORD God said, Behold, the man is become as one of us, to know good and evil: and now, lest he put forth his hand, and take also of the tree of life, and eat, and live for ever:";
const PSA_23_2 =
  "He maketh me to lie down in green pastures: he leadeth me beside the still waters.";

describe("wordStudyEnglishPhrase", () => {
  it("expands a clicked ever onto the KJV for ever span", () => {
    assert.equal(
      wordStudyEnglishPhrase({
        surface: "ever",
        verseText: GEN_3_22,
        translatedWord: "ever",
      }).toLowerCase(),
      "for ever",
    );
    assert.equal(
      wordStudyEnglishPhrase({
        surface: "ever",
        verseText: GEN_3_22,
        translatedWord: "for ever",
      }).toLowerCase(),
      "for ever",
    );
  });

  it("keeps lie down for the Psalm 23:2 host gloss", () => {
    const phrase = wordStudyEnglishPhrase({
      surface: "lie",
      verseText: PSA_23_2,
      translatedWord: "he makes lie down",
    }).toLowerCase();
    assert.match(phrase, /lie down/);
  });
});

describe("wordStudyPlainSentence", () => {
  it("names the verse, original, transliteration, and English gloss", () => {
    assert.equal(
      wordStudyPlainSentence({
        bookName: "Genesis",
        chapter: 3,
        verse: 22,
        language: "he",
        lemma: "עוֹלָם",
        transliteration: "ʿôlām",
        surface: "for ever",
      }),
      "In Genesis 3:22, the Hebrew עוֹלָם (ʿôlām) is translated 'for ever'.",
    );
  });
});

describe("lexiconShortMeaning", () => {
  it("uses the short gloss, not the 1890 article", () => {
    assert.equal(
      lexiconShortMeaning("eternity, everlasting, forever"),
      "It means eternity, everlasting, forever.",
    );
    const long =
      "from H5956; properly, concealed, i.e. the vanishing point; generally, time out of mind (past or future), i.e. (practically) eternity";
    const short = lexiconShortMeaning(long, "alway, ancient, eternal, ever, everlasting, evermore");
    assert.equal(short, "It means alway, ancient, eternal.");
    assert.doesNotMatch(short, /concealed/);
    assert.doesNotMatch(short, /from H5956/i);
  });
});

describe("plain-first word sheet", () => {
  it("collapses scholarly detail behind Show more and keeps the uses link", () => {
    const sheet = readFileSync(new URL("../components/reader/WordStudySheet.tsx", import.meta.url), "utf8");
    assert.match(sheet, /reader-word-study-plain/);
    assert.match(sheet, /Show more/);
    assert.match(sheet, /reader-word-study-morph/);
    assert.match(sheet, /reader-word-study-uses/);
    assert.match(sheet, /expandStepMorph/);
    assert.match(sheet, /wordStudyPlainSentence/);
    assert.match(sheet, /wordStudyEnglishPhrase/);
  });
});
