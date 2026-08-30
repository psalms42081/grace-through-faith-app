import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  groupVersesByParagraphStarts,
  splitParagraphGroupAtHeadings,
} from "../lib/group-verses-by-paragraph";

describe("groupVersesByParagraphStarts", () => {
  const verses = [
    { id: "a-1", verse: 1 },
    { id: "a-2", verse: 2 },
    { id: "a-3", verse: 3 },
    { id: "a-4", verse: 4 },
  ];

  it("returns one continuous flow when there are no paragraph starts", () => {
    const groups = groupVersesByParagraphStarts(verses, new Set());
    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0].map((v) => v.id), ["a-1", "a-2", "a-3", "a-4"]);
  });

  it("splits on provider starts without reordering verse identity", () => {
    const groups = groupVersesByParagraphStarts(verses, new Set([1, 3]));
    assert.deepEqual(groups.map((g) => g.map((v) => v.id)), [["a-1", "a-2"], ["a-3", "a-4"]]);
  });
});

describe("splitParagraphGroupAtHeadings", () => {
  it("does not invent headings when the map is empty", () => {
    const verses = [{ id: "nlt-1", verse: 1 }, { id: "nlt-2", verse: 2 }];
    const runs = splitParagraphGroupAtHeadings(verses, new Map());
    assert.equal(runs.length, 1);
    assert.deepEqual(runs[0].headings, []);
    assert.deepEqual(runs[0].verses.map((v) => v.id), ["nlt-1", "nlt-2"]);
  });

  it("breaks a run when a later verse has provider headings", () => {
    const verses = [{ id: "v1", verse: 1 }, { id: "v2", verse: 2 }, { id: "v3", verse: 3 }];
    const headings = new Map<number, string[]>([[3, ["A later heading"]]]);
    const runs = splitParagraphGroupAtHeadings(verses, headings);
    assert.equal(runs.length, 2);
    assert.deepEqual(runs[0].headings, []);
    assert.deepEqual(runs[1].headings, ["A later heading"]);
    assert.deepEqual(runs[1].verses.map((v) => v.id), ["v3"]);
  });
});

describe("typography preview source contracts", () => {
  it("gates new typography behind preview=typography and keeps live verse blocks", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(reader, /previewParam === "typography"/);
    assert.match(reader, /testID="reader-typography-preview-entry"/);
    assert.match(reader, /testID="reader-typography-preview-pill"/);
    assert.match(reader, /backgroundColor: "#147B7C"/);
    assert.match(reader, /verses\.map\(\(v, i\) =>/);
    assert.match(reader, /useBibleAudio\(verses,/);
  });

  it("warms API.Bible with the live html + titles-on fetch, not titles-off text", () => {
    const warmer = readFileSync(new URL("../scripts/warm-bible-cache.ts", import.meta.url), "utf8");
    assert.match(warmer, /fetchApiBibleChapter/);
    assert.match(warmer, /buildEditionCacheKey/);
    assert.match(warmer, /isStructuredApiBibleCache/);
    assert.doesNotMatch(warmer, /include-titles=false/);
    assert.doesNotMatch(warmer, /content-type=text/);
  });

  it("preview chrome is one floating play+pill row; highlight colours stay in the sheet", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(reader, /testID="reader-typography-preview-chrome"/);
    assert.match(reader, /previewFloatingRow/);
    const previewChrome = reader.slice(reader.indexOf("Preview chrome:"));
    const liveChromeStart = previewChrome.indexOf("A.3: reader controls strip");
    assert.ok(liveChromeStart > 0);
    const previewOnly = previewChrome.slice(0, liveChromeStart);
    assert.match(previewOnly, /listenBtn/);
    assert.match(previewOnly, /bottomPill/);
    assert.doesNotMatch(previewOnly, /handleStripHighlight/);
    assert.doesNotMatch(previewOnly, /CANON_HIGHLIGHTS\.map/);
    assert.match(reader, /handleHighlight\(key\)/);
  });

  it("nested preview runs stay keyed by verse.id", () => {
    const prose = readFileSync(new URL("../components/reader/TypographyPreviewProse.tsx", import.meta.url), "utf8");
    assert.match(prose, /key=\{v\.id\}/);
    assert.match(prose, /onLongPress=\{\(\) => onVerseLongPress\(v\)\}/);
    assert.match(prose, /delayLongPress=\{400\}/);
    assert.match(prose, /getHighlightBg\(v\.id, v\.verse, index\)/);
  });
});
