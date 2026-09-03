import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const files = [
  new URL("../components/devotions-v2/DevotionsPreview.tsx", import.meta.url),
  new URL("../components/devotions-v2/PioneerReading.tsx", import.meta.url),
  new URL("../components/devotions-v2/PioneerShelf.tsx", import.meta.url),
  new URL("../components/devotions-v2/PioneerChapter.tsx", import.meta.url),
  new URL("../server/routes/pioneers.ts", import.meta.url),
  new URL("../server/services/pioneerService.ts", import.meta.url),
];

describe("Pioneer writings surfaces stay source-only", () => {
  it("adds Inspiration after Daily Readings and keeps EGW there", () => {
    const source = readFileSync(files[0], "utf8");
    assert.match(source, /title="Inspiration"/);
    assert.match(source, /testID="devotions-preview-votw-card"/);
    assert.match(source, /testID="devotions-preview-egw-card"/);
    assert.match(source, /title="Daily Readings"/);
    const inspirationAt = source.indexOf('title="Inspiration"');
    const dailyAt = source.indexOf('title="Daily Readings"');
    const egwAt = source.indexOf('testID="devotions-preview-egw-card"');
    assert.ok(dailyAt > 0 && inspirationAt > dailyAt);
    assert.ok(egwAt > inspirationAt);
  });

  it("does not introduce AI copy, sparkles, or generated summaries", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(source, /sparkle/i);
      assert.doesNotMatch(source, /AI-generated/i);
      assert.doesNotMatch(source, /generated summary/i);
      assert.doesNotMatch(source, /openai|anthropic|chatgpt/i);
    }
  });

  it("labels every pioneer screen as public domain", () => {
    const reading = readFileSync(files[1], "utf8");
    const shelf = readFileSync(files[2], "utf8");
    const chapter = readFileSync(files[3], "utf8");
    assert.match(reading, /PublicDomainLine/);
    assert.match(shelf, /PublicDomainLine/);
    assert.match(chapter, /PublicDomainLine/);
    assert.match(reading, /A note from Informed Ministries/);
    assert.match(reading, /Read the whole book/);
  });
});
