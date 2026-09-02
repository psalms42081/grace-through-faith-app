import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  gapAfterVerseInRun,
  groupVersesByParagraphStarts,
  splitLeadingWord,
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

describe("gapAfterVerseInRun", () => {
  it("starts every numbered verse on a new line in a poetry run, including single-line verses", () => {
    const run = [
      { text: "The invented shepherd line." },
      { text: "He makes me lie in mock fields,\nhe leads me beside mock water." },
      { text: "He restores my mock soul." },
    ];
    assert.equal(gapAfterVerseInRun(run, 0), "\n");
    assert.equal(gapAfterVerseInRun(run, 1), "\n");
    assert.equal(gapAfterVerseInRun(run, 2), "");
  });

  it("keeps prose verses inline and adds no trailing gap", () => {
    const run = [
      { text: "First prose verse." },
      { text: "Second prose verse." },
    ];
    assert.equal(gapAfterVerseInRun(run, 0), " ");
    assert.equal(gapAfterVerseInRun(run, 1), "");
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

describe("splitLeadingWord", () => {
  it("keeps the first word for a non-breaking join with the verse number", () => {
    assert.deepEqual(splitLeadingWord("And they sung as it were a new song"), {
      firstWord: "And",
      remainder: " they sung as it were a new song",
    });
    assert.deepEqual(splitLeadingWord("Harps"), { firstWord: "Harps", remainder: "" });
    assert.deepEqual(splitLeadingWord(""), { firstWord: "", remainder: "" });
  });
});

describe("typography preview source contracts", () => {
  it("versions persisted React Query cache to structure-v5 so stale passages refetch", () => {
    const qc = readFileSync(new URL("../lib/query-client.ts", import.meta.url), "utf8");
    const layout = readFileSync(new URL("../app/_layout.tsx", import.meta.url), "utf8");
    const scripture = readFileSync(new URL("../server/services/scripture-service.ts", import.meta.url), "utf8");
    const kjvStructure = readFileSync(new URL("../server/services/kjv-structure.ts", import.meta.url), "utf8");
    assert.match(qc, /QUERY_PERSIST_BUSTER = "structure-v5"/);
    assert.match(qc, /grace-through-faith-cache-v11-\$\{QUERY_PERSIST_BUSTER\}/);
    assert.match(qc, /"grace-through-faith-cache-v10"/);
    assert.match(qc, /"grace-through-faith-cache-v11-structure-v3"/);
    assert.match(qc, /"grace-through-faith-cache-v11-structure-v4"/);
    assert.match(layout, /buster: QUERY_PERSIST_BUSTER/);
    assert.match(scripture, /apibible-\$\{KJV_STRUCTURE_VERSION\}-/);
    assert.match(scripture, /\$\{KJV_STRUCTURE_VERSION\}\|/);
    assert.match(kjvStructure, /KJV_STRUCTURE_VERSION = "structure-v5"/);
  });

  it("promotes new typography by default and keeps verse-block behind a rollback flag", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(reader, /READER_LEGACY_VERSE_BLOCKS = false/);
    assert.match(reader, /useNewTypography && !splitMode \?/);
    assert.doesNotMatch(reader, /previewParam === "typography"/);
    assert.doesNotMatch(reader, /testID="reader-typography-preview-entry"/);
    assert.doesNotMatch(reader, /testID="reader-typography-preview-pill"/);
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

  it("live chrome is one floating play+pill row; highlight colours stay in the sheet", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(reader, /testID="reader-floating-chrome"/);
    assert.match(reader, /previewFloatingRow/);
    const newChrome = reader.slice(reader.indexOf("New chrome:"));
    const liveChromeStart = newChrome.indexOf("A.3: reader controls strip");
    assert.ok(liveChromeStart > 0);
    const defaultChrome = newChrome.slice(0, liveChromeStart);
    assert.match(defaultChrome, /listenBtn/);
    assert.match(defaultChrome, /bottomPill/);
    assert.doesNotMatch(defaultChrome, /handleStripHighlight/);
    assert.doesNotMatch(defaultChrome, /CANON_HIGHLIGHTS\.map/);
    assert.match(reader, /handleHighlight\(key\)/);
  });

  it("nested preview runs stay keyed by verse.id", () => {
    const prose = readFileSync(new URL("../components/reader/TypographyPreviewProse.tsx", import.meta.url), "utf8");
    assert.match(prose, /key=\{v\.id\}/);
    assert.match(prose, /onLongPress=\{\(\) => onVerseLongPress\(v\)\}/);
    assert.match(prose, /delayLongPress=\{400\}/);
    assert.match(prose, /getHighlightBg\(v\.id, v\.verse, index\)/);
    assert.match(prose, /v\.text\.split\("\\n"\)/);
    assert.match(prose, /splitLeadingWord\(lines\[0\]/);
    assert.ok(prose.includes("\\u00a0") || prose.includes("\u00a0"));
    assert.match(prose, /lineHeight: bodyLine \}/);
    assert.doesNotMatch(prose, /bodyLine \* 0\.72/);
    assert.match(prose, /testID="reader-typography-prose"/);
    assert.match(prose, /gapAfterVerseInRun\(run\.verses, verseIndex\)/);
  });

  it("wires per-verse onLongPress delayLongPress={400} on verse Text, not a paragraph Pressable", () => {
    const prose = readFileSync(new URL("../components/reader/TypographyPreviewProse.tsx", import.meta.url), "utf8");
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    const pressRun = prose.slice(prose.indexOf("function VersePressRun"));
    const pressRunBody = pressRun.slice(0, pressRun.indexOf("export function TypographyPreviewProse"));
    assert.match(pressRunBody, /<Text[\s\S]*?onPress=\{onPress\}[\s\S]*?onLongPress=\{onLongPress\}[\s\S]*?delayLongPress=\{400\}/);
    assert.doesNotMatch(pressRunBody, /<Pressable/);
    assert.match(
      prose,
      /<VersePressRun[\s\S]*?onPress=\{\(\) => onVerseTap\(v\)\}[\s\S]*?onLongPress=\{\(\) => onVerseLongPress\(v\)\}/,
    );
    assert.doesNotMatch(prose, /<Pressable/);
    assert.match(prose, /pointerEvents="box-none"/);
    assert.match(reader, /onVerseLongPress=\{handleVerseLongPress\}/);
    assert.match(reader, /delayLongPress=\{400\}/);
  });

  it("renders qa acrostic headings smaller than s1 and LORD in small caps", () => {
    const prose = readFileSync(new URL("../components/reader/TypographyPreviewProse.tsx", import.meta.url), "utf8");
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    const runs = readFileSync(new URL("../components/reader/VerseTextRuns.tsx", import.meta.url), "utf8");
    assert.match(prose, /heading\.kind === "qa"/);
    assert.match(prose, /headingQa/);
    assert.match(prose, /VerseTextRuns/);
    assert.match(reader, /providerHeadingQa/);
    assert.match(reader, /VerseTextRuns text=\{v\.text\}/);
    assert.match(runs, /fontVariant: \["small-caps"\]/);
    assert.match(runs, /splitDivineNameRuns/);
  });
});
