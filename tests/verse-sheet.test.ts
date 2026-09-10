import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { scriptureCiteNeedles, textCitesNeedles } from "../lib/scripture-cite";
import {
  firstThreeLines,
  formatSheetReference,
  isAiGeneratedSource,
} from "../lib/verse-sheet";
import { wordStudyChipsForVerse } from "../lib/reader-word-study";

describe("formatSheetReference", () => {
  it("formats a single verse and a hyphenated range", () => {
    assert.equal(formatSheetReference("Psalms", 23, [1]), "Psalms 23:1");
    assert.equal(formatSheetReference("Psalms", "23", [1, 2, 3]), "Psalms 23:1-3");
    assert.equal(formatSheetReference("Psalms", 23, [1, 3]), "Psalms 23:1, 3");
  });
});

describe("firstThreeLines", () => {
  it("keeps short text and flags overflow", () => {
    assert.deepEqual(firstThreeLines("One.\nTwo.\nThree."), {
      preview: "One.\nTwo.\nThree.",
      hasMore: false,
    });
    assert.equal(firstThreeLines("One.\nTwo.\nThree.\nFour.").hasMore, true);
    assert.equal(firstThreeLines("One. Two. Three. Four.").hasMore, true);
  });
});

describe("scriptureCiteNeedles", () => {
  it("covers Psalm / Ps variants for Psalm 23:1", () => {
    const needles = scriptureCiteNeedles({
      bookName: "Psalms",
      abbreviation: "Psa",
      chapter: 23,
      verse: 1,
    });
    assert.ok(needles.includes("Psalms 23:1"));
    assert.ok(needles.includes("Psalm 23:1"));
    assert.ok(needles.includes("Ps. 23:1"));
    assert.equal(textCitesNeedles("See Ps. 23:1 for the shepherd.", needles), true);
    assert.equal(textCitesNeedles("No citation here.", needles), false);
  });
});

describe("isAiGeneratedSource", () => {
  it("labels missing or ai sources", () => {
    assert.equal(isAiGeneratedSource(undefined), true);
    assert.equal(isAiGeneratedSource("ai"), true);
    assert.equal(isAiGeneratedSource("KJV"), false);
  });
});

describe("wordStudyChipsForVerse", () => {
  it("emits English → unpadded Strong chips for aligned words", () => {
    const chips = wordStudyChipsForVerse("He maketh me to lie down in green pastures.", [
      {
        map: { strongId: "H07257", wordPosition: 1, originalWord: "", translatedWord: "pastures" },
        entry: { id: "H7257", language: "he", lemma: "", transliteration: null, pronunciation: null, definition: "", kjvUsage: null },
      },
    ]);
    assert.ok(chips.some((chip) => chip.surface.toLowerCase().includes("pasture") && chip.strongId === "H7257"));
  });
});

describe("verse sheet wiring", () => {
  it("registers the verse-sheet route and EGW local chapter", () => {
    const routes = readFileSync(new URL("../server/routes.ts", import.meta.url), "utf8");
    const egw = readFileSync(new URL("../server/routes/egw.ts", import.meta.url), "utf8");
    const sheet = readFileSync(new URL("../server/routes/verse-sheet.ts", import.meta.url), "utf8");
    const colors = readFileSync(new URL("../lib/verse-sheet.ts", import.meta.url), "utf8");
    assert.match(routes, /verseSheetRoutes/);
    assert.match(egw, /\/local-chapter\/:id/);
    assert.match(sheet, /Classic|matthew-henry/);
    assert.match(sheet, /ellenWhite/);
    assert.match(sheet, /sabbathSchool/);
    assert.match(colors, /key: "rose"/);
  });
});
