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
  it("adds Inspiration after Daily Reading and keeps EGW there", () => {
    const source = readFileSync(files[0], "utf8");
    assert.match(source, /title="Inspiration"/);
    assert.match(source, /testID="devotions-preview-votw-card"/);
    assert.match(source, /testID="devotions-preview-egw-card"/);
    assert.match(
      source,
      /<SectionHeading\s+title="Daily Reading"\s+subtitle="A short pause for the day"\s+testID="devotions-preview-daily-section"/,
    );
    assert.doesNotMatch(source, /title="Daily Readings"/);
    const dailyBlock = source.match(
      /<View style=\{s\.dailySection\}>[\s\S]*?<\/View>\s*\n\s*<SectionHeading\s+title="Inspiration"/,
    );
    assert.ok(dailyBlock, "Daily Reading heading and ODB card should share a section above Inspiration");
    assert.match(dailyBlock[0], /<SectionHeading[\s\S]*title="Daily Reading"/);
    assert.match(dailyBlock[0], /testID="devotions-preview-odb-card"/);
    assert.ok(
      dailyBlock[0].indexOf('title="Daily Reading"') < dailyBlock[0].indexOf('testID="devotions-preview-odb-card"'),
      "Daily Reading heading must render above the ODB card, not inside it",
    );
    const odbCard = dailyBlock[0].match(/testID="devotions-preview-odb-card"[\s\S]*?<\/Pressable>/);
    assert.ok(odbCard);
    assert.doesNotMatch(odbCard[0], /Daily Reading/);
    const inspirationAt = source.indexOf('title="Inspiration"');
    const dailyAt = source.indexOf('title="Daily Reading"');
    const egwAt = source.indexOf('testID="devotions-preview-egw-card"');
    assert.ok(dailyAt > 0 && inspirationAt > dailyAt);
    assert.ok(egwAt > inspirationAt);
    assert.doesNotMatch(source, /devotions-preview-votw-public-domain/);
    assert.doesNotMatch(source, /votwDomain/);
    const between = source.slice(
      source.indexOf("VoiceOfTheWeekCard"),
      egwAt,
    );
    assert.doesNotMatch(between, /publicDomain/);
  });

  it("lets the full-width ODB card size to its content", () => {
    const source = readFileSync(files[0], "utf8");
    const card = source.match(/dailyCard:\s*\{[\s\S]*?\n  \},/);
    assert.ok(card, "dailyCard style should exist");
    assert.doesNotMatch(card[0], /\b(height|minHeight|maxHeight)\s*:/);
    assert.doesNotMatch(card[0], /flex:\s*1/);
    assert.doesNotMatch(source, /dailyCardFull|dailyRow/);
    assert.match(source, /testID="odb-afternoon-hint"/);
    const section = source.match(/dailySection:\s*\{[\s\S]*?\n  \},/);
    assert.ok(section, "dailySection style should exist");
    assert.doesNotMatch(section[0], /\b(height|minHeight|maxHeight)\s*:/);
    assert.doesNotMatch(section[0], /flex:\s*1/);
  });

  it("keeps Lora section titles from collapsing to zero height", () => {
    const primitives = readFileSync(
      new URL("../components/devotions-v2/PreviewPrimitives.tsx", import.meta.url),
      "utf8",
    );
    assert.match(primitives, /sectionTitle:\s*\{[\s\S]*lineHeight:\s*28/);
    assert.match(primitives, /sectionHeading:\s*\{[\s\S]*flexShrink:\s*0/);
    assert.match(primitives, /width:\s*"100%"/);
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
    assert.match(shelf, /PIONEER_SHELF_PUBLIC_DOMAIN/);
    assert.doesNotMatch(shelf, /firstPublicDomain/);
    assert.match(shelf, /displayPioneerChapterTitle/);
    assert.match(reading, /displayPioneerChapterTitle/);
    assert.match(chapter, /displayPioneerChapterTitle/);
    assert.match(reading, /A note from Informed Ministries/);
    assert.match(reading, /Read the whole book/);
  });
});
