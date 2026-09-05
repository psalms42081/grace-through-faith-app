import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PathB } from "../constants/colors";
import {
  DEVOTIONS_CORAL_LINKS,
  DEVOTIONS_SECTION_HEADINGS,
  HOME_RHYTHM_ILLUSTRATION,
  SERIES_ROW_ICON,
  VOTW_CARD_TINT,
  VOTW_CATEGORY_HEX,
  VOTW_CATEGORY_TOKEN,
  VOTW_EYEBROW_CONTRAST,
  VOTW_WASH_ON_WHITE,
  contrastRatio,
  resolveSeriesArtKey,
  resolveSeriesRowIconName,
  seriesArtFallback,
} from "../lib/devotions-visual";

function read(rel: string) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}

const preview = read("components/devotions-v2/DevotionsPreview.tsx");
const primitives = read("components/devotions-v2/PreviewPrimitives.tsx");
const colors = read("constants/colors.ts");

describe("Devotions visual pass", () => {
  it("tints Voice of the Week with a live violet wash, not slate, amber, or oat", () => {
    assert.equal(VOTW_CATEGORY_TOKEN, "catPlans");
    assert.equal(VOTW_CATEGORY_HEX, PathB.catPlans);
    assert.equal(PathB.catPlans, "#6E4FB8");
    assert.equal(VOTW_CARD_TINT, "rgba(110, 79, 184, 0.10)");
    assert.equal(VOTW_WASH_ON_WHITE, "#F0EDF8");
    assert.notEqual(VOTW_CATEGORY_HEX, PathB.catBible);
    assert.equal(PathB.catBible, "#5B6B7A");
    assert.doesNotMatch(colors, /sea-?glass/i);
    assert.doesNotMatch(colors, /DFF6F2/);
    assert.match(preview, /VOTW_CARD_TINT/);
    assert.match(preview, /VOTW_CATEGORY_HEX/);
    assert.match(preview, /metaBible/);
    assert.doesNotMatch(preview, /catBible/);
    assert.doesNotMatch(
      preview,
      /votwCard:[\s\S]*?backgroundColor:\s*D2\.amberSoft/,
    );
    assert.ok(
      VOTW_EYEBROW_CONTRAST >= 4.5,
      `eyebrow ${VOTW_CATEGORY_HEX} on wash ${VOTW_WASH_ON_WHITE} must be WCAG AA, got ${VOTW_EYEBROW_CONTRAST.toFixed(2)}:1`,
    );
    assert.ok(contrastRatio(VOTW_CATEGORY_HEX, VOTW_WASH_ON_WHITE) >= 4.5);
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

  it("places Browse the shelf inside the Voice of the Week card", () => {
    const votwFn = preview.match(/function VoiceOfTheWeekCard[\s\S]*?\n\}/);
    assert.ok(votwFn, "VoiceOfTheWeekCard should exist");
    assert.match(votwFn[0], /testID="devotions-preview-browse-shelf"/);
    assert.match(votwFn[0], /align="end"/);
    const betweenCards = preview.match(
      /<VoiceOfTheWeekCard[\s\S]*?testID="devotions-preview-egw-card"/,
    );
    assert.ok(betweenCards, "VOTW should sit above the EGW card");
    assert.doesNotMatch(betweenCards[0], /devotions-preview-browse-shelf/);
  });

  it("places All series and All plans on the section header row", () => {
    assert.match(
      preview,
      /title="Devotional Series"[\s\S]*?trailing=\{[\s\S]*?devotions-preview-all-series/,
    );
    assert.match(
      preview,
      /title="Reading Plans"[\s\S]*?trailing=\{[\s\S]*?devotions-preview-all-plans/,
    );
    assert.match(primitives, /trailing\?:/);
    assert.match(primitives, /sectionHeadingTitleRow/);
    const inspiration = preview.match(/title="Inspiration"[\s\S]*?VoiceOfTheWeekCard/);
    assert.ok(inspiration);
    assert.doesNotMatch(inspiration[0], /allSeries|All series|trailing=/);
    const daily = preview.match(/title="Daily Reading"[\s\S]*?title="Inspiration"/);
    assert.ok(daily);
    assert.doesNotMatch(daily[0], /CoralTextLink|trailing=/);
    const shelf = preview.match(/title="Your Shelf"[\s\S]*?<\/ScrollView>/);
    assert.ok(shelf);
    assert.doesNotMatch(shelf[0], /CoralTextLink|trailing=/);
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

  it("uses category line icons on series list rows, never illustrations", () => {
    assert.equal(
      resolveSeriesRowIconName({ title: "Living in Hope", theme: "hope", category: "foundations" }),
      "Sunrise",
    );
    assert.equal(
      resolveSeriesRowIconName({
        title: "Strength in Weakness",
        theme: "faith,strength",
        category: "foundations",
      }),
      "Anchor",
    );
    assert.equal(resolveSeriesRowIconName({ theme: "hope" }), "Sunrise");
    assert.equal(resolveSeriesRowIconName({ theme: "faith,strength" }), "Anchor");
    assert.equal(resolveSeriesRowIconName({ theme: "peace,comfort" }), "Heart");
    assert.equal(resolveSeriesRowIconName({ theme: "grace,faith" }), "HandHeart");
    assert.equal(resolveSeriesRowIconName({ theme: "prayer" }), "Flame");
    assert.equal(resolveSeriesRowIconName({ theme: "identity" }), "User");
    assert.equal(resolveSeriesRowIconName({ theme: "relationships" }), "Users");
    assert.equal(resolveSeriesRowIconName({ theme: "seasonal" }), "Leaf");
    assert.equal(resolveSeriesRowIconName({ theme: "spiritual-growth" }), "Sprout");
    assert.equal(resolveSeriesRowIconName({ theme: "Prophecy & Fulfillment" }), "Scroll");
    assert.equal(resolveSeriesRowIconName({ title: "The Heavenly Sanctuary" }), "Church");
    assert.equal(resolveSeriesRowIconName({ title: "Death, Sleep, and Resurrection" }), "Sunrise");
    assert.equal(resolveSeriesRowIconName({ category: "prophetic" }), "Scroll");
    assert.equal(resolveSeriesRowIconName({ theme: "Comfort & Encouragement" }), "Heart");
    assert.equal(resolveSeriesRowIconName({ theme: "Faith & Perseverance" }), "Anchor");
    assert.equal(resolveSeriesRowIconName({ theme: "Spiritual Warfare" }), "Sprout");
    assert.equal(resolveSeriesRowIconName({ category: "foundations" }), "BookOpen");
    assert.equal(resolveSeriesRowIconName({ theme: "Core Doctrines" }), "BookOpen");
    assert.equal(resolveSeriesRowIconName({ theme: "Unknown Theme", category: "thematic" }), "BookOpen");
    assert.equal(resolveSeriesRowIconName({}), "BookOpen");
    assert.notEqual(
      resolveSeriesRowIconName({ title: "Living in Hope", category: "foundations" }),
      resolveSeriesRowIconName({ title: "Strength in Weakness", category: "foundations" }),
    );
    assert.equal(SERIES_ROW_ICON.strokeWidth, 1.5);
    assert.equal(SERIES_ROW_ICON.color, "rgba(31, 26, 18, 0.70)");
    assert.match(preview, /resolveSeriesRowIconName/);
    assert.match(preview, /SERIES_ROW_ICONS/);
    assert.match(preview, /SeriesRowDisc/);
    for (const icon of [
      "Sunrise",
      "Anchor",
      "Heart",
      "HandHeart",
      "Flame",
      "User",
      "Users",
      "Leaf",
      "Sprout",
      "Scroll",
      "Church",
      "BookOpen",
    ]) {
      assert.match(preview, new RegExp(`\\b${icon}\\b`), `SERIES_ROW_ICONS must include ${icon}`);
    }
    const seriesBlock = preview.match(/catalogSeries\.map[\s\S]*?More series soon/);
    assert.ok(seriesBlock, "series list block should exist");
    assert.doesNotMatch(seriesBlock[0], /SERIES_ART/);
    assert.doesNotMatch(seriesBlock[0], /<Image/);
    assert.doesNotMatch(seriesBlock[0], /resolveSeriesArtKey/);
    assert.match(seriesBlock[0], /SeriesRowDisc/);
  });

  it("maps series categories to plan illustrations off list rows", () => {
    assert.equal(resolveSeriesArtKey({ theme: "Core Doctrines" }), "doctrine");
    assert.equal(resolveSeriesArtKey({ theme: "Christology" }), "doctrine");
    assert.equal(resolveSeriesArtKey({ theme: "Prophecy & Fulfillment" }), "prophecy");
    assert.equal(resolveSeriesArtKey({ theme: "Character Studies" }), "identity");
    assert.equal(resolveSeriesArtKey({ theme: "Comfort & Encouragement" }), "spiritual-growth");
    assert.equal(resolveSeriesArtKey({ theme: "Kingdom of God" }), "doctrine");
    assert.equal(resolveSeriesArtKey({ theme: "Faith & Perseverance" }), "spiritual-growth");
    assert.equal(resolveSeriesArtKey({ theme: "Spiritual Warfare" }), "spiritual-growth");
    assert.equal(resolveSeriesArtKey({ title: "30 Days of Prayer" }), "prayer");
    assert.equal(resolveSeriesArtKey({ category: "Young Disciples" }), "youth");
    assert.equal(resolveSeriesArtKey({ theme: "Unknown Theme", category: "thematic" }), null);
    assert.deepEqual(seriesArtFallback("thematic"), { tint: "#FFF0D9", ink: PathB.catEGW });
    assert.deepEqual(seriesArtFallback("sabbath"), { tint: "#DFF6F2", ink: PathB.catSabbath });
    assert.match(preview, /resolveSeriesArtKey/);
    assert.match(preview, /seriesArtFallback/);
    assert.match(preview, /s\.seriesTile/);
    assert.match(preview, /s\.libraryArt/);
    assert.match(preview, /s\.seriesDetailArt/);
    const plansGrid = preview.match(/filteredPlans\.map[\s\S]*?Your Shelf/);
    assert.ok(plansGrid, "plans grid should exist");
    assert.match(plansGrid[0], /SERIES_ART/);
    assert.match(plansGrid[0], /<Image/);
    const seriesSheet = preview.match(/function SeriesModal[\s\S]*?function planIdParam/);
    assert.ok(seriesSheet, "series detail modal should exist");
    assert.match(seriesSheet[0], /SERIES_ART/);
    assert.match(seriesSheet[0], /seriesDetailArt/);
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
