import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getSabbathSchoolQuarterTheme,
  sabbathSchoolSplashScrim,
  SABBATH_SCHOOL_FALLBACK_COLOR,
  SABBATH_SCHOOL_PENDING_SURFACE,
} from "../lib/sabbath-school-quarter-theme";
import { readFileSync } from "node:fs";

const cardSource = readFileSync(
  new URL("../components/home-v2/SSGradientCard.tsx", import.meta.url),
  "utf8",
);

describe("Sabbath School quarterly color theme", () => {
  it("uses the canonical teal when the feed has no usable color", () => {
    assert.equal(
      getSabbathSchoolQuarterTheme(null).primary,
      SABBATH_SCHOOL_FALLBACK_COLOR,
    );
    assert.equal(
      getSabbathSchoolQuarterTheme("purple").primary,
      SABBATH_SCHOOL_FALLBACK_COLOR,
    );
  });

  it("Home SS card paints a dark surface before the quarterly color arrives", () => {
    assert.match(cardSource, /SABBATH_SCHOOL_PENDING_SURFACE/);
    assert.match(cardSource, /quarterColor \|\| SABBATH_SCHOOL_PENDING_SURFACE/);
    assert.equal(SABBATH_SCHOOL_PENDING_SURFACE, "#1F1A12");
    assert.notEqual(SABBATH_SCHOOL_PENDING_SURFACE, SABBATH_SCHOOL_FALLBACK_COLOR);
    assert.equal(
      getSabbathSchoolQuarterTheme(SABBATH_SCHOOL_PENDING_SURFACE).primary,
      SABBATH_SCHOOL_PENDING_SURFACE,
    );
  });

  it("preserves a readable supplied quarterly color", () => {
    const theme = getSabbathSchoolQuarterTheme("#6D28D9");

    assert.equal(theme.primary, "#6D28D9");
    assert.equal(theme.gradient[0], theme.primary);
    assert.match(theme.tint, /^#[0-9A-F]{8}$/);
    assert.match(theme.border, /^#[0-9A-F]{8}$/);
  });

  it("darkens a bright supplied color for readable white text", () => {
    const theme = getSabbathSchoolQuarterTheme("#FDE047");

    assert.notEqual(theme.primary, "#FDE047");
    assert.match(theme.primary, /^#[0-9A-F]{6}$/);
  });

  it("tints the splash with the quarterly colour, light on the right and stronger on the left", () => {
    const scrim = sabbathSchoolSplashScrim("#54292F");
    assert.equal(scrim.light, "rgba(84,41,47,0.35)");
    assert.equal(scrim.strong, "rgba(84,41,47,0.8)");
    assert.equal(scrim.clear, "rgba(84,41,47,0)");
    assert.match(scrim.bottom, /^rgba\(84,41,47,0\.[0-9]+\)$/);
    const bright = sabbathSchoolSplashScrim("#FDE047");
    assert.doesNotMatch(bright.strong, /rgba\(0,0,0/);
    assert.match(bright.strong, /^rgba\(\d+,\d+,\d+,0\.8\)$/);
    assert.match(cardSource, /SABBATH_SCHOOL_SPLASH_TEXT_SHADOW/);
    assert.match(cardSource, /rgba\(255,255,255,0\.24\)/);
    assert.doesNotMatch(cardSource, /rgba\(0,0,0,0\.32\)/);
  });
});