import test from "node:test";
import assert from "node:assert/strict";
import { validateChapter, validateCorpus, type HeadingCorpus, type SourceBook } from "../scripts/generate-kjv-headings";

const source: SourceBook[] = [{ book: "Test", chapters: [{ chapter: "1", verses: [{ verse: "1", text: "One" }, { verse: "2", text: "Two" }, { verse: "3", text: "Three" }] }] }];
const valid: HeadingCorpus = { schemaVersion: "kjv-headings-v1", lensVersion: "sda-v2", chapters: [{ book: "Test", chapter: 1, sections: [
  { heading: "An original beginning", startVerse: 1, endVerse: 2, paragraphs: [{ startVerse: 1, endVerse: 2 }] },
  { heading: "A faithful conclusion", startVerse: 3, endVerse: 3, paragraphs: [{ startVerse: 3, endVerse: 3 }] },
] }] };

test("validator accepts contiguous source coverage", () => {
  assert.deepEqual(validateChapter(source[0].chapters[0], valid.chapters[0]), []);
  assert.equal(validateCorpus(source, valid).valid, true);
});

test("validator rejects gaps, overlap, empty headings, and missing chapters", () => {
  const broken = structuredClone(valid);
  broken.chapters[0].sections[0].heading = " ";
  broken.chapters[0].sections[1].startVerse = 2;
  broken.chapters[0].sections[1].paragraphs[0].startVerse = 2;
  assert.equal(validateCorpus(source, broken).valid, false);
  assert.match(validateCorpus(source, { ...valid, chapters: [] }).errors.join("\n"), /missing chapter/);
});