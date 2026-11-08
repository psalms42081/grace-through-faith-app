import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  alignMapsToSurface,
  formatStrongId,
  tokenizeVerseSurface,
} from "../lib/reader-word-study";

describe("formatStrongId", () => {
  it("strips zero-padding", () => {
    assert.equal(formatStrongId("G00025"), "G25");
    assert.equal(formatStrongId("G25"), "G25");
    assert.equal(formatStrongId("H07225"), "H7225");
  });
});

describe("tokenizeVerseSurface", () => {
  it("keeps punctuation as non-word tokens", () => {
    const tokens = tokenizeVerseSurface("For God so loved the world,");
    assert.deepEqual(
      tokens.filter((t) => t.kind === "word").map((t) => t.surface),
      ["For", "God", "so", "loved", "the", "world"],
    );
    assert.equal(tokens.some((t) => t.surface.includes(",")), true);
  });
});

describe("alignMapsToSurface", () => {
  it("attaches John 3:16 loved to the STEP G25 gloss", () => {
    const text =
      "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";
    const maps = [
      { translatedWord: "Thus" },
      { translatedWord: "for" },
      { translatedWord: "loved" },
      { translatedWord: "" },
      { translatedWord: "God" },
      { translatedWord: "the" },
      { translatedWord: "world," },
    ];
    const aligned = alignMapsToSurface(text, maps);
    const loved = aligned.find((t) => t.surface === "loved");
    const god = aligned.find((t) => t.surface === "God");
    const world = aligned.find((t) => t.surface === "world");
    const so = aligned.find((t) => t.surface === "so");
    assert.equal(loved?.mapIndex, 2);
    assert.equal(god?.mapIndex, 4);
    assert.equal(world?.mapIndex, 6);
    assert.equal(so?.mapIndex, null);
  });

  it("reads translatedWord from wrapped STEP map rows", () => {
    const aligned = alignMapsToSurface("For God so loved the world,", [
      { map: { translatedWord: "Thus" } },
      { map: { translatedWord: "for" } },
      { map: { translatedWord: "loved" } },
    ]);
    assert.equal(aligned.find((t) => t.surface === "loved")?.mapIndex, 2);
  });

  it("lights Psalm 23:2 KJV words from STEP glosses plus kjvUsage", () => {
    const text =
      "He maketh me to lie down in green pastures: he leadeth me beside the still waters.";
    const aligned = alignMapsToSurface(text, [
      { translatedWord: "pastures of" },
      { translatedWord: "grass", kjvUsage: "(tender) grass, green, (tender) herb." },
      {
        translatedWord: "me",
        kjvUsage: "crouch (down), fall down, make a fold, lay, (cause to, make to) lie (down), make to rest, sit.",
      },
      { translatedWord: "at" },
      { translatedWord: "waters of" },
      { translatedWord: "rest", kjvUsage: "comfortable, ease, quiet, rest(-ing place), still." },
      { translatedWord: "me", kjvUsage: "carry, feed, guide, lead (gently, on)." },
    ]);
    const bySurface = Object.fromEntries(aligned.filter((t) => t.kind === "word").map((t) => [t.surface, t.mapIndex]));
    assert.equal(bySurface.pastures, 0);
    assert.equal(bySurface.green, 1);
    assert.ok(bySurface["lie down"] === 2 || aligned.some((t) => t.surface.includes("lie") && t.mapIndex === 2));
    assert.equal(bySurface.waters, 4);
    assert.equal(bySurface.still, 5);
    assert.equal(bySurface.leadeth, 6);
    const liePhrase = aligned.find((t) => t.mapIndex === 2);
    assert.ok(liePhrase, "H7257 should attach to the lie-down phrase");
    assert.match(liePhrase!.surface.toLowerCase(), /lie/);
    assert.match(liePhrase!.surface.toLowerCase(), /down/);
    assert.match(liePhrase!.surface.toLowerCase(), /maketh/);
  });

  it("maps Yahweh to LORD via Strong's usage", () => {
    const aligned = alignMapsToSurface("The LORD is my shepherd; I shall not want.", [
      { translatedWord: "Yahweh", kjvUsage: "Jehovah, the Lord." },
      { translatedWord: "my", kjvUsage: "keep (sheep) (-er), pastor, herdman." },
      { translatedWord: "I lack", kjvUsage: "be abated, (have) lack, want." },
    ]);
    assert.equal(aligned.find((t) => t.surface === "LORD")?.mapIndex, 0);
    assert.equal(aligned.find((t) => t.surface === "shepherd")?.mapIndex, 1);
    assert.equal(aligned.find((t) => t.surface === "want")?.mapIndex, 2);
  });

  it("collapses KJV 'for ever' onto the H5769 gloss ever", () => {
    const aligned = alignMapsToSurface(
      "and take also of the tree of life, and eat, and live for ever:",
      [{ translatedWord: "ever" }],
    );
    const phrase = aligned.find((t) => t.mapIndex === 0);
    assert.ok(phrase);
    assert.match(phrase!.surface.toLowerCase(), /for ever/);
  });

  it("collapses 'for ever' even when another map already tagged for", () => {
    const aligned = alignMapsToSurface(
      "and take also of the tree of life, and eat, and live for ever:",
      [{ translatedWord: "live" }, { translatedWord: "for" }, { translatedWord: "for ever" }],
    );
    const phrase = aligned.find((t) => t.mapIndex === 2);
    assert.ok(phrase);
    assert.match(phrase!.surface.toLowerCase(), /for ever/);
  });

  it("lights Psalm 23:2 lie down from the STEP host gloss", () => {
    const text =
      "He maketh me to lie down in green pastures: he leadeth me beside the still waters.";
    const aligned = alignMapsToSurface(text, [{ translatedWord: "he makes lie down" }]);
    const phrase = aligned.find((t) => t.mapIndex === 0);
    assert.ok(phrase);
    assert.match(phrase!.surface.toLowerCase(), /lie down/);
    assert.match(phrase!.surface.toLowerCase(), /maketh/);
  });
});

