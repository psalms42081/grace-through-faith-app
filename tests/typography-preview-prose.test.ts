import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  gapAfterVerseInRun,
  groupVersesByParagraphStarts,
  joinInlineVerseRun,
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

/** Production 1 Chronicles 14 NIV verses + providerContent (api_bible, structure-v5). */
const CHRON1_14_NIV = {
  verses: [
    { id: "niv-13-14-1", verse: 1, text: "Now Hiram king of Tyre sent messengers to David, along with cedar logs, stonemasons and carpenters to build a palace for him." },
    { id: "niv-13-14-2", verse: 2, text: "And David knew that the LORD had established him as king over Israel and that his kingdom had been highly exalted for the sake of his people Israel." },
    { id: "niv-13-14-3", verse: 3, text: "In Jerusalem David took more wives and became the father of more sons and daughters." },
    { id: "niv-13-14-4", verse: 4, text: "These are the names of the children born to him there: Shammua, Shobab, Nathan, Solomon," },
    { id: "niv-13-14-5", verse: 5, text: "Ibhar, Elishua, Elpelet," },
    { id: "niv-13-14-6", verse: 6, text: "Nogah, Nepheg, Japhia," },
    { id: "niv-13-14-7", verse: 7, text: "Elishama, Beeliada and Eliphelet." },
    { id: "niv-13-14-8", verse: 8, text: "When the Philistines heard that David had been anointed king over all Israel, they went up in full force to search for him, but David heard about it and went out to meet them." },
    { id: "niv-13-14-9", verse: 9, text: "Now the Philistines had come and raided the Valley of Rephaim;" },
    { id: "niv-13-14-10", verse: 10, text: "so David inquired of God: “Shall I go and attack the Philistines? Will you deliver them into my hands?”\nThe LORD answered him, “Go, I will deliver them into your hands.”" },
    { id: "niv-13-14-11", verse: 11, text: "So David and his men went up to Baal Perazim, and there he defeated them. He said, “As waters break out, God has broken out against my enemies by my hand.” So that place was called Baal Perazim." },
    { id: "niv-13-14-12", verse: 12, text: "The Philistines had abandoned their gods there, and David gave orders to burn them in the fire." },
    { id: "niv-13-14-13", verse: 13, text: "Once more the Philistines raided the valley;" },
    { id: "niv-13-14-14", verse: 14, text: "so David inquired of God again, and God answered him, “Do not go directly after them, but circle around them and attack them in front of the poplar trees." },
    { id: "niv-13-14-15", verse: 15, text: "As soon as you hear the sound of marching in the tops of the poplar trees, move out to battle, because that will mean God has gone out in front of you to strike the Philistine army.”" },
    { id: "niv-13-14-16", verse: 16, text: "So David did as God commanded him, and they struck down the Philistine army, all the way from Gibeon to Gezer." },
    { id: "niv-13-14-17", verse: 17, text: "So David’s fame spread throughout every land, and the LORD made all the nations fear him." },
  ],
  paragraphStarts: new Set([1, 3, 8, 11, 13, 17]),
};

