import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import {
  assertReflectionReadingAlignment,
  formatGreeting,
  getHomeLocalDay,
  getTodaysReflection,
  parseBibleReference,
} from "../components/home-v2/home-data";
import {
  SIGNPOST_SHARE_ORIGIN,
  buildHeroShareMessage,
  buildSignpostTopicUrl,
} from "../components/home-v2/hero-share";
import { contrastRatio } from "../lib/devotions-visual";
import {
  HERO_ART_ASPECT,
  HERO_ART_RATIO,
  HERO_ART_RATIO_NARROW,
  HERO_TEXT_COL_MIN_RATIO,
  HERO_TEXT_COL_RATIO,
  HERO_VERSE_ILLUSTRATION_LIST,
  heroArtRatioForWidth,
  heroIllustrationForDay,
} from "../lib/home-hero-illustration";

/** Intrinsic size straight out of the PNG IHDR chunk — no image deps. */
function pngSize(path: URL): { width: number; height: number } {
  const buf = readFileSync(path);
  assert.equal(buf.subarray(1, 4).toString("ascii"), "PNG", `${path} is not a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const originalTimeZone = process.env.TZ;

before(() => {
  process.env.TZ = "Australia/Melbourne";
});

after(() => {
  process.env.TZ = originalTimeZone;
});

describe("Home hero coherence", () => {
  it("uses the Melbourne-local morning across the UTC boundary", () => {
    const localDay = getHomeLocalDay(
      new Date("2026-08-25T23:58:00.000Z"),
    );

    assert.equal(localDay.dateKey, "2026-08-26");
    assert.equal(localDay.daypart, "morning");
    assert.equal(localDay.dayLabel, "Wednesday");
    assert.match(localDay.dateLine, /^Wednesday\b/);
    assert.equal(getTodaysReflection(localDay.dayIndex).reference.length > 0, true);
  });

  it("renders a clean greeting when a name is absent or placeholder punctuation", () => {
    assert.equal(formatGreeting("Good morning", null), "Good morning.");
    assert.equal(formatGreeting("Good morning", ""), "Good morning.");
    assert.equal(formatGreeting("Good morning", "..."), "Good morning.");
    assert.equal(formatGreeting("Good morning", "  Joe Example  "), "Good morning, Joe");
  });

  it("parses multi-word reflection references and fails loudly on CTA drift", () => {
    assert.deepEqual(parseBibleReference("2 Corinthians 3:18"), {
      bookName: "2 Corinthians",
      chapterNumber: 3,
    });
    assert.doesNotThrow(() =>
      assertReflectionReadingAlignment("Ephesians 2:8-9", {
        reference: "Ephesians 2:8-9",
        bookName: "Ephesians",
        chapterNumber: 2,
      }),
    );
    assert.throws(
      () =>
        assertReflectionReadingAlignment("Ephesians 2:8-9", {
          reference: "Ephesians 2:8-9",
          bookName: "John",
          chapterNumber: 3,
        }),
      /Home reflection\/reading mismatch/,
    );
  });
});

describe("Home hero share payload", () => {
  const verse = {
    text: "For God so loved the world",
    reference: "John 3:16",
  };
  const signpost = {
    id: "hope",
    title: "Hope",
    description: "Hold fast to the promise that God is already at work.",
  };
  const reflection = {
    thought: "Grace is not a doctrine to be memorised.",
    reference: "Ephesians 2:8-9",
  };

  it("shares verse of the day from the verse tab", () => {
    assert.equal(
      buildHeroShareMessage({ tab: "verse", verse, signpost, reflection }),
      `\u201C${verse.text}\u201D\n\u2014 ${verse.reference}`,
    );
  });

  it("shares reflection text from the reflection tab", () => {
    assert.equal(
      buildHeroShareMessage({ tab: "reflection", verse, signpost, reflection }),
      `${reflection.thought}\n\u2014 Reflection on ${reflection.reference}`,
    );
  });

  it("shares signpost title, body, and topic link from the signpost tab", () => {
    const message = buildHeroShareMessage({
      tab: "signpost",
      verse,
      signpost,
      reflection,
    });
    const topicUrl = buildSignpostTopicUrl("hope", SIGNPOST_SHARE_ORIGIN);

    assert.equal(
      message,
      `${signpost.title}\n\n${signpost.description}\n\n${topicUrl}`,
    );
    assert.doesNotMatch(message, /John 3:16/);
    assert.doesNotMatch(message, /For God so loved the world/);
  });

  it("uses the selected-tab helper from the Home hero share button", () => {
    const heroSource = readFileSync(
      new URL("../components/home-v2/HeroCard.tsx", import.meta.url),
      "utf8",
    );
    assert.match(heroSource, /buildHeroShareMessage/);
    assert.match(heroSource, /tab:\s*activeTab/);
  });
});

describe("Home hero verse illustrations", () => {
  it("rotates a fixed verse-card list by day-of-year with distinct tab assets", () => {
    assert.deepEqual(
      HERO_VERSE_ILLUSTRATION_LIST.map((item) => item.label),
      ["lamp", "candle", "sunburst", "olive branch", "path"],
    );
    const verse = heroIllustrationForDay(248, "verse");
    const signpost = heroIllustrationForDay(248, "signpost");
    const reflection = heroIllustrationForDay(248, "reflection");
    assert.notEqual(verse.id, signpost.id);
    assert.notEqual(verse.id, reflection.id);
    assert.notEqual(signpost.id, reflection.id);
    assert.equal(heroIllustrationForDay(248, "verse").id, verse.id);
    assert.notEqual(heroIllustrationForDay(249, "verse").id, verse.id);
  });

  // The three tabs use consecutive offsets, so they only stay distinct while the
  // list holds at least three entries. Dropping the list to two would silently
  // repeat an asset across tabs; this pins the invariant for a whole year.
  it("shows three different assets on every tab for every day of the year", () => {
    assert.ok(
      HERO_VERSE_ILLUSTRATION_LIST.length >= 3,
      "consecutive tab offsets need at least three entries",
    );
    for (let dayIndex = 0; dayIndex <= 365; dayIndex++) {
      const ids = new Set(
        (["verse", "signpost", "reflection"] as const).map(
          (tab) => heroIllustrationForDay(dayIndex, tab).id,
        ),
      );
      assert.equal(ids.size, 3, `day ${dayIndex} repeats an asset: ${[...ids].join(", ")}`);
    }
  });

  it("normalises out-of-range and negative day indexes onto the same rotation", () => {
    const n = HERO_VERSE_ILLUSTRATION_LIST.length;
    for (const tab of ["verse", "signpost", "reflection"] as const) {
      for (let dayIndex = -400; dayIndex <= 400; dayIndex++) {
        const picked = heroIllustrationForDay(dayIndex, tab);
        assert.ok(
          HERO_VERSE_ILLUSTRATION_LIST.some((item) => item.id === picked.id),
          `day ${dayIndex} (${tab}) fell outside the list`,
        );
        assert.equal(
          picked.id,
          heroIllustrationForDay(dayIndex + n, tab).id,
          `day ${dayIndex} (${tab}) is not stable across a full list cycle`,
        );
      }
      // Negative indexes must also keep the three tabs distinct.
      const ids = new Set(
        (["verse", "signpost", "reflection"] as const).map(
          (t) => heroIllustrationForDay(-7, t).id,
        ),
      );
      assert.equal(ids.size, 3);
    }
  });

  it("keeps HERO_ART ids in sync with the rotation list", () => {
    const hero = readFileSync(
      new URL("../components/home-v2/HeroCard.tsx", import.meta.url),
      "utf8",
    );
    const map = hero.slice(hero.indexOf("const HERO_ART"));
    const block = map.slice(0, map.indexOf("};") + 2);
    for (const item of HERO_VERSE_ILLUSTRATION_LIST) {
      assert.ok(block.includes(`${item.id}:`), `HERO_ART is missing ${item.id}`);
      assert.ok(block.includes(item.file), `HERO_ART is missing ${item.file}`);
    }
    const entries = block.match(/require\(/g) ?? [];
    assert.equal(
      entries.length,
      HERO_VERSE_ILLUSTRATION_LIST.length,
      "HERO_ART has entries the rotation list does not declare",
    );
    // The coral headphones were pulled from the rotation as an off-theme media
    // motif; the asset stays on disk but must not come back into the hero.
    assert.doesNotMatch(hero, /rhythm-listen/);
  });

  it("keeps verse ink readable on cream/white (WCAG AA)", () => {
    assert.ok(contrastRatio("#1F1A12", "#FFFFFF") >= 4.5);
    assert.ok(contrastRatio("#1F1A12", "#FBF7EE") >= 4.5);
    assert.ok(contrastRatio("#6B6660", "#FFFFFF") >= 4.5);
  });

  it("places the illustration only on the Home hero card", () => {
    const hero = readFileSync(new URL("../components/home-v2/HeroCard.tsx", import.meta.url), "utf8");
    const ss = readFileSync(new URL("../components/home-v2/SSGradientCard.tsx", import.meta.url), "utf8");
    const rhythm = readFileSync(new URL("../components/home-v2/DailyRhythm.tsx", import.meta.url), "utf8");
    const groups = readFileSync(new URL("../components/home-v2/HomeBibleGroupCard.tsx", import.meta.url), "utf8");
    assert.match(hero, /heroIllustrationForDay/);
    assert.match(hero, /s\.art\b/);
    assert.doesNotMatch(ss, /heroIllustrationForDay/);
    assert.doesNotMatch(rhythm, /heroIllustrationForDay/);
    assert.doesNotMatch(groups, /heroIllustrationForDay/);
  });

  it("lays out top-right art beside a 62% text column with no fade overlay", () => {
    const hero = readFileSync(new URL("../components/home-v2/HeroCard.tsx", import.meta.url), "utf8");
    assert.equal(HERO_TEXT_COL_RATIO, 0.62);
    assert.ok(HERO_TEXT_COL_RATIO >= HERO_TEXT_COL_MIN_RATIO);
    assert.equal(HERO_ART_RATIO, 0.32);
    assert.equal(HERO_ART_RATIO_NARROW, 0.26);
    assert.equal(heroArtRatioForWidth(390), HERO_ART_RATIO_NARROW);
    assert.equal(heroArtRatioForWidth(350), HERO_ART_RATIO_NARROW);
    assert.equal(heroArtRatioForWidth(700), HERO_ART_RATIO);
    assert.match(hero, /heroArtRatioForWidth/);
    assert.match(hero, /HERO_TEXT_COL_RATIO/);
    assert.match(hero, /contentRow/);
    assert.match(hero, /flexDirection:\s*"row"/);
    assert.match(hero, /alignItems:\s*"flex-start"/);
    assert.match(hero, /resizeMode="contain"/);
    assert.doesNotMatch(hero, /LinearGradient/);
    assert.doesNotMatch(hero, /expo-linear-gradient/);
    assert.doesNotMatch(hero, /0\.38/);
  });

  it("keeps actions as a sibling below the art with no absolute bottom art", () => {
    const hero = readFileSync(new URL("../components/home-v2/HeroCard.tsx", import.meta.url), "utf8");
    const contentIdx = hero.indexOf("style={s.contentRow}");
    const artIdx = hero.indexOf("style={[s.art, { width: artWidth, height: artHeight }]}");
    const contentClose = hero.indexOf("</View>", artIdx);
    const actionsIdx = hero.indexOf("style={s.actions}");
    assert.ok(contentIdx > 0, "contentRow missing");
    assert.ok(artIdx > contentIdx, "art must be inside contentRow");
    assert.ok(actionsIdx > contentClose && actionsIdx > artIdx, "actions must follow the art container");
    assert.doesNotMatch(hero, /position:\s*["']absolute["']/);
    assert.doesNotMatch(hero, /absoluteFill/);
    assert.doesNotMatch(hero, /bottom:\s*-?\d+/);
    assert.doesNotMatch(hero, /right:\s*-?\d+/);
    const afterActions = hero.slice(actionsIdx);
    assert.doesNotMatch(afterActions, /<Image\b/);
  });

  // Regression: the art column rendered empty on react-native-web because
  // `width: "100%"` + `aspectRatio: 1` on <Image> left the intrinsic 1024px
  // height in place (measured <img> box was 91x1024 inside a 91x91 clipped
  // parent), so `contain` centred the art ~466px below the visible window.
  it("sizes the hero art in explicit pixels, never percentage + aspectRatio", () => {
    const hero = readFileSync(
      new URL("../components/home-v2/HeroCard.tsx", import.meta.url),
      "utf8",
    );

    assert.match(hero, /const artWidth = Math\.round\(measuredWidth \* artRatio\)/);
    assert.match(hero, /const artHeight = artPixelHeight\(artWidth\)/);
    assert.match(hero, /style=\{\{ width: artWidth, height: artHeight \}\}/);
    // No style may set aspectRatio, and the old percentage-sized image is gone.
    assert.doesNotMatch(hero, /aspectRatio:/);
    assert.doesNotMatch(hero, /artImage/);

    // The art container itself must not clip or percentage-size the art.
    const artStyle = hero.slice(hero.indexOf("  art: {"));
    const artBlock = artStyle.slice(0, artStyle.indexOf("},") + 1);
    assert.ok(artBlock.includes('marginLeft: "auto"'), "art must stay right-aligned");
    assert.doesNotMatch(artBlock, /overflow/);
    assert.doesNotMatch(artBlock, /%/);
  });

  it("keeps every rotation asset square so HERO_ART_ASPECT stays honest", () => {
    assert.equal(HERO_ART_ASPECT, 1);
    for (const item of HERO_VERSE_ILLUSTRATION_LIST) {
      const { width, height } = pngSize(
        new URL(`../assets/illustrations/${item.file}`, import.meta.url),
      );
      assert.ok(width > 0 && height > 0, `${item.file} has no intrinsic size`);
      assert.equal(
        height / width,
        HERO_ART_ASPECT,
        `${item.file} is ${width}x${height}; HERO_ART_ASPECT assumes 1:1`,
      );
    }
  });
});