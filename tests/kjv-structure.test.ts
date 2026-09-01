import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateChapter, type HeadingCorpus, type SourceBook } from "../scripts/generate-kjv-headings";
import { PARAGRAPH_HARD_MAX, regenerateSectionParagraphs, EDITORIAL_PARAGRAPHS } from "../scripts/kjv-paragraphs";
import { KJV_PSALM_119_LETTERS } from "../scripts/kjv-heading-regenerations";
import { applyKjvPoetryLines, getKjvProviderContent, KJV_STRUCTURE_VERSION, withKjvProviderContent } from "../server/services/kjv-structure";
import { isKjvReaderPoetryBook } from "../scripts/kjv-poetry-lines";

const source: SourceBook[] = JSON.parse(readFileSync("data/kjv.json", "utf8"));
const corpus: HeadingCorpus = JSON.parse(readFileSync("data/kjv-headings.generated.json", "utf8"));

function chapterOf(book: string, chapter: number) {
  return corpus.chapters.find((entry) => entry.book === book && entry.chapter === chapter)!;
}

function sourceChapter(book: string, chapter: number) {
  const sourceBook = source.find((entry) => entry.book === book)!;
  return sourceBook.chapters.find((entry) => Number(entry.chapter) === chapter)!;
}

test("KJV structure token is structure-v5", () => {
  assert.equal(KJV_STRUCTURE_VERSION, "structure-v5");
});

test("generated corpus covers 1,189 chapters and never exceeds the paragraph hard max", () => {
  assert.equal(corpus.chapters.length, 1189);
  let longest = 0;
  for (const chapter of corpus.chapters) {
    const sourceCh = sourceChapter(chapter.book, chapter.chapter);
    assert.deepEqual(validateChapter(sourceCh, chapter), []);
    for (const section of chapter.sections) {
      assert.notEqual(section.paragraphs.length, 0);
      const sectionLen = section.endVerse - section.startVerse + 1;
      if (sectionLen > PARAGRAPH_HARD_MAX) {
        assert.notEqual(
          section.paragraphs.length,
          1,
          `${chapter.book} ${chapter.chapter} section ${section.startVerse}-${section.endVerse} is 1:1 with a long paragraph`,
        );
      }
      for (const paragraph of section.paragraphs) {
        const length = paragraph.endVerse - paragraph.startVerse + 1;
        longest = Math.max(longest, length);
        assert.ok(length <= PARAGRAPH_HARD_MAX, `${chapter.book} ${chapter.chapter}:${paragraph.startVerse}-${paragraph.endVerse} is ${length} verses`);
      }
    }
  }
  assert.ok(longest <= PARAGRAPH_HARD_MAX);
});

test("Daniel 2:24-45 and Matthew 6:1-18 are several paragraphs, not 1:1 with the section", () => {
  const daniel = chapterOf("Daniel", 2);
  const dream = daniel.sections.find((section) => section.startVerse === 24 && section.endVerse === 45)!;
  assert.deepEqual(dream.paragraphs, EDITORIAL_PARAGRAPHS["Daniel 2:24-45"]);
  assert.ok(dream.paragraphs.length >= 4);

  const matthew = chapterOf("Matthew", 6);
  const secret = matthew.sections.find((section) => section.startVerse === 1 && section.endVerse === 18)!;
  assert.deepEqual(secret.paragraphs, EDITORIAL_PARAGRAPHS["Matthew 6:1-18"]);
  assert.ok(secret.paragraphs.length >= 4);
  assert.notEqual(secret.paragraphs.length, 1);
});

test("editorial paragraph regen still covers the section when applied to source verses", () => {
  const danielSource = sourceChapter("Daniel", 2);
  const section = {
    heading: "Daniel Interprets the Dream",
    startVerse: 24,
    endVerse: 45,
    paragraphs: [{ startVerse: 24, endVerse: 45 }],
  };
  const split = regenerateSectionParagraphs("Daniel", 2, section, danielSource.verses);
  assert.deepEqual(split.paragraphs, EDITORIAL_PARAGRAPHS["Daniel 2:24-45"]);
});

