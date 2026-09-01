import test from "node:test";
import assert from "node:assert/strict";
import { REGENERATED_HEADING_CHAPTERS, KJV_PSALM_119_LETTERS } from "../scripts/kjv-heading-regenerations";
import { headingStem, jaccard, reviewChapter } from "../scripts/kjv-heading-sequence";
import type { ChapterHeadings } from "../scripts/generate-kjv-headings";

test("headingStem strips colon subtitles and articles", () => {
  assert.equal(headingStem("Salt and Light: The Influence of Believers"), "salt and light");
  assert.equal(headingStem("The Fulfillment of the Law"), "fulfillment of law");
});

test("jaccard is 1 for identical stems and low for unrelated titles", () => {
  assert.equal(jaccard("lamb and 144000", "lamb and 144000"), 1);
  assert.ok(jaccard("new song before throne", "lamb and 144000") < 0.3);
});

test("reviewer flags an invented chapter whose full sequence matches a catalog set", () => {
  const chapter: ChapterHeadings = {
    book: "TestBook", chapter: 1,
    sections: [
      { heading: "Alpha Gate", startVerse: 1, endVerse: 2, paragraphs: [{ startVerse: 1, endVerse: 2 }] },
      { heading: "Beta Path", startVerse: 3, endVerse: 4, paragraphs: [{ startVerse: 3, endVerse: 4 }] },
      { heading: "Gamma Crown", startVerse: 5, endVerse: 5, paragraphs: [{ startVerse: 5, endVerse: 5 }] },
    ],
  };
  const flags = reviewChapter(chapter, [{
    edition: "MockEdition", book: "TestBook", chapter: 1,
    headings: ["The Alpha Gate", "Beta Path", "A Gamma Crown"],
  }]);
  assert.equal(flags.length, 1);
  assert.match(flags[0]!.reason, /full heading sequence matches/);
});

test("reviewer allows a single common-property title plus independent remaining headings", () => {
  const chapter: ChapterHeadings = {
    book: "Revelation", chapter: 12,
    sections: [
      { heading: "The Woman and the Dragon", startVerse: 1, endVerse: 4, paragraphs: [{ startVerse: 1, endVerse: 4 }] },
      { heading: "War in Heaven and the Dragon's Defeat", startVerse: 5, endVerse: 9, paragraphs: [{ startVerse: 5, endVerse: 9 }] },
      { heading: "The Accuser Cast Down", startVerse: 10, endVerse: 17, paragraphs: [{ startVerse: 10, endVerse: 17 }] },
    ],
  };
  const flags = reviewChapter(chapter);
  assert.deepEqual(flags, []);
});

test("regenerated chapters cover contiguous verse ranges from 1", () => {
  const lastVerse: Record<string, number> = {
    "Matthew 5": 48, "Matthew 6": 34, "Matthew 7": 29,
    "Luke 6": 49, "John 14": 31, "Revelation 14": 20, "Psalms 119": 176,
  };
  for (const chapter of REGENERATED_HEADING_CHAPTERS) {
    let previous = 0;
    for (const section of chapter.sections) {
      assert.equal(section.startVerse, previous + 1, `${chapter.book} ${chapter.chapter} gap before ${section.heading}`);
      previous = section.endVerse;
    }
    assert.equal(previous, lastVerse[`${chapter.book} ${chapter.chapter}`]);
  }
});

test("regenerated titles are plain descriptive English, not the prior essay set", () => {
  const titles = (book: string, chapter: number) =>
    REGENERATED_HEADING_CHAPTERS.find((entry) => entry.book === book && entry.chapter === chapter)!
      .sections.map((section) => section.heading);

  assert.deepEqual(titles("Matthew", 5), [
    "The Beatitudes",
    "A City Set on a Hill",
    "He Came to Fulfil the Law",
    "The Heart, the Hand, and the Word",
    "Do Good to Them That Hate You",
  ]);
  assert.equal(titles("Revelation", 14)[1], "The Three Angels' Messages");
  assert.deepEqual(
    REGENERATED_HEADING_CHAPTERS.find((entry) => entry.book === "Revelation" && entry.chapter === 14)!
      .sections.find((section) => section.heading === "The Three Angels' Messages"),
    { heading: "The Three Angels' Messages", startVerse: 6, endVerse: 12, paragraphs: [{ startVerse: 6, endVerse: 12 }] },
  );
  for (const heading of titles("Matthew", 5).concat(titles("Matthew", 6), titles("Matthew", 7), titles("Luke", 6), titles("John", 14))) {
    assert.equal(/How His Followers|Deeper Than the Scribes|Covenant Faithfulness|Mid-Heaven Proclamations|Plain-side Blessings/.test(heading), false);
  }
});

test("Psalm 119 has 22 distinct KJV letter-prefixed titles", () => {
  const psalm = REGENERATED_HEADING_CHAPTERS.find((entry) => entry.book === "Psalms" && entry.chapter === 119)!;
  assert.equal(psalm.sections.length, 22);
  assert.equal(KJV_PSALM_119_LETTERS.length, 22);
  const titles = psalm.sections.map((section) => section.heading);
  assert.equal(new Set(titles).size, 22);
  for (const [index, letter] of KJV_PSALM_119_LETTERS.entries()) {
    assert.equal(titles[index]!.startsWith(`${letter} — `), true, titles[index]);
  }
});
