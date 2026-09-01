/**
 * Independent re-outlines for chapters whose heading sequences looked lifted.
 * Wording and breaks are original; they must not match a published edition set.
 */
import type { ChapterHeadings, Section } from "./generate-kjv-headings";

function section(heading: string, startVerse: number, endVerse: number): Section {
  return { heading, startVerse, endVerse, paragraphs: [{ startVerse, endVerse }] };
}

export const REGENERATION_REASONS: Record<string, string> = {
  "Matthew 5": "Sermon outline tracked the NIV/ESV package (Beatitudes, Salt and Light, Fulfillment of the Law, then the antitheses in that order).",
  "Matthew 6": "Colon-stems matched NIV's Giving / Prayer / Fasting / Treasures in Heaven run, with Do Not Worry still in the set.",
  "Matthew 7": "Ordered NIV sermon titles (Judging Others, Ask Seek Knock, Narrow Gate, False Prophets, Wise and Foolish Builders) with only extra splits.",
  "Luke 6": "Four consecutive NIV sermon titles: Love for Enemies, Judging Others, A Tree and Its Fruit, The Wise and Foolish Builders.",
  "John 14": "Opened with NIV's exact 'Jesus Comforts His Disciples' and followed that farewell-discourse set.",
  "Revelation 14": "Three-part set aligned with NIV/ESV (The Lamb and the 144,000 / Three Angels / Harvest of the Earth).",
};

export const REGENERATED_HEADING_CHAPTERS: ChapterHeadings[] = [
  {
    book: "Matthew", chapter: 5,
    sections: [
      section("Who Belongs in the Kingdom He Describes", 1, 12),
      section("How His Followers Season and Light the World", 13, 16),
      section("A Righteousness Deeper Than the Scribes'", 17, 26),
      section("Purity, Covenant Faithfulness, and Honest Speech", 27, 37),
      section("Refusing Revenge, Loving the Hostile", 38, 48),
    ],
  },
  {
    book: "Matthew", chapter: 6,
    sections: [
      section("Alms, Prayer, and Fasting Done in Secret", 1, 18),
      section("Treasure, the Single Eye, and One Master", 19, 24),
      section("Why the Anxious Heart Need Not Fear", 25, 34),
    ],
  },
  {
    book: "Matthew", chapter: 7,
    sections: [
      section("The Beam in Your Own Eye", 1, 6),
      section("Ask the Father; Do as You Would Be Done By", 7, 12),
      section("Two Ways, Two Trees, Two Houses", 13, 27),
      section("A Teacher Unlike Their Scribes", 28, 29),
    ],
  },
  {
    book: "Luke", chapter: 6,
    sections: [
      section("Grainfields and a Withered Hand", 1, 11),
      section("A Night of Prayer, Then Twelve Names", 12, 16),
      section("Plain-side Blessings, Woes, and Costly Love", 17, 36),
      section("Measure, Fruit, and a House that Stands", 37, 49),
    ],
  },
  {
    book: "John", chapter: 14,
    sections: [
      section("Many Rooms and a Coming Again", 1, 4),
      section("Knowing the Father Through the Son", 5, 14),
      section("Another Comforter Promised", 15, 26),
      section("Peace Left With Them", 27, 31),
    ],
  },
  {
    book: "Revelation", chapter: 14,
    sections: [
      section("A New Song Before the Throne", 1, 5),
      section("Mid-Heaven Proclamations of Gospel and Fall", 6, 8),
      section("The Mark Refused, the Saints' Patience", 9, 13),
      section("The Earth's Two Reapings", 14, 20),
    ],
  },
];
