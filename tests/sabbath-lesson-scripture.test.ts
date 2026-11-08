import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  collectMarkedScriptureRefs,
  parseLessonDay,
  type LessonScriptureRef,
} from "../lib/sabbath-lesson-structure";

function day(id: string): string {
  return JSON.parse(
    readFileSync(
      new URL(`./fixtures/sabbath-school-2026-04-07/day-${id}.json`, import.meta.url),
      "utf8",
    ),
  ).content as string;
}

/** book, chapter, verse start, verse end, or a non-contiguous verse list. */
type Expected = [number, number, number | null, number | null, number[]?];

function same(ref: LessonScriptureRef, expected: Expected): boolean {
  const [bookId, chapter, verseStart, verseEnd, verses] = expected;
  return (
    ref.bookId === bookId &&
    ref.chapter === chapter &&
    ref.verseStart === verseStart &&
    ref.verseEnd === verseEnd &&
    (verses ? ref.verses?.join(",") === verses.join(",") : ref.verses == null)
  );
}

const DAYS: Record<string, Expected[]> = {
  "02": [
    [4, 14, 4, 11],
    [4, 13, 26, 30],
    [5, 34, 10, 12],
    [4, 14, 4, null],
    [4, 14, 8, 9],
  ],
  "04": [
    [14, 36, 15, 16],
    [14, 36, 11, null],
    [14, 36, 12, null],
    [2, 3, 15, null],
    [19, 105, 26, null],
    [39, 3, 1, null],
    [23, 6, 8, null],
    [24, 25, 4, null],
    [40, 11, 13, null],
    [42, 11, 49, null],
    [61, 3, 9, null],
    [24, 26, 9, null],
    [24, 6, 27, null],
    [24, 15, 20, 21],
    [24, 9, 1, 2],
  ],
  "06": [
    [46, 10, 6, 12],
    [48, 6, 14, 16],
    [46, 10, 6, null],
    [14, 20, 20, null],
    [64, 1, 2, null],
    [23, 40, 8, null],
    [46, 10, 11, null],
  ],
};

describe("Sabbath School lesson scripture", () => {
  for (const [id, expected] of Object.entries(DAYS)) {
    it(`detects every source reference on lesson day ${id} with its full range`, () => {
      const refs = collectMarkedScriptureRefs(day(id));
      assert.equal(refs.length, expected.length);
      expected.forEach((item, index) => {
        const ref = refs[index];
        assert.ok(ref, `missing reference ${index}`);
        assert.ok(same(ref, item), `${ref.text} did not match ${item.join(":")}`);
        if (item[3] != null) assert.match(ref.text, new RegExp(String(item[3])));
        assert.match(ref.text, /\d/);
        if (/[A-Za-z]/.test(ref.text)) assert.match(ref.text, /[A-Za-z]/);
      });
    });
  }

  it("keeps numbered books such as 2 Chronicles", () => {
    const texts = collectMarkedScriptureRefs(day("04")).map((ref) => ref.text);
    assert.ok(texts.includes("2 Chronicles 36:15, 16"));
    assert.ok(texts.includes("2 Chron. 36:11"));
    assert.ok(collectMarkedScriptureRefs(day("06")).some((ref) => ref.text === "2 Chron. 20:20"));
  });

  it("sets reading, scripture instructions, and questions apart", () => {
    const blocks = parseLessonDay(day("02"));
    assert.ok(blocks.some((block) => block.kind === "reading"));
    const instructions = blocks.filter((block) => block.kind === "instruction");
    assert.ok(instructions.some((block) => block.inlines.map((inline) => inline.text).join("").startsWith("Read ")));
    const questions = blocks.filter((block) => block.kind === "question");
    assert.ok(questions.every((block) => block.kind === "question" && /^q[a-z0-9]+$/.test(block.key)));
    assert.deepEqual(
      questions.map((block) => (block.kind === "question" ? block.text : "")),
      [
        "What is happening in these verses?",
        "Why are the people upset with Moses and Aaron?",
        "Why were the Israelites so afraid?",
        "What word of encouragement did Caleb share with them?",
        "It’s easy to trust in God when things are going well, isn’t it?",
        "How about when disaster strikes?",
        "How about when trusting God means discomfort or inconvenience?",
        "How well do you do then?",
      ],
    );
  });
});
