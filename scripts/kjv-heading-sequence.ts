/**
 * Copyright-screen for KJV headings: generic single titles are allowed.
 * A chapter is flagged when its full heading sequence (or a long consecutive
 * run) matches a known published edition's set for that chapter.
 *
 * Unwired review tooling — not imported by the server.
 */
import type { ChapterHeadings } from "./generate-kjv-headings";

export interface PublishedSequence {
  edition: string;
  book: string;
  chapter: number;
  headings: string[];
}

export interface SequenceFlag {
  book: string;
  chapter: number;
  reason: string;
  edition: string;
  ours: string[];
  published: string[];
}

/** Stem = text before a colon subtitle; articles/punctuation stripped. */
export function headingStem(heading: string): string {
  const beforeColon = heading.split(":")[0] ?? heading;
  return beforeColon
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenSet(stem: string): Set<string> {
  return new Set(stem.split(" ").filter(Boolean));
}

export function jaccard(a: string, b: string): number {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (left.size === 0 && right.size === 0) return 1;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  const union = left.size + right.size - overlap;
  return union === 0 ? 0 : overlap / union;
}

/**
 * Well-known published heading sets used only as a screen.
 * Generic narrative labels (parable names, passion events) are not listed
 * unless they form a distinctive editorial package for that chapter.
 */
export const PUBLISHED_HEADING_SEQUENCES: PublishedSequence[] = [
  {
    edition: "NIV", book: "Matthew", chapter: 5,
    headings: [
      "Introduction to the Sermon on the Mount", "The Beatitudes", "Salt and Light",
      "The Fulfillment of the Law", "Murder", "Adultery", "Divorce", "Oaths",
      "Eye for Eye", "Love for Enemies",
    ],
  },
  {
    edition: "ESV", book: "Matthew", chapter: 5,
    headings: [
      "The Sermon on the Mount", "The Beatitudes", "Salt and Light",
      "Christ Came to Fulfill the Law", "Anger", "Lust", "Divorce", "Oaths",
      "Retaliation", "Love Your Enemies",
    ],
  },
  {
    edition: "NIV", book: "Matthew", chapter: 6,
    headings: ["Giving to the Needy", "Prayer", "Fasting", "Treasures in Heaven", "Do Not Worry"],
  },
  {
    edition: "ESV", book: "Matthew", chapter: 6,
    headings: ["Giving to the Needy", "The Lord's Prayer", "Fasting", "Lay Up Treasures in Heaven", "Do Not Be Anxious"],
  },
  {
    edition: "NIV", book: "Matthew", chapter: 7,
    headings: [
      "Judging Others", "Ask, Seek, Knock", "The Narrow and Wide Gates",
      "True and False Prophets", "True and False Disciples", "The Wise and Foolish Builders",
    ],
  },
  {
    edition: "NIV", book: "Luke", chapter: 6,
    headings: [
      "Lord of the Sabbath", "The Man With a Withered Hand", "The Twelve Apostles",
      "Blessings and Woes", "Love for Enemies", "Judging Others",
      "A Tree and Its Fruit", "The Wise and Foolish Builders",
    ],
  },
  {
    edition: "NIV", book: "John", chapter: 3,
    headings: ["Jesus Teaches Nicodemus", "John Testifies About Jesus"],
  },
  {
    edition: "NIV", book: "John", chapter: 14,
    headings: ["Jesus Comforts His Disciples", "Jesus the Way to the Father", "Jesus Promises the Holy Spirit"],
  },
  {
    edition: "NIV", book: "Revelation", chapter: 12,
    headings: ["The Woman and the Dragon"],
  },
  {
    edition: "NIV", book: "Revelation", chapter: 13,
    headings: ["The Beast out of the Sea", "The Beast out of the Earth"],
  },
  {
    edition: "NIV", book: "Revelation", chapter: 14,
    headings: ["The Lamb and the 144,000", "The Three Angels", "Harvesting the Earth"],
  },
  {
    edition: "ESV", book: "Revelation", chapter: 14,
    headings: ["The Lamb and the 144,000", "The Messages of the Three Angels", "The Harvest of the Earth"],
  },
  {
    edition: "NIV", book: "Daniel", chapter: 2,
    headings: ["Nebuchadnezzar's Dream", "Daniel Interprets the Dream"],
  },
  {
    edition: "NIV", book: "Daniel", chapter: 7,
    headings: ["Daniel's Dream of Four Beasts", "The Interpretation of the Dream"],
  },
  {
    edition: "NIV", book: "Psalms", chapter: 119,
    headings: [
      "Aleph", "Beth", "Gimel", "Daleth", "He", "Waw", "Zayin", "Heth", "Teth",
      "Yodh", "Kaph", "Lamedh", "Mem", "Nun", "Samekh", "Ayin", "Pe", "Tsadhe",
      "Qoph", "Resh", "Sin and Shin", "Taw",
    ],
  },
];

const MIN_CONSECUTIVE_RUN = 4;
const ALIGNED_SIMILARITY = 0.72;

function longestConsecutiveRun(ours: string[], published: string[]): number {
  let best = 0;
  for (let start = 0; start < ours.length; start++) {
    for (let pubStart = 0; pubStart < published.length; pubStart++) {
      let run = 0;
      while (
        start + run < ours.length &&
        pubStart + run < published.length &&
        ours[start + run] === published[pubStart + run]
      ) {
        run += 1;
      }
      if (run > best) best = run;
    }
  }
  return best;
}

function alignedSimilarity(ours: string[], published: string[]): number {
  if (ours.length !== published.length || ours.length === 0) return 0;
  const scores = ours.map((stem, i) => jaccard(stem, published[i]!));
  return scores.reduce((sum, n) => sum + n, 0) / scores.length;
}

export function reviewChapter(
  chapter: ChapterHeadings,
  catalog: PublishedSequence[] = PUBLISHED_HEADING_SEQUENCES,
): SequenceFlag[] {
  const ours = chapter.sections.map((section) => headingStem(section.heading));
  const flags: SequenceFlag[] = [];
  const publishedForChapter = catalog.filter(
    (entry) => entry.book === chapter.book && entry.chapter === chapter.chapter,
  );
  for (const entry of publishedForChapter) {
    const published = entry.headings.map(headingStem);
    if (published.length === 1 && ours.length > 1) continue;
    if (ours.length === published.length && ours.every((stem, i) => stem === published[i])) {
      flags.push({
        book: chapter.book, chapter: chapter.chapter,
        reason: "full heading sequence matches a published set",
        edition: entry.edition, ours: chapter.sections.map((s) => s.heading), published: entry.headings,
      });
      continue;
    }
    if (
      ours.length === published.length &&
      ours.length >= 3 &&
      alignedSimilarity(ours, published) >= ALIGNED_SIMILARITY
    ) {
      flags.push({
        book: chapter.book, chapter: chapter.chapter,
        reason: "same-length sequence is aligned with a published set",
        edition: entry.edition, ours: chapter.sections.map((s) => s.heading), published: entry.headings,
      });
      continue;
    }
    const run = longestConsecutiveRun(ours, published);
    if (run >= MIN_CONSECUTIVE_RUN) {
      flags.push({
        book: chapter.book, chapter: chapter.chapter,
        reason: `consecutive run of ${run} published titles`,
        edition: entry.edition, ours: chapter.sections.map((s) => s.heading), published: entry.headings,
      });
    }
  }
  return flags;
}

export function reviewCorpus(chapters: ChapterHeadings[]): SequenceFlag[] {
  const seen = new Set<string>();
  const flags: SequenceFlag[] = [];
  for (const chapter of chapters) {
    for (const flag of reviewChapter(chapter)) {
      const key = `${flag.book} ${flag.chapter}:${flag.reason}:${flag.edition}`;
      if (seen.has(key)) continue;
      seen.add(key);
      flags.push(flag);
    }
  }
  return flags;
}
