import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { scriptureCiteNeedles, textCitesNeedles } from "../lib/scripture-cite";
import { pickBookOverviewCards, hasBookOverviewContent } from "../lib/book-overview";
import {
  firstThreeLines,
  formatSheetReference,
  isAiGeneratedSource,
} from "../lib/verse-sheet";
import { wordStudyChipsForVerse } from "../lib/reader-word-study";

describe("formatSheetReference", () => {
  it("formats a single verse and a hyphenated range", () => {
    assert.equal(formatSheetReference("Psalms", 23, [1]), "Psalms 23:1");
    assert.equal(formatSheetReference("Psalms", "23", [1, 2, 3]), "Psalms 23:1-3");
    assert.equal(formatSheetReference("Psalms", 23, [1, 3]), "Psalms 23:1, 3");
  });
});

describe("firstThreeLines", () => {
  it("keeps short text and flags overflow", () => {
    assert.deepEqual(firstThreeLines("One.\nTwo.\nThree."), {
      preview: "One.\nTwo.\nThree.",
      hasMore: false,
    });
    assert.equal(firstThreeLines("One.\nTwo.\nThree.\nFour.").hasMore, true);
    assert.equal(firstThreeLines("One. Two. Three. Four.").hasMore, true);
  });
});

describe("scriptureCiteNeedles", () => {
  it("covers Psalm / Ps variants for Psalm 23:1", () => {
    const needles = scriptureCiteNeedles({
      bookName: "Psalms",
      abbreviation: "Psa",
      chapter: 23,
      verse: 1,
    });
    assert.ok(needles.includes("Psalms 23:1"));
    assert.ok(needles.includes("Psalm 23:1"));
    assert.ok(needles.includes("Ps. 23:1"));
    assert.equal(textCitesNeedles("See Ps. 23:1 for the shepherd.", needles), true);
    assert.equal(textCitesNeedles("No citation here.", needles), false);
  });
});

describe("isAiGeneratedSource", () => {
  it("labels missing or ai sources", () => {
    assert.equal(isAiGeneratedSource(undefined), true);
    assert.equal(isAiGeneratedSource("ai"), true);
    assert.equal(isAiGeneratedSource("KJV"), false);
  });
});

describe("wordStudyChipsForVerse", () => {
  it("emits English → unpadded Strong chips for aligned words", () => {
    const chips = wordStudyChipsForVerse("He maketh me to lie down in green pastures.", [
      {
        map: { strongId: "H07257", wordPosition: 1, originalWord: "", translatedWord: "pastures" },
        entry: { id: "H7257", language: "he", lemma: "", transliteration: null, pronunciation: null, definition: "", kjvUsage: null },
      },
    ]);
    assert.ok(chips.some((chip) => chip.surface.toLowerCase().includes("pasture") && chip.strongId === "H7257"));
  });
});

describe("pickBookOverviewCards", () => {
  it("prefers chapter-null cards, then chapter 1", () => {
    assert.deepEqual(
      pickBookOverviewCards([
        { chapter: 23, title: "psalm 23" },
        { chapter: 1, title: "intro" },
      ]).map((c) => c.title),
      ["intro"],
    );
    assert.deepEqual(
      pickBookOverviewCards([
        { chapter: null, title: "book" },
        { chapter: 1, title: "intro" },
      ]).map((c) => c.title),
      ["book"],
    );
    assert.equal(hasBookOverviewContent([{ chapter: 23 }]), false);
    assert.equal(hasBookOverviewContent([{ chapter: 1 }]), true);
  });
});

describe("verse sheet wiring", () => {
  it("registers the verse-sheet route and EGW local chapter", () => {
    const routes = readFileSync(new URL("../server/routes.ts", import.meta.url), "utf8");
    const egw = readFileSync(new URL("../server/routes/egw.ts", import.meta.url), "utf8");
    const sheet = readFileSync(new URL("../server/routes/verse-sheet.ts", import.meta.url), "utf8");
    const colors = readFileSync(new URL("../lib/verse-sheet.ts", import.meta.url), "utf8");
    assert.match(routes, /verseSheetRoutes/);
    assert.match(egw, /\/local-chapter\/:id/);
    assert.match(sheet, /Classic|matthew-henry/);
    assert.match(sheet, /ellenWhite/);
    assert.match(sheet, /sabbathSchool/);
    assert.match(sheet, /hasBookOverview/);
    assert.match(colors, /key: "rose"/);
  });

  it("gives the expanded sheet a bounded height and a flex scroll so every section heading stays reachable", () => {
    const sheet = readFileSync(new URL("../components/reader/VerseSheet.tsx", import.meta.url), "utf8");
    assert.match(sheet, /useWindowDimensions/);
    assert.match(sheet, /expandedHeight/);
    assert.match(sheet, /expandedScroll/);
    assert.match(sheet, /title="Words"/);
    assert.match(sheet, /title="Classic Commentators"/);
    assert.match(sheet, /title="Cross-references"/);
    assert.match(sheet, /title="Ellen White"/);
    assert.match(sheet, /title="Sabbath School"/);
    assert.match(sheet, /title="See also"/);
    assert.match(sheet, /\/verse-map\/generate/);
    assert.match(sheet, /Explain This Verse/);
    assert.match(sheet, /reader-verse-sheet-explain/);
    assert.doesNotMatch(sheet, /Dimensions\.get\("window"\)\.height/);
  });

  it("hides Book overview unless the API reports content, and opens passage-context overview", () => {
    const sheet = readFileSync(new URL("../components/reader/VerseSheet.tsx", import.meta.url), "utf8");
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    const passage = readFileSync(new URL("../app/passage-context.tsx", import.meta.url), "utf8");
    assert.match(sheet, /contextQuery\.data\?\.hasBookOverview \?/);
    assert.match(sheet, /fields=overview/);
    assert.match(reader, /pathname: "\/passage-context"/);
    assert.match(reader, /overview: "1"/);
    assert.match(passage, /overviewFlag === "1"/);
    assert.match(passage, /book-overview-screen/);
    assert.doesNotMatch(reader, /onOpenBookOverview=\{\(\) =>\s*router\.push\(`\/read\/\$\{/);
  });

  it("marks the active highlight and offers a Remove swatch", () => {
    const sheet = readFileSync(new URL("../components/reader/VerseSheet.tsx", import.meta.url), "utf8");
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(sheet, /isActive \? onRemoveHighlight\(\) : onHighlight\(dot\.key\)/);
    assert.match(sheet, /reader-verse-highlight-remove/);
    assert.match(sheet, /dotActive/);
    assert.match(reader, /handleRemoveHighlight/);
    assert.match(reader, /showStripToast\("Highlight removed"\)/);
  });

  it("toasts Bookmarked and Sign in to save, and fills the bookmark icon", () => {
    const sheet = readFileSync(new URL("../components/reader/VerseSheet.tsx", import.meta.url), "utf8");
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(sheet, /bookmarked \? "bookmark" : "bookmark-outline"/);
    assert.match(reader, /showStripToast\("Bookmarked"\)/);
    assert.match(reader, /showStripToast\("Sign in to save"\)/);
    assert.match(reader, /POST", "\/api\/bookmarks"/);
  });
});
