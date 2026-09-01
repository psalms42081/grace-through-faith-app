/**
 * Independent re-outlines for chapters whose heading sequences looked lifted,
 * plus Psalm 119 letter-prefixed stanza titles (KJV printing).
 * Wording and breaks are original; they must not match a published edition set.
 */
import type { ChapterHeadings, Section } from "./generate-kjv-headings";

function section(heading: string, startVerse: number, endVerse: number): Section {
  return { heading, startVerse, endVerse, paragraphs: [{ startVerse, endVerse }] };
}

/** Traditional KJV Psalm 119 acrostic letters, including Samech (often omitted in short lists). */
export const KJV_PSALM_119_LETTERS = [
  "Aleph", "Beth", "Gimel", "Daleth", "He", "Vau", "Zain", "Cheth", "Teth", "Jod",
  "Caph", "Lamed", "Mem", "Nun", "Samech", "Ain", "Pe", "Tzaddi", "Koph", "Resh",
  "Schin", "Tau",
] as const;

export const REGENERATION_REASONS: Record<string, string> = {
  "Matthew 5": "Sermon outline tracked the NIV/ESV package (Beatitudes, Salt and Light, Fulfillment of the Law, then the antitheses in that order).",
  "Matthew 6": "Colon-stems matched NIV's Giving / Prayer / Fasting / Treasures in Heaven run, with Do Not Worry still in the set.",
  "Matthew 7": "Ordered NIV sermon titles (Judging Others, Ask Seek Knock, Narrow Gate, False Prophets, Wise and Foolish Builders) with only extra splits.",
  "Luke 6": "Four consecutive NIV sermon titles: Love for Enemies, Judging Others, A Tree and Its Fruit, The Wise and Foolish Builders.",
  "John 14": "Opened with NIV's exact 'Jesus Comforts His Disciples' and followed that farewell-discourse set.",
  "Revelation 14": "Three-part set aligned with NIV/ESV (The Lamb and the 144,000 / Three Angels / Harvest of the Earth).",
  "Psalms 119": "Stanza titles were essay-like and repeated; KJV prints the Hebrew letter over each eight-verse stanza.",
};

export const REGENERATED_HEADING_CHAPTERS: ChapterHeadings[] = [
  {
    book: "Matthew", chapter: 5,
    sections: [
      section("The Beatitudes", 1, 12),
      section("A City Set on a Hill", 13, 16),
      section("He Came to Fulfil the Law", 17, 26),
      section("The Heart, the Hand, and the Word", 27, 37),
      section("Do Good to Them That Hate You", 38, 48),
    ],
  },
  {
    book: "Matthew", chapter: 6,
    sections: [
      section("Your Father Who Sees in Secret", 1, 18),
      section("One Treasure and One Master", 19, 24),
      section("Take No Thought for Tomorrow", 25, 34),
    ],
  },
  {
    book: "Matthew", chapter: 7,
    sections: [
      section("The Mote and the Beam", 1, 6),
      section("A Father's Gifts and the Golden Rule", 7, 12),
      section("The Narrow Gate and a House on Rock", 13, 27),
      section("The People Were Astonished", 28, 29),
    ],
  },
  {
    book: "Luke", chapter: 6,
    sections: [
      section("Sabbath in the Fields and the Synagogue", 1, 11),
      section("He Chooses the Twelve", 12, 16),
      section("Blessings and Woes on the Plain", 17, 36),
      section("A Good Measure and a House on the Rock", 37, 49),
    ],
  },
  {
    book: "John", chapter: 14,
    sections: [
      section("In My Father's House", 1, 4),
      section("The Way to the Father", 5, 14),
      section("The Comforter Will Come", 15, 26),
      section("Peace I Leave With You", 27, 31),
    ],
  },
  {
    book: "Revelation", chapter: 14,
    sections: [
      section("The Lamb on Mount Sion", 1, 5),
      section("The Three Angels' Messages", 6, 12),
      section("Blessed Are the Dead in the Lord", 13, 13),
      section("One Like the Son of Man Reaps", 14, 20),
    ],
  },
  {
    book: "Psalms", chapter: 119,
    sections: [
      section("Aleph — Walking in the Law of the LORD", 1, 8),
      section("Beth — Hiding the Word in the Heart", 9, 16),
      section("Gimel — A Stranger Seeking Understanding", 17, 24),
      section("Daleth — Raised from the Dust", 25, 32),
      section("He — Teach Me the Way of Thy Statutes", 33, 40),
      section("Vau — Mercies and Liberty to Speak", 41, 48),
      section("Zain — Comfort in the Night", 49, 56),
      section("Cheth — The LORD My Portion", 57, 64),
      section("Teth — Good to Have Been Afflicted", 65, 72),
      section("Jod — Made and Fashioned by Thy Hands", 73, 80),
      section("Caph — Fainting for Salvation", 81, 88),
      section("Lamed — The Word Settled Forever", 89, 96),
      section("Mem — Sweeter Than Honey", 97, 104),
      section("Nun — A Lamp unto My Feet", 105, 112),
      section("Samech — A Hiding Place from the Proud", 113, 120),
      section("Ain — Time for the LORD to Work", 121, 128),
      section("Pe — Wonderful Testimonies", 129, 136),
      section("Tzaddi — Everlasting Righteousness", 137, 144),
      section("Koph — Crying with the Whole Heart", 145, 152),
      section("Resh — Quickened by Thy Word", 153, 160),
      section("Schin — Great Peace for Those Who Love Thy Law", 161, 168),
      section("Tau — The Lost Sheep Found", 169, 176),
    ],
  },
];