test("providerContent headings and paragraphs are attached without changing verse ids", () => {
  const verses = [
    { id: "kjv-27-2-24", verse: 24, text: "Then Daniel went in unto Arioch." },
    { id: "kjv-27-2-25", verse: 25, text: "Then Arioch brought in Daniel before the king." },
  ];
  const wrapped = withKjvProviderContent("Daniel", 2, verses);
  assert.deepEqual(wrapped.verses.map((verse) => verse.id), ["kjv-27-2-24", "kjv-27-2-25"]);
  assert.equal(wrapped.verses[0]!.text.includes("\n"), false);
  assert.ok((wrapped.providerContent.headings?.length ?? 0) >= 1);
  assert.ok((wrapped.providerContent.paragraphs?.length ?? 0) >= 2);
  const dreamParas = wrapped.providerContent.paragraphs.filter((paragraph) => paragraph.verseStart >= 24 && paragraph.verseEnd <= 45);
  assert.ok(dreamParas.length >= 4);
});

test("poetry line-breaks apply only to the six poetic books", () => {
  const psalm = [
    { id: "kjv-19-23-1", verse: 1, text: "The LORD is my shepherd; I shall not want." },
  ];
  const lined = applyKjvPoetryLines("Psalms", 23, psalm);
  assert.equal(lined[0]!.id, "kjv-19-23-1");
  assert.equal(lined[0]!.verse, 1);
  assert.ok(lined[0]!.text.includes("\n"));
  assert.equal(isKjvReaderPoetryBook("Psalms"), true);

  const daniel = [
    { id: "kjv-27-2-4", verse: 4, text: "Then spake the Chaldeans to the king in Syriack, O king, live for ever: tell thy servants the dream, and we will shew the interpretation." },
  ];
  const prose = applyKjvPoetryLines("Daniel", 2, daniel);
  assert.equal(prose[0]!.id, "kjv-27-2-4");
  assert.equal(prose[0]!.text, daniel[0]!.text);
  assert.equal(isKjvReaderPoetryBook("Daniel"), false);
  assert.equal(isKjvReaderPoetryBook("Isaiah"), false);
});

test("Psalm 119 and Revelation 14 headings survive into providerContent", () => {
  const psalm = getKjvProviderContent("Psalms", 119)!;
  assert.equal(psalm.headings.length, 22);
  const titles = psalm.headings.map((heading) => heading.text);
  assert.equal(new Set(titles).size, 22);
  for (const [index, letter] of KJV_PSALM_119_LETTERS.entries()) {
    assert.equal(titles[index]!.startsWith(`${letter} — `), true);
    assert.equal(psalm.headings[index]!.beforeVerse, index * 8 + 1);
  }

  const revelation = getKjvProviderContent("Revelation", 14)!;
  const angels = revelation.headings.find((heading) => heading.beforeVerse === 6);
  assert.equal(angels?.text, "The Three Angels' Messages");
});

test("local KJV resolve path attaches providerContent; reader still does not invent headings", () => {
  const scripture = readFileSync("server/services/scripture-service.ts", "utf8");
  const reader = readFileSync("app/read/[bookId]/[chapter].tsx", "utf8");
  const structure = readFileSync("server/services/kjv-structure.ts", "utf8");
  assert.match(scripture, /withKjvProviderContent/);
  assert.match(scripture, /translationAbbr === "KJV"/);
  assert.match(scripture, /providerContent: kjv\.providerContent/);
  assert.match(structure, /KJV_STRUCTURE_VERSION = "structure-v5"/);
  assert.match(reader, /Do not infer headings from KJV verse text/);
  assert.match(reader, /data\?\.providerContent\?\.headings/);
});
