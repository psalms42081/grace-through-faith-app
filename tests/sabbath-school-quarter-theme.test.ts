import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getSabbathSchoolQuarterTheme,
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
});