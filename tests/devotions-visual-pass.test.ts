import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PathB } from "../constants/colors";
import {
  DEVOTIONS_CORAL_LINKS,
  DEVOTIONS_SECTION_HEADINGS,
  HOME_RHYTHM_ILLUSTRATION,
  VOTW_CATEGORY_HEX,
  VOTW_CATEGORY_TOKEN,
  resolveSeriesArtKey,
  seriesArtFallback,
} from "../lib/devotions-visual";

function read(rel: string) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}

const preview = read("components/devotions-v2/DevotionsPreview.tsx");
const primitives = read("components/devotions-v2/PreviewPrimitives.tsx");

describe("Devotions visual pass", () => {
  it("tints Voice of the Week with PathB.catBible, not amber or oat", () => {
    assert.equal(VOTW_CATEGORY_TOKEN, "catBible");
    assert.equal(VOTW_CATEGORY_HEX, PathB.catBible);
    assert.equal(PathB.catBible, "#5B6B7A");
    assert.match(preview, /VOTW_CARD_TINT/);
    assert.match(preview, /VOTW_CATEGORY_HEX/);
    assert.match(preview, /metaBible/);
    assert.doesNotMatch(
      preview,
      /votwCard:[\s\S]*?backgroundColor:\s*D2\.amberSoft/,
    );
  });

  it("shows a pioneer portrait when a reading is published, else the bookshelf disc", () => {
    assert.match(preview, /getPioneerPortrait\(reading\.chapter\.authorSlug\)/);
    assert.match(preview, /portrait \? \(/);
    assert.match(preview, /name="library-outline"/);
    assert.match(preview, /style=\{s\.votwPortrait\}/);
    assert.match(preview, /s\.votwPortraitFallback/);
  });

  it("keeps coral text links without button chrome", () => {
    assert.equal(DEVOTIONS_CORAL_LINKS.browseShelf.label, "Browse the shelf");
    assert.equal(DEVOTIONS_CORAL_LINKS.browseShelf.href, "/pioneer-shelf");
    assert.equal(DEVOTIONS_CORAL_LINKS.allSeries.label, "All series");
    assert.equal(DEVOTIONS_CORAL_LINKS.allSeries.href, "/devotionals");
    assert.equal(DEVOTIONS_CORAL_LINKS.allPlans.label, "All plans");
    assert.equal(DEVOTIONS_CORAL_LINKS.allPlans.href, "/plans");
    assert.match(preview, /testID="devotions-preview-browse-shelf"/);
    assert.match(preview, /testID="devotions-preview-all-series"/);
    assert.match(preview, /testID="devotions-preview-all-plans"/);
    const coralLink = primitives.match(/coralLink:\s*\{[\s\S]*?\n  \},/);
    assert.ok(coralLink, "coralLink style should exist");
    assert.match(primitives, /coralLinkText:[\s\S]*color:\s*D2\.coral/);
    assert.doesNotMatch(coralLink[0], /backgroundColor/);
    assert.doesNotMatch(coralLink[0], /borderWidth/);
  });

  it("keeps Lora/Inter section headings for every Devotions section", () => {
    for (const section of DEVOTIONS_SECTION_HEADINGS) {
      assert.match(
        preview,
        new RegExp(
          `<SectionHeading\\s+title="${section.title}"\\s+subtitle="${section.subtitle}"`,
        ),
      );
    }
    assert.match(primitives, /sectionTitle:[\s\S]*fontFamily:\s*F\.loraSemi/);
    assert.match(primitives, /sectionSub:[\s\S]*fontFamily:\s*F\.inter/);
  });

  it("maps series categories to plan illustrations and falls back to a tinted disc", () => {
    assert.equal(resolveSeriesArtKey({ theme: "Core Doctrines" }), "doctrine");
    assert.equal(resolveSeriesArtKey({ theme: "Christology" }), "doctrine");
    assert.equal(resolveSeriesArtKey({ theme: "Prophecy & Fulfillment" }), "prophecy");
    assert.equal(resolveSeriesArtKey({ theme: "Character Studies" }), "identity");
    assert.equal(resolveSeriesArtKey({ theme: "Comfort & Encouragement" }), "spiritual-growth");
    assert.equal(resolveSeriesArtKey({ theme: "Kingdom of God" }), "doctrine");
    assert.equal(resolveSeriesArtKey({ theme: "Faith & Perseverance" }), "spiritual-growth");
    assert.equal(resolveSeriesArtKey({ theme: "Spiritual Warfare" }), "spiritual-growth");
    assert.equal(resolveSeriesArtKey({ title: "30 Days of Prayer" }), "prayer");
    assert.equal(resolveSeriesArtKey({ theme: "Unknown Theme", category: "thematic" }), null);
    assert.deepEqual(seriesArtFallback("thematic"), { tint: "#FFF0D9", ink: PathB.catEGW });
    assert.deepEqual(seriesArtFallback("sabbath"), { tint: "#DFF6F2", ink: PathB.catSabbath });
    assert.match(preview, /resolveSeriesArtKey/);
    assert.match(preview, /seriesArtFallback/);
    assert.match(preview, /s\.seriesTile/);
    const seriesBlock = preview.match(/catalogSeries\.map[\s\S]*?More series soon/);
    assert.ok(seriesBlock, "series list block should exist");
    assert.doesNotMatch(seriesBlock[0], /library-outline/);
  });

  it("places the reflection candle at Home rhythm scale on Begin with today", () => {
    assert.equal(HOME_RHYTHM_ILLUSTRATION.disc, 44);
    assert.equal(HOME_RHYTHM_ILLUSTRATION.image, 28);
    assert.match(preview, /rhythm-reflection\.png/);
    assert.match(preview, /illustration=\{BEGIN_TODAY_CANDLE\}/);
    assert.match(primitives, /emptyRhythmDisc:[\s\S]*width:\s*44/);
    assert.match(primitives, /emptyRhythmImg:[\s\S]*width:\s*28/);
  });
});
