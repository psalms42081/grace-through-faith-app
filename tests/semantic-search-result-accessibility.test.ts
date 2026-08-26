import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(
  new URL("../app/semantic-search.tsx", import.meta.url),
  "utf8",
);

describe("Ask the Bible result accessibility", () => {
  it("keeps the full AI relevance explanation readable", () => {
    const relevanceBlock = source.match(
      /<Text\s+style=\{\[styles\.relevanceText[\s\S]*?>[\s\S]*?\{item\.relevance\}[\s\S]*?<\/Text>/,
    )?.[0];

    assert.ok(relevanceBlock, "expected the relevance explanation to render");
    assert.doesNotMatch(relevanceBlock, /numberOfLines|lineClamp/);
  });

  it("uses a separate passage action instead of making the explanation navigate", () => {
    assert.match(source, /<View[\s\S]*?styles\.verseCard/);
    assert.match(source, />\s*Read passage\s*</);
    assert.match(
      source,
      /accessibilityLabel=\{`Read \$\{item\.reference\} in the Bible`\}/,
    );
    assert.match(
      source,
      /onPress=\{\(\) => navigateToVerse\(item\.bookId, item\.chapter, item\.translation\)\}/,
    );
    assert.doesNotMatch(
      source,
      /<Pressable[\s\S]{0,300}?styles\.verseCard/,
    );
  });
});