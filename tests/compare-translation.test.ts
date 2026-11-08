import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { comparisonTranslation, defaultComparisonTranslation } from "../lib/compare-translation";

const reader = readFileSync(path.join(__dirname, "../app/read/[bookId]/[chapter].tsx"), "utf8");

describe("comparison translation", () => {
  it("defaults to KJV, and to NIV while reading KJV", () => {
    assert.equal(defaultComparisonTranslation("NET"), "KJV");
    assert.equal(defaultComparisonTranslation("NASB"), "KJV");
    assert.equal(defaultComparisonTranslation("YV2165"), "KJV");
    assert.equal(defaultComparisonTranslation("KJV"), "NIV");
    assert.equal(comparisonTranslation("NET", null), "KJV");
    assert.equal(comparisonTranslation("NET", ""), "KJV");
    assert.equal(comparisonTranslation("KJV", null), "NIV");
    assert.equal(comparisonTranslation("KJV", undefined), "NIV");
  });

  it("keeps a saved choice, and falls back for that chapter when it matches the reading version", () => {
    assert.equal(comparisonTranslation("NET", "NASB"), "NASB");
    assert.equal(comparisonTranslation("KJV", "ASV"), "ASV");
    assert.equal(comparisonTranslation("NASB", "NASB"), "KJV");
    assert.equal(comparisonTranslation("KJV", "KJV"), "NIV");
    assert.equal(comparisonTranslation("NIV", "NIV"), "KJV");
  });

  it("reads the device choice and does not write the fallback back", () => {
    assert.doesNotMatch(reader, /useState\("ASV"\)/);
    assert.match(reader, /comparisonTranslation\(translation, savedSplitTranslation\)/);
    assert.match(reader, /AsyncStorage\.setItem\(SPLIT_TRANSLATION_KEY, t\)/);
    const fallback = readFileSync(path.join(__dirname, "../lib/compare-translation.ts"), "utf8");
    assert.doesNotMatch(fallback, /AsyncStorage/);
  });

  it("keeps the side-by-side panes sharing the row and parks listen in the reading column", () => {
    assert.match(reader, /splitPanePrimary:\s*\{[^}]*flex:\s*1[^}]*minWidth:\s*0/s);
    assert.match(reader, /splitPaneSide:\s*\{[^}]*flex:\s*1[^}]*minWidth:\s*0/s);
    assert.match(reader, /splitMode && isSideBySide && styles\.previewFloatingRowPrimary/);
    assert.match(reader, /previewFloatingRowPrimary:\s*\{[^}]*right:\s*"50%"/s);
  });
});