describe("reader word-study chrome", () => {
  it("uses a Word study chip instead of the Languages icon", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(reader, /Word study/);
    assert.doesNotMatch(reader, /from "lucide-react-native"/);
    assert.doesNotMatch(reader, /<Languages/);
  });

  it("leaves tagged words unmarked and tints the tapped word before the sheet opens", () => {
    const words = readFileSync(new URL("../components/reader/ReaderVerseWords.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(words, /textDecoration/);
    assert.doesNotMatch(words, /rgba\(91, 107, 122/);
    assert.match(words, /WORD_TAP_TINT = "#F1EBDD"/);
    assert.match(words, /WORD_TAP_TINT_MS = 300/);
    assert.match(words, /tappedIndex === index \? tappedStyle : null/);
    assert.match(words, /if \(pressOpensSheet\) tapThenActivate\(\)/);
  });

  it("shows Word study and Compare as a matching pair of text chips", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(reader, /READER_TOGGLE_ON_INK = "#C24431"/);
    assert.match(reader, /READER_TOGGLE_ON_TINT = "#FBE9E4"/);
    assert.match(reader, /style=\{\[styles\.headerToggle, kjvWordStudy && wordStudyMode && styles\.headerToggleOn\]\}/);
    assert.match(reader, /style=\{\[styles\.headerToggle, splitMode && styles\.headerToggleOn\]\}/);
    assert.match(reader, /<Text style=\{\[styles\.headerToggleText, splitMode && styles\.headerToggleTextOn\]\}>Compare<\/Text>/);
    assert.match(reader, /"Turn off Compare" : "Turn on Compare"/);
    assert.match(reader, /"Compare on" : "Compare off"/);
    assert.doesNotMatch(reader, /tablet-landscape-outline/);
    assert.doesNotMatch(reader, /Toggle split screen/);
  });

  it("keeps the Compare version picker above its close layer so a choice sticks", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(reader, /`Comparing \$\{translationDisplay\} with`/);
    assert.match(reader, /\{compareBar\}\s*<View style=\{splitMode && isSideBySide \? styles\.splitRow/);
    assert.match(reader, /compareBar: \{[^}]*zIndex: 60/);
    assert.match(reader, /handleSetSplitTranslation\(t\);\s*setShowSplitTranslationPicker\(false\)/);
    assert.match(reader, /AsyncStorage\.setItem\(SPLIT_TRANSLATION_KEY, t\)/);
    assert.doesNotMatch(reader, /splitTranslationDropdown/);
  });

  it("gives the picker search the coral-ink hairline focus style, not the browser outline", () => {
    const picker = readFileSync(new URL("../components/reader/TranslationPickerList.tsx", import.meta.url), "utf8");
    assert.match(picker, /searchBoxFocused: \{\s*borderColor: PathB\.coralInk/);
    assert.match(picker, /borderWidth: StyleSheet\.hairlineWidth/);
    assert.match(picker, /outlineStyle: "none"/);
  });

  it("stacks the second translation under each verse below 600px", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(reader, /const stackedSplit = splitMode && !isSideBySide/);
    assert.match(reader, /const isSideBySide = readerWidth >= 600/);
    assert.match(reader, /onLayout=\{\(event\) => setReaderWidth\(event\.nativeEvent\.layout\.width\)\}/);
    assert.match(reader, /\{splitMode && isSideBySide && \(/);
    assert.match(reader, /stackedSplit && splitVerseByNum\.get\(v\.verse\)/);
    assert.doesNotMatch(reader, /styles\.splitPaneStacked/);
  });

  it("routes See all uses to Strong's concordance, not Deep Dive", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    const strongs = readFileSync(new URL("../server/routes/strongs.ts", import.meta.url), "utf8");
    assert.match(reader, /pathname: "\/strong-concordance"/);
    assert.match(reader, /params:\s*\{\s*strong:/);
    assert.doesNotMatch(reader, /params: \{ tab: "word", strong:/);
    assert.match(strongs, /\/api\/strong\/:id\/uses/);
    assert.match(strongs, /\/api\/strong\/search/);
  });

  it("passes book, chapter, and verse into the word sheet", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(reader, /bookName: bookName/);
    assert.match(reader, /chapter: chapterNum/);
    assert.match(reader, /verse: verseNum/);
    assert.match(reader, /verseText:/);
  });
});
