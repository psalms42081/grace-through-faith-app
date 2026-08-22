import assert from "node:assert/strict";
import test from "node:test";
import { extractMemoryText } from "../lib/sabbath-school-memory-text";

test("extracts an Adventech HTML Memory Text block without changing other content", () => {
  const content = [
    "<p>Introduction to the lesson.</p>",
    "<blockquote><p>Memory Text:</p> “Trust in the Lord with all thine heart.” (<a href='#'>Proverbs 3:5, KJV</a>).</blockquote>",
    "<p>Continue reading this study section.</p>",
  ].join("\n");

  const result = extractMemoryText(content);

  assert.deepEqual(result.memoryText, {
    verse: "“Trust in the Lord with all thine heart.”",
    reference: "Proverbs 3:5, KJV",
  });
  assert.match(result.remainingContent, /Introduction to the lesson/);
  assert.match(result.remainingContent, /Continue reading this study section/);
  assert.doesNotMatch(result.remainingContent, /Memory Text:/i);
});

test("extracts a Markdown Memory Text block and leaves ordinary quotes alone", () => {
  const content = [
    "> “Ordinary lesson quotation.”",
    "",
    "> Memory Text:",
    "> “God is love.” (1 John 4:8, NKJV).",
    "",
    "## Apply the lesson",
  ].join("\n");

  const result = extractMemoryText(content);

  assert.deepEqual(result.memoryText, {
    verse: "“God is love.”",
    reference: "1 John 4:8, NKJV",
  });
  assert.match(result.remainingContent, /Ordinary lesson quotation/);
  assert.match(result.remainingContent, /Apply the lesson/);
  assert.doesNotMatch(result.remainingContent, /God is love/);
});

test("preserves unrecognized source content unchanged", () => {
  const content = "<blockquote><p>A thoughtful lesson quotation.</p></blockquote>";

  assert.deepEqual(extractMemoryText(content), {
    memoryText: null,
    remainingContent: content,
  });
});