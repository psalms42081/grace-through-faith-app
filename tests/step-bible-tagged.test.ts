import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanEnglishGloss,
  extractRootStrongIds,
  extractTagntStrongId,
  isStepAffixStrongId,
  kjvVerseKeysFromNestedJson,
  normalizeStrongId,
  parseStepRef,
  parseTagntLine,
  parseTahotLine,
  reportKjvCoverage,
  resolveLexiconStrongId,
  shouldIncludeTagntWordType,
  shouldIncludeTahotTextType,
  surfaceOriginalWord,
  verseKey,
} from "../lib/step-bible-tagged";
import { shouldGenerateAiStrongMap } from "../lib/strong-map-policy";

describe("normalizeStrongId", () => {
  it("strips leading zeros and disambiguation letters", () => {
    assert.equal(normalizeStrongId("G00026"), "G26");
    assert.equal(normalizeStrongId("G0976"), "G976");
    assert.equal(normalizeStrongId("H0430G"), "H430");
    assert.equal(normalizeStrongId("H1254A"), "H1254");
    assert.equal(normalizeStrongId("H7225G"), "H7225");
    assert.equal(normalizeStrongId("G26"), "G26");
  });

  it("rejects junk", () => {
    assert.equal(normalizeStrongId(""), null);
    assert.equal(normalizeStrongId("not-a-strong"), null);
  });
});

describe("resolveLexiconStrongId", () => {
  it("prefers the unpadded lexicon id, then a padded one", () => {
    assert.equal(resolveLexiconStrongId("G26", new Set(["G26", "G00026"])), "G26");
    assert.equal(resolveLexiconStrongId("G5624", new Set(["G05624"])), "G05624");
    assert.equal(resolveLexiconStrongId("H430", new Set(["H430"])), "H430");
  });
});

describe("affixes", () => {
  it("treats H9000–H9099 as STEP affixes", () => {
    assert.equal(isStepAffixStrongId("H9003"), true);
    assert.equal(isStepAffixStrongId("H9016"), true);
    assert.equal(isStepAffixStrongId("H7225"), false);
    assert.equal(isStepAffixStrongId("G976"), false);
  });
});

describe("parseStepRef", () => {
  it("parses TAHOT English refs and token indexes", () => {
    const ref = parseStepRef("Gen.1.1#01=L");
    assert.deepEqual(ref, {
      bookAbbr: "Gen",
      bookName: "Genesis",
      chapter: 1,
      verse: 1,
      tokenIndex: 1,
      textType: "L",
    });
  });

  it("uses the English verse when a Hebrew ref is in parentheses", () => {
    const ref = parseStepRef("Psa.13.1(Heb.13.2)#01=L");
    assert.equal(ref?.bookName, "Psalms");
    assert.equal(ref?.chapter, 13);
    assert.equal(ref?.verse, 1);
  });

  it("prefers a KJV bracket when present", () => {
    const ref = parseStepRef("Mat.17.14[17.15]#01=NKO");
    assert.equal(ref?.chapter, 17);
    assert.equal(ref?.verse, 15);
  });

  it("drops verse 0 (psalm titles)", () => {
    assert.equal(parseStepRef("Psa.3.0#01=L"), null);
  });

  it("keeps the English verse when a curly alternate ref is present", () => {
    const rom = parseStepRef("Rom.16.25{14.24}#01=NKO");
    assert.equal(rom?.bookName, "Romans");
    assert.equal(rom?.chapter, 16);
    assert.equal(rom?.verse, 25);
    const jhn = parseStepRef("Jhn.7.53{8.1}#01=KO");
    assert.equal(jhn?.bookName, "John");
    assert.equal(jhn?.verse, 53);
  });
});

describe("text-type filters", () => {
  it("keeps TAHOT L/Q/R and drops K/X", () => {
    assert.equal(shouldIncludeTahotTextType("L"), true);
    assert.equal(shouldIncludeTahotTextType("Q(K+B)"), true);
    assert.equal(shouldIncludeTahotTextType("R"), true);
    assert.equal(shouldIncludeTahotTextType("K"), false);
    assert.equal(shouldIncludeTahotTextType("X"), false);
  });

  it("keeps TAGNT words that appear in the KJV/TR", () => {
    assert.equal(shouldIncludeTagntWordType("NKO"), true);
    assert.equal(shouldIncludeTagntWordType("KO"), true);
    assert.equal(shouldIncludeTagntWordType("K"), true);
    assert.equal(shouldIncludeTagntWordType("N"), false);
    assert.equal(shouldIncludeTagntWordType("NO"), false);
    assert.equal(shouldIncludeTagntWordType("O"), false);
  });
});

