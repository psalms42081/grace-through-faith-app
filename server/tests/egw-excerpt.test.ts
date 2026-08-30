import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EGW_EXCERPT_MAX_CHARS,
  excerptEgwParagraphs,
} from "../services/egwService";

describe("EGW Today excerpt stays on paragraph and sentence boundaries", () => {
  it("returns the full chapter when it fits the card length", () => {
    const text = excerptEgwParagraphs([
      "God is love.",
      "His nature, His law, is love.",
    ]);
    assert.equal(text, "God is love.\n\nHis nature, His law, is love.");
    assert.ok(text.length < EGW_EXCERPT_MAX_CHARS);
  });

  it("stops at a paragraph boundary instead of mid-paragraph", () => {
    const first = "A".repeat(400) + ".";
    const second = "B".repeat(400) + ".";
    const text = excerptEgwParagraphs([first, second]);
    assert.equal(text, first);
    assert.ok(!text.includes("B"));
  });

  it("never cuts the first long paragraph mid-sentence", () => {
    const sentence = "The Saviour's life on earth was a life of loving ministry. ";
    const paragraph = sentence.repeat(20).trim();
    assert.ok(paragraph.length > EGW_EXCERPT_MAX_CHARS);
    const text = excerptEgwParagraphs([paragraph]);
    assert.ok(text.length <= EGW_EXCERPT_MAX_CHARS);
    assert.match(text, /[.!?]$/);
    assert.ok(sentence.trim().startsWith(text.slice(0, 20)));
    assert.equal(text.includes(sentence.trim().slice(0, 10)), true);
    const nextChar = paragraph[text.length];
    assert.ok(nextChar === undefined || nextChar === " " || /[.!?]/.test(text.slice(-1)));
  });
});
