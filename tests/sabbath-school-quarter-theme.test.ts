import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getSabbathSchoolQuarterTheme,
  SABBATH_SCHOOL_FALLBACK_COLOR,
} from "../lib/sabbath-school-quarter-theme";

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