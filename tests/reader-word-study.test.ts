import assert from "node:assert/strict";
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
});
