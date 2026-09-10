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
});

describe("reader word-study chrome", () => {
  it("uses a Word study chip instead of the Languages icon", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    assert.match(reader, /Word study/);
    assert.doesNotMatch(reader, /from "lucide-react-native"/);
    assert.doesNotMatch(reader, /<Languages/);
  });

  it("underlines tagged words with a dotted stroke and no grey wash", () => {
    const words = readFileSync(new URL("../components/reader/ReaderVerseWords.tsx", import.meta.url), "utf8");
    assert.match(words, /textDecorationStyle: "dotted"/);
    assert.doesNotMatch(words, /rgba\(91, 107, 122/);
  });
});
