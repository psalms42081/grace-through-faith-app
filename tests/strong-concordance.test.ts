import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildConcordanceSnippet,
  concordanceHeading,
  formatBookBreakdown,
  snippetVisibleText,
} from "../lib/strong-concordance";

const GEN_3_22 =
  "And the LORD God said, Behold, the man is become as one of us, to know good and evil: and now, lest he put forth his hand, and take also of the tree of life, and eat, and live for ever:";

describe("concordanceHeading", () => {
  it("joins id, lemma, transliteration, and KJV use count", () => {
    assert.equal(
      concordanceHeading("H7462", "רָעָה", "rāʿâ", 173),
      "H7462 · רָעָה · rāʿâ — 173 uses in the KJV",
    );
  });
});

describe("formatBookBreakdown", () => {
  it("renders per-book counts for the filter row", () => {
    assert.equal(
      formatBookBreakdown([
        { bookId: 1, bookName: "Genesis", count: 12 },
        { bookId: 19, bookName: "Psalms", count: 9 },
      ]),
      "Genesis 12 · Psalms 9",
    );
  });
});

describe("buildConcordanceSnippet", () => {
  it("windows Genesis 3:22 so H5769 'for ever' stays visible and bold", () => {
    const snippet = buildConcordanceSnippet(GEN_3_22, ["ever"]);
    const visible = snippetVisibleText(snippet);
    assert.match(visible, /tree of life, and eat, and live for ever/);
    assert.equal(snippet.leadingEllipsis, true);
    const bold = snippet.parts.filter((part) => part.bold).map((part) => part.text).join("");
    assert.match(bold, /for ever/i);
    assert.doesNotMatch(visible, /Behold, the man is become/);
  });

  it("bolds both occurrences when the number appears twice", () => {
    const text = "The LORD is good: the LORD is my strength.";
    const snippet = buildConcordanceSnippet(text, ["LORD", "LORD"], 200);
    const bold = snippet.parts.filter((part) => part.bold).map((part) => part.text);
    assert.deepEqual(bold, ["LORD", "LORD"]);
  });
});
