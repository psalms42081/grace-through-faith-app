export type PioneerChapterSummary = {
  id: string;
  author: string;
  authorSlug: string;
  authorDates: string;
  book: string;
  bookSlug: string;
  year: number;
  chapterNumber: number;
  chapterTitle: string;
  sourceUrl: string;
  publicDomain: string;
};

export type PioneerChapterPayload = PioneerChapterSummary & {
  paragraphs: string[];
};

export type PioneerReadingPayload = {
  id: string;
  weekStart: string | null;
  editorNote: string;
  paragraphStart: number;
  paragraphEnd: number;
  published: boolean;
  sortOrder: number;
  paragraphs: string[];
  chapter: PioneerChapterSummary;
  publicDomain: string;
};

export type PioneerReadingListItem = Omit<PioneerReadingPayload, "paragraphs">;

export type PioneerShelfChapter = {
  id: string;
  number: number;
  title: string;
};

export type PioneerShelfBook = {
  slug: string;
  title: string;
  year: number;
  chapterCount: number;
  sourceUrl: string;
  publicDomain: string;
  chapters: PioneerShelfChapter[];
};

export type PioneerShelfAuthor = {
  slug: string;
  name: string;
  dates: string;
  books: PioneerShelfBook[];
};

export type PioneerWeekResponse = {
  reading: PioneerReadingPayload | null;
  sabbathDate: string;
};

export type PioneerShelfResponse = {
  authors: PioneerShelfAuthor[];
};

export type PioneerReadingsResponse = {
  readings: PioneerReadingListItem[];
};
