import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  READING_BODY_FONT_SIZE,
  READING_BODY_LINE_HEIGHT,
  READING_CHROME_FONT_CAP,
  READING_FONT_SCALE_KEY,
  READING_FONT_SCALE_STEPS,
  READING_PARAGRAPH_GAP,
  parseReadingFontScale,
  readingSpace,
  readingType,
  systemFontScaleFromProbes,
} from "../lib/reading-font-scale";

describe("reading font scale", () => {
  it("keeps the original steps and doubles the default at the last step", () => {
    assert.deepEqual(READING_FONT_SCALE_STEPS.slice(0, 5), [0.85, 1, 1.15, 1.3, 1.45]);
    assert.equal(READING_FONT_SCALE_STEPS[READING_FONT_SCALE_STEPS.length - 1], 2);
    assert.equal(READING_FONT_SCALE_KEY, "@grace-through-faith/reader-font-scale");
    const biggest = readingType(READING_BODY_FONT_SIZE, READING_BODY_LINE_HEIGHT, 2);
    assert.equal(biggest.fontSize, 36);
    assert.equal(biggest.lineHeight, 64);
    assert.equal(readingSpace(READING_PARAGRAPH_GAP, 2), 20);
    assert.equal(readingType(READING_BODY_FONT_SIZE, READING_BODY_LINE_HEIGHT, 1).fontSize, 18);
  });

  it("accepts a saved original step and ignores a size that was never offered", () => {
    assert.equal(parseReadingFontScale("1.45"), 1.45);
    assert.equal(parseReadingFontScale("2"), 2);
    assert.equal(parseReadingFontScale("1.15"), 1.15);
    assert.equal(parseReadingFontScale("3"), null);
    assert.equal(parseReadingFontScale(null), null);
  });

  it("follows a rem font preference only when px text was left behind", () => {
    assert.equal(systemFontScaleFromProbes(16, 16), 1);
    assert.equal(systemFontScaleFromProbes(20, 20), 1);
    assert.equal(systemFontScaleFromProbes(24, 16), 1.5);
    assert.equal(systemFontScaleFromProbes(16.1, 16), 1);
  });

  it("uses one saved size on every long-form reading screen", () => {
    const reader = readFileSync(new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url), "utf8");
    const prose = readFileSync(new URL("../components/reader/TypographyPreviewProse.tsx", import.meta.url), "utf8");
    const devotion = readFileSync(new URL("../components/devotions-v2/DevotionalDayPreview.tsx", import.meta.url), "utf8");
    const sabbath = readFileSync(new URL("../components/sabbath-school/LessonDayBody.tsx", import.meta.url), "utf8");
    const pioneer = readFileSync(new URL("../components/devotions-v2/PioneerProse.tsx", import.meta.url), "utf8");
    const egw = readFileSync(new URL("../components/devotions-v2/EgwDevotionalPreview.tsx", import.meta.url), "utf8");
    const control = readFileSync(new URL("../components/reader/ReadingSizeControl.tsx", import.meta.url), "utf8");
    for (const source of [devotion, sabbath, pioneer, egw, reader]) {
      assert.match(source, /useReadingFontScale\(\)/);
    }
    assert.match(reader, /<ReadingSizeControl scale=\{readingScale\}/);
    assert.match(prose, /marginBottom: paragraphGap/);
    assert.match(prose, /allowFontScaling=\{false\}/);
    assert.match(control, /minHeight: 56/);
    assert.match(control, /minHeight: 48/);
    assert.match(control, /Smaller text/);
    assert.match(control, /Larger text/);
    assert.match(reader, /maxFontSizeMultiplier=\{READING_CHROME_FONT_CAP\}/);
    assert.equal(READING_CHROME_FONT_CAP, 1.3);
    assert.match(reader, /flexWrap: "wrap"/);
  });
});
