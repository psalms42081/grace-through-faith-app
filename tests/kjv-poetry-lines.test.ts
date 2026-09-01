import test from "node:test";
import assert from "node:assert/strict";
import { splitKjvPoetryLines, poetryChapterFromSource } from "../scripts/kjv-poetry-lines";

test("splits KJV semicolon and colon clauses into q / q2-shaped lines", () => {
  assert.deepEqual(
    splitKjvPoetryLines("The LORD is my shepherd; I shall not want."),
    [
      { text: "The LORD is my shepherd;", indent: 0 },
      { text: "I shall not want.", indent: 1 },
    ],
  );
  assert.deepEqual(
    splitKjvPoetryLines("He maketh me to lie down in green pastures: he leadeth me beside the still waters."),
    [
      { text: "He maketh me to lie down in green pastures:", indent: 0 },
      { text: "he leadeth me beside the still waters.", indent: 1 },
    ],
  );
});

test("keeps a verse as one line when there is no clause delimiter", () => {
  assert.deepEqual(
    splitKjvPoetryLines("Blessed are the undefiled in the way, who walk in the law of the LORD."),
    [{ text: "Blessed are the undefiled in the way, who walk in the law of the LORD.", indent: 0 }],
  );
});

test("lifts Selah to its own line and resets the couplet", () => {
  assert.deepEqual(
    splitKjvPoetryLines("There is no help for him in God. Selah."),
    [
      { text: "There is no help for him in God.", indent: 0 },
      { text: "Selah.", indent: 0 },
    ],
  );
  assert.deepEqual(
    splitKjvPoetryLines("God came from Teman, and the Holy One from mount Paran. Selah. His glory covered the heavens, and the earth was full of his praise."),
    [
      { text: "God came from Teman, and the Holy One from mount Paran.", indent: 0 },
      { text: "Selah.", indent: 0 },
      { text: "His glory covered the heavens, and the earth was full of his praise.", indent: 0 },
    ],
  );
});

test("splits on exclamation when a new clause follows", () => {
  assert.deepEqual(
    splitKjvPoetryLines("Lord, how are they increased that trouble me! many are they that rise up against me."),
    [
      { text: "Lord, how are they increased that trouble me!", indent: 0 },
      { text: "many are they that rise up against me.", indent: 1 },
    ],
  );
});

test("poetryChapterFromSource preserves verse order from KJV-shaped source", () => {
  const chapter = poetryChapterFromSource("Psalms", "23", [
    { verse: "1", text: "The LORD is my shepherd; I shall not want." },
    { verse: "2", text: "He maketh me to lie down in green pastures: he leadeth me beside the still waters." },
  ]);
  assert.equal(chapter.book, "Psalms");
  assert.equal(chapter.chapter, 23);
  assert.deepEqual(chapter.verses.map((verse) => verse.verse), [1, 2]);
  assert.equal(chapter.verses[0]!.lines.length, 2);
});