describe("1 Chronicles 14 NIV paragraph 1–2", () => {
  it("renders verses 1 and 2 on the same inline run with no newline between them", () => {
    const groups = groupVersesByParagraphStarts(CHRON1_14_NIV.verses, CHRON1_14_NIV.paragraphStarts);
    assert.deepEqual(groups[0].map((v) => v.verse), [1, 2]);
    assert.equal(gapAfterVerseInRun(groups[0], 0), " ");
    assert.notEqual(gapAfterVerseInRun(groups[0], 0), "\n");

    const inline = joinInlineVerseRun(groups[0]);
    const v1 = CHRON1_14_NIV.verses[0].text;
    const v2 = CHRON1_14_NIV.verses[1].text;
    const boundary = inline.indexOf(v1) + v1.length;
    assert.notEqual(boundary, v1.length - 1);
    assert.equal(inline.slice(boundary, boundary + 1), " ");
    assert.equal(inline.includes("\n"), false);
    assert.equal(inline.slice(boundary + 1, boundary + 1 + v2.length), v2);
    assert.ok(inline.startsWith(v1));
    assert.ok(inline.endsWith(v2));
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
    assert.match(qc, /QUERY_PERSIST_BUSTER = "structure-v5-shelf-v1"/);
    assert.match(qc, /grace-through-faith-cache-v11-\$\{QUERY_PERSIST_BUSTER\}/);
    assert.match(qc, /"grace-through-faith-cache-v10"/);
    assert.match(qc, /"grace-through-faith-cache-v11-structure-v3"/);
    assert.match(qc, /"grace-through-faith-cache-v11-structure-v4"/);
    assert.match(qc, /"grace-through-faith-cache-v11-structure-v5"/);
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
    assert.match(prose, /onLongPress: \(\) => onVerseLongPress\(v\)/);
    assert.match(prose, /delayLongPress: 400/);
    assert.match(prose, /getHighlightBg\(v\.id, v\.verse, index\)/);
    assert.match(prose, /v\.text\.split\("\\n"\)/);
    assert.match(prose, /splitLeadingWord\(lines\[0\]/);
    assert.ok(prose.includes("\\u00a0") || prose.includes("\u00a0"));
    assert.match(prose, /lineHeight: bodyLine \}/);
    assert.doesNotMatch(prose, /bodyLine \* 0\.72/);
    assert.match(prose, /testID="reader-typography-prose"/);
    assert.match(prose, /gapAfterVerseInRun\(run\.verses, verseIndex\)/);
  });

  it("keeps three verses inline in one parent Text s.body, not VersePressRun blocks", () => {
    const verses = [
      { id: "p-1", verse: 1, text: "First prose verse." },
      { id: "p-2", verse: 2, text: "Second prose verse." },
      { id: "p-3", verse: 3, text: "Third prose verse." },
    ];
    const groups = groupVersesByParagraphStarts(verses, new Set());
    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0].map((v) => v.id), ["p-1", "p-2", "p-3"]);
    assert.equal(gapAfterVerseInRun(groups[0], 0), " ");
    assert.equal(gapAfterVerseInRun(groups[0], 1), " ");
    assert.equal(gapAfterVerseInRun(groups[0], 2), "");

    const prose = readFileSync(new URL("../components/reader/TypographyPreviewProse.tsx", import.meta.url), "utf8");
    assert.match(
      prose,
      /<Text[\s\S]*?style=\{\[s\.body[\s\S]*?run\.verses\.map[\s\S]*?key=\{v\.id\}[\s\S]*?onVerseTap\(v\)/,
    );
    assert.doesNotMatch(prose, /VersePressRun/);
    assert.doesNotMatch(prose, /webParagraphStyle/);
    assert.doesNotMatch(prose, /<Pressable/);
    assert.match(prose, /pointerEvents="box-none"/);
    assert.match(prose, /gapAfterVerseInRun\(run\.verses, verseIndex\)/);
    assert.match(prose, /return \(\s*<Text\s+key=\{v\.id\}/);
    assert.match(prose, /display:\s*"inline"/);
    assert.doesNotMatch(prose, /display:\s*"block"/);
    assert.doesNotMatch(prose, /width:\s*"100%"/);
    assert.doesNotMatch(prose, /flexDirection|display:\s*"flex"/);
    assert.match(prose, /backgroundColor:\s*bg/);
    assert.match(prose, /IS_WEB \? undefined : \{ accessibilityRole: "button"/);
    assert.doesNotMatch(prose, /accessibilityRole="button"/);
  });

  it("wires per-verse tap and Platform-branched long-press on nested verse Text", () => {
    const prose = readFileSync(new URL("../components/reader/TypographyPreviewProse.tsx", import.meta.url), "utf8");
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(prose, /Platform\.OS === "web"/);
    assert.match(prose, /webLongPress\.start\(v\.id, x, y\)/);
    assert.match(prose, /onPointerDown/);
    assert.match(prose, /onLongPress: \(\) => onVerseLongPress\(v\)/);
    assert.match(prose, /delayLongPress: 400/);
    assert.match(prose, /consumeSuppressedClick/);
    assert.match(prose, /onVerseTap\(v\)/);
    assert.doesNotMatch(prose, /<Pressable/);
    assert.doesNotMatch(prose, /VersePressRun/);
    assert.match(reader, /onVerseLongPress=\{handleVerseLongPress\}/);
    assert.match(reader, /delayLongPress=\{400\}/);
    assert.match(reader, /READER_FLOATING_CHROME_HEIGHT \+ READER_SCROLL_END_AIR \+ bottomPad/);
    assert.match(reader, /testID="reader-floating-chrome"/);
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
