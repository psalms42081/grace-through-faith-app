import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { chaptersInEdition } from "../shared/partial-bible";
import { alignCompanionVerses } from "../lib/compare-alignment";
import {
  SARIC_ESTHER_NOTE,
  compareCompanionChapters,
  kjvVerseInSaric,
  projectCompareVerses,
  saricChapterList,
  saricReadingTarget,
  saricVerseInKjv,
} from "../shared/saric-versification";

describe("Šarić chapter lists", () => {
  it("shows Malachi 3, Joel 4, and Daniel 13–14, and leaves Psalms on the KJV list", () => {
    assert.deepEqual(chaptersInEdition("SARIC", "Malachi"), [1, 2, 3]);
    assert.deepEqual(saricChapterList("Joel"), [1, 2, 3, 4]);
    assert.equal(chaptersInEdition("SARIC", "Daniel")?.length, 14);
    assert.equal(chaptersInEdition("SARIC", "Daniel")?.includes(13), true);
    assert.equal(chaptersInEdition("SARIC", "Daniel")?.includes(14), true);
    assert.equal(chaptersInEdition("SARIC", "Psalms"), undefined);
    assert.equal(chaptersInEdition("SARIC", "Esther"), undefined);
  });
});

describe("Šarić versification map", () => {
  it("sends Malachi 4:2 to Malachi 3:20 and keeps a whole missing chapter off the empty page", () => {
    assert.deepEqual(kjvVerseInSaric("Malachi", 4, 2), { chapter: 3, verse: 20 });
    assert.deepEqual(kjvVerseInSaric("Malachi", 4, 1), { chapter: 3, verse: 19 });
    assert.deepEqual(kjvVerseInSaric("Malachi", 4, 6), { chapter: 3, verse: 24 });
    assert.deepEqual(saricReadingTarget("Malachi", 4, 2), { chapter: 3, verse: 20 });
    assert.deepEqual(saricReadingTarget("Malachi", 4, null), { chapter: 3, verse: 19 });
    assert.equal(saricReadingTarget("Malachi", 3, 20), null);
  });

  it("maps Joel 3 onto Joel 4, and Joel 2:28–32 onto Šarić's own Joel 3", () => {
    assert.deepEqual(kjvVerseInSaric("Joel", 3, 1), { chapter: 4, verse: 1 });
    assert.deepEqual(kjvVerseInSaric("Joel", 3, 21), { chapter: 4, verse: 21 });
    assert.deepEqual(kjvVerseInSaric("Joel", 2, 28), { chapter: 3, verse: 1 });
    assert.deepEqual(kjvVerseInSaric("Joel", 2, 32), { chapter: 3, verse: 5 });
    assert.deepEqual(saricVerseInKjv("Joel", 3, 1), { chapter: 2, verse: 28 });
    assert.deepEqual(saricVerseInKjv("Joel", 4, 1), { chapter: 3, verse: 1 });
    assert.equal(saricReadingTarget("Joel", 3, null), null);
    assert.equal(saricReadingTarget("Joel", 3, 1), null);
    assert.deepEqual(saricReadingTarget("Joel", 3, 10), { chapter: 4, verse: 10 });
    assert.deepEqual(saricReadingTarget("Joel", 2, 28), { chapter: 3, verse: 1 });
    assert.equal(saricReadingTarget("Psalms", 23, 1), null);
  });

  it("loads the Šarić chapter that holds a KJV chapter in Compare", () => {
    assert.deepEqual(compareCompanionChapters("Malachi", 4, "KJV", "SARIC"), [3]);
    assert.deepEqual(compareCompanionChapters("Joel", 3, "KJV", "SARIC"), [4]);
    assert.deepEqual(compareCompanionChapters("Joel", 2, "KJV", "SARIC"), [2, 3]);
    assert.deepEqual(compareCompanionChapters("Joel", 4, "SARIC", "KJV"), [3]);
    assert.deepEqual(compareCompanionChapters("Malachi", 3, "SARIC", "KJV"), [3, 4]);
    assert.deepEqual(compareCompanionChapters("Daniel", 13, "SARIC", "KJV"), []);
    assert.deepEqual(compareCompanionChapters("Psalms", 23, "KJV", "SARIC"), [23]);

    const besideMalachi4 = projectCompareVerses({
      book: "Malachi",
      readingTranslation: "KJV",
      companionTranslation: "SARIC",
      readingChapter: 4,
      verses: [
        { verse: 18, sourceChapter: 3, text: "earlier" },
        { verse: 20, sourceChapter: 3, text: "sun of righteousness" },
      ],
    });
    assert.deepEqual(besideMalachi4.map((verse) => [verse.verse, verse.alignVerse, verse.text]), [
      [20, 2, "sun of righteousness"],
    ]);
    const aligned = alignCompanionVerses([{ verse: 2 }], besideMalachi4);
    assert.deepEqual(aligned.get(2)?.map((verse) => verse.text), ["sun of righteousness"]);
  });
});

describe("Šarić Esther label", () => {
  it("names the Greek book in the picker and at the top of Esther", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    const seed = readFileSync(new URL("../scripts/seed-verses-prod.ts", import.meta.url), "utf8");
    assert.match(reader, /SaricEstherNote/);
    assert.match(reader, /saricReadingTarget/);
    assert.equal(SARIC_ESTHER_NOTE, "This edition's Esther is the Greek book.");
    assert.match(seed, /Sveta Biblija \(Šarić\) · includes Greek Esther/);
  });
});