describe("TAHOT / TAGNT line parse", () => {
  it("maps Genesis 1:1 beginning to H7225 and skips the prefix", () => {
    const line =
      "Gen.1.1#01=L\tבְּ/רֵאשִׁ֖ית\tbe./re.Shit\tin/ beginning\tH9003/{H7225G}\tHR/Ncfsa\t\t\tH7225G";
    const tokens = parseTahotLine(line);
    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].strongId, "H7225");
    assert.equal(tokens[0].translatedWord, "beginning");
    assert.equal(tokens[0].bookName, "Genesis");
    assert.equal(tokens[0].tokenIndex, 1);
    assert.deepEqual(extractRootStrongIds("H9003/{H7225G}"), ["H7225"]);
  });

  it("skips the object marker H853", () => {
    const line = "Gen.1.1#04=L\tאֵ֥ת\t'et\t<obj.>\t{H0853}\tHTo\t\t\tH0853_A";
    assert.deepEqual(parseTahotLine(line), []);
  });

  it("parses a TAGNT TR word", () => {
    const line =
      "Mat.1.1#01=NKO\tΒίβλος (Biblos)\t[The] book\tG0976=N-NSF\tβίβλος=book";
    const tokens = parseTagntLine(line);
    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].strongId, "G976");
    assert.equal(tokens[0].translatedWord, "The book");
    assert.equal(tokens[0].originalWord, "Βίβλος");
    assert.equal(tokens[0].language, "gr");
    assert.equal(extractTagntStrongId("G2424G=N-GSM-P"), "G2424");
  });

  it("drops TAGNT words that are not in the KJV/TR", () => {
    const line = "Mat.1.1#01=N\tλόγος (logos)\tword\tG3056=N-NSM\tλόγος=word";
    assert.deepEqual(parseTagntLine(line), []);
  });
});

describe("gloss helpers", () => {
  it("takes the root English segment", () => {
    assert.equal(cleanEnglishGloss("in/ beginning"), "beginning");
    assert.equal(cleanEnglishGloss("the/ heavens"), "heavens");
    assert.equal(cleanEnglishGloss("[The] book"), "The book");
  });

  it("keeps the verbal gloss when a pronoun suffix is on the slash", () => {
    assert.equal(cleanEnglishGloss("he makes lie down/ me"), "he makes lie down");
    assert.equal(cleanEnglishGloss("[is] shepherd/ my"), "shepherd");
    assert.equal(cleanEnglishGloss("he leads/ me"), "he leads");
  });

  it("takes the Hebrew root after prefixes", () => {
    assert.equal(surfaceOriginalWord("בְּ/רֵאשִׁ֖ית", "he"), "רֵאשִׁ֖ית");
  });
});

describe("coverage", () => {
  it("reports missing KJV verses", () => {
    const kjv = kjvVerseKeysFromNestedJson([
      {
        book: "Genesis",
        chapters: [
          {
            chapter: "1",
            verses: [
              { verse: "1", text: "a" },
              { verse: "2", text: "b" },
            ],
          },
        ],
      },
    ]);
    const tagged = new Set([verseKey("Genesis", 1, 1)]);
    const report = reportKjvCoverage(kjv, tagged);
    assert.equal(report.kjvVerseCount, 2);
    assert.equal(report.taggedVerseCount, 1);
    assert.equal(report.missingVerseCount, 1);
    assert.equal(report.missingByBook[0].bookName, "Genesis");
    assert.deepEqual(report.missingByBook[0].ranges, ["1:2"]);
  });
});

describe("AI fallback policy", () => {
  it("is only for non-KJV translations", () => {
    assert.equal(shouldGenerateAiStrongMap("KJV"), false);
    assert.equal(shouldGenerateAiStrongMap("kjv"), false);
    assert.equal(shouldGenerateAiStrongMap("NIV"), true);
    assert.equal(shouldGenerateAiStrongMap("ASV"), true);
  });
});
