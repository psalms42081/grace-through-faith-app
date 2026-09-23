import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const LABEL = new URL("../components/AIGeneratedLabel.tsx", import.meta.url);

function source(rel: string): string {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}

const AI_SURFACES = [
  "app/touchpoint-study.tsx",
  "app/semantic-search.tsx",
  "app/sabbath-school-day-tutor.tsx",
  "app/verse-explain.tsx",
  "app/lesson/[id].tsx",
  "components/reader/ContextPanel.tsx",
  "app/(tabs)/study.tsx",
  "app/passage-context.tsx",
  "components/reader/VerseSheet.tsx",
  "app/verse-map.tsx",
  "app/verse-actions.tsx",
  "app/topic/[id].tsx",
  "components/reader/WordStudySheet.tsx",
  "app/word-study.tsx",
  "components/devotions-v2/DevotionsPreview.tsx",
  "components/devotions-v2/DevotionalDayPreview.tsx",
  "app/study-guide.tsx",
  "app/great-controversy.tsx",
  "app/sabbath-school-discussion.tsx",
  "components/touchpoints/TouchpointPreview.tsx",
] as const;

const HUMAN_SURFACES = [
  "components/devotions-v2/PioneerReading.tsx",
  "components/devotions-v2/OdbDevotionalPreview.tsx",
  "components/devotions-v2/PioneerShelf.tsx",
  "app/(tabs)/sabbath-school-day.tsx",
] as const;

describe("AIGeneratedLabel", () => {
  it("is a muted Canon chip with no icon and the Adventist note", () => {
    const shared = source("components/AIGeneratedLabel.tsx");
    assert.match(shared, /export function AIGeneratedLabel/);
    assert.match(shared, /export function AIAdventistNote/);
    assert.match(shared, /AI-generated/);
    assert.match(
      shared,
      /Answers are shaped by an Adventist understanding of Scripture and may contain errors\. Test them against the Bible\./,
    );
    assert.match(shared, /PathB\.surface/);
    assert.match(shared, /PathB\.inkMuted/);
    assert.doesNotMatch(shared, /Ionicons/);
    assert.doesNotMatch(shared, /sparkles/);
    assert.doesNotMatch(shared, /#E8604C|#C9933A|theme\.accent/);
    readFileSync(LABEL);
  });
});

describe("AI content surfaces use the shared marker", () => {
  for (const file of AI_SURFACES) {
    it(`imports AIGeneratedLabel in ${file}`, () => {
      const text = source(file);
      assert.match(text, /from ["']@\/components\/AIGeneratedLabel["']/);
      assert.match(text, /<AIGeneratedLabel[\s/>]/);
    });
  }

  it("puts the Adventist note under Ask the Bible, Study Tutor, and the sparkle generator", () => {
    for (const file of [
      "app/semantic-search.tsx",
      "app/sabbath-school-day-tutor.tsx",
      "app/touchpoint-topic.tsx",
    ] as const) {
      const text = source(file);
      assert.match(text, /<AIAdventistNote/);
    }
  });
});

describe("human-authored surfaces keep their source and skip the AI chip", () => {
  it("does not import AIGeneratedLabel on pioneer, ODB, or Sabbath School lesson screens", () => {
    for (const file of HUMAN_SURFACES) {
      assert.doesNotMatch(source(file), /AIGeneratedLabel/);
    }
  });

  it("names the human source on those screens", () => {
    assert.match(source("components/devotions-v2/PioneerReading.tsx"), /A note from Informed Ministries/);
    assert.match(source("components/devotions-v2/OdbDevotionalPreview.tsx"), /Our Daily Bread/);
    assert.match(source("components/devotions-v2/PioneerShelf.tsx"), /Public domain/);
    assert.match(
      source("app/(tabs)/sabbath-school-day.tsx"),
      /Official Sabbath School lesson content provided via Adventech/,
    );
    assert.match(source("app/read/[bookId]/[chapter].tsx"), /translation/);
    assert.doesNotMatch(source("app/read/[bookId]/[chapter].tsx"), /AIGeneratedLabel/);
  });

  it("keeps human reading plans unmarked unless isAiGenerated is true", () => {
    const preview = source("components/devotions-v2/DevotionsPreview.tsx");
    assert.match(preview, /isAiGenerated/);
    assert.match(preview, /eyebrow="Informed Ministries"/);
    assert.match(source("lib/devotional-catalog.ts"), /isAiGenerated === true/);
  });
});
