import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { bibleSearchScore, rankBibleSearchResults, textHasWholeWords } from "../lib/bible-search";
import { spokenRangesForLine } from "../lib/words-of-christ";

function read(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("whole-word search ranking", () => {
  it("does not treat grace as a match inside disgrace", () => {
    assert.equal(textHasWholeWords("The grace of God", "grace"), true);
    assert.equal(textHasWholeWords("a disgrace to them", "grace"), false);
    const ranked = rankBibleSearchResults(
      [
        { bookId: 13, chapter: 1, verse: 1, text: "a disgrace to the house" },
        { bookId: 43, chapter: 3, verse: 16, text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life by grace." },
        { bookId: 49, chapter: 2, verse: 8, text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:" },
      ],
      "grace",
    );
    assert.deepEqual(
      ranked.map((row) => `${row.bookId}:${row.chapter}:${row.verse}`),
      ["49:2:8", "43:3:16"],
    );
    assert.ok(bibleSearchScore(ranked[0], "grace") > bibleSearchScore(ranked[1], "grace"));
  });
});

describe("red letters follow the reading version", () => {
  it("keeps the comparison line black when the reading version has no markup", () => {
    const kjv = spokenRangesForLine({
      redLettersEnabled: true,
      readingTranslation: "KJV",
      lineTranslation: "KJV",
      bookId: 43,
      chapter: 14,
      verse: 6,
    });
    assert.ok(kjv.length > 0);
    assert.deepEqual(
      spokenRangesForLine({
        redLettersEnabled: true,
        readingTranslation: "NASB1995",
        lineTranslation: "KJV",
        bookId: 43,
        chapter: 14,
        verse: 6,
      }),
      [],
    );
    assert.deepEqual(
      spokenRangesForLine({
        redLettersEnabled: true,
        readingTranslation: "KJV",
        lineTranslation: "NIV",
        bookId: 43,
        chapter: 14,
        verse: 6,
      }),
      [],
    );
  });
});

describe("audit follow-up sources", () => {
  it("labels the narrator as a synthetic voice and does not call it Ellen", () => {
    const audio = read("hooks/useBibleAudio.ts");
    const settings = read("app/settings.tsx");
    assert.doesNotMatch(audio, /Ellen/);
    assert.match(audio, /Synthetic voice/);
    assert.match(settings, /Narrator voice \(AI\)/);
    assert.match(settings, /synthetic voice/i);
  });

  it("redirects /discover to the Discover tab", () => {
    assert.match(read("app/discover.tsx"), /Redirect href="\/search"/);
  });

  it("does not reflect a missing CORS origin", () => {
    const server = read("server/index.ts");
    assert.match(server, /if \(origin && \(origins\.has\(origin\)/);
    assert.doesNotMatch(server, /isMobileApp/);
  });

  it("loads Strong's maps one chapter at a time, and only when word study is on", () => {
    const reader = read("app/read/[bookId]/[chapter].tsx");
    assert.match(reader, /\/api\/strong\/chapter\//);
    assert.doesNotMatch(reader, /\/api\/strong\/verse\//);
    assert.match(reader, /chapterStrongEnabled/);
    assert.match(reader, /if \(!isAuthenticated\) return/);
  });
});
