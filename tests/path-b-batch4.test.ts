import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import Colors, { getSabbathTheme, PathB } from "../constants/colors";

function read(rel: string) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}

describe("Path B sweep Batch 4 FINAL", () => {
  it("flips Colors.light.accent, tint, and tabIconSelected to Path B coral", () => {
    assert.equal(Colors.light.accent, "#E8604C");
    assert.equal(Colors.light.tint, "#E8604C");
    assert.equal(Colors.light.tabIconSelected, "#E8604C");
    assert.equal(Colors.light.accent, PathB.coral);
    assert.equal(PathB.gold, "#C9933A");
  });

  it("keeps useTheme on the adult light palette", () => {
    const useThemeSource = read("hooks/useTheme.ts");
    assert.match(useThemeSource, /theme: Colors\.light/);
    assert.doesNotMatch(useThemeSource, /KidsColors|isKidsMode/);
  });

  it("drops gold from Sabbath UI chrome; iconographic gold remains on glyphs", () => {
    const sabbathTheme = getSabbathTheme(Colors.light, false);
    assert.equal(sabbathTheme.accent, PathB.coral);
    assert.equal(sabbathTheme.tint, PathB.coral);
    assert.doesNotMatch(JSON.stringify(sabbathTheme), /#D4A245/);

    const experience = read("app/sabbath-experience.tsx");
    assert.doesNotMatch(experience, /const GOLD = "#C9933A"/);
    assert.doesNotMatch(experience, /#C9933A/);
    assert.match(experience, /SABBATH_GOLD = "#D4A245"/);
    assert.match(experience, /backgroundColor: PathB\.coral/);
    assert.match(experience, /icon: "sunny-outline"[\s\S]*?color: SABBATH_GOLD/);

    const biblical = read("app/biblical-sabbaths.tsx");
    assert.doesNotMatch(biblical, /#C9933A/);
    assert.match(biblical, /SABBATH_GOLD = "#D4A245"/);
    assert.match(biblical, /name="sunny" size=\{28\} color=\{SABBATH_GOLD\}/);
    assert.match(biblical, /backgroundColor: isActive \? PathB\.coral/);

    const banner = read("components/home/SabbathBanner.tsx");
    assert.match(banner, /SABBATH_GOLD/);
    assert.match(banner, /name="sunny"[\s\S]*?color=\{SABBATH_GOLD\}/);
    assert.match(banner, /backgroundColor: PathB\.coral/);
    assert.doesNotMatch(banner, /theme\.accent/);

    const overlay = read("components/home/SabbathOverlay.tsx");
    assert.match(overlay, /#D4A245/);
  });

  it("unifies Prayer Journal toggle to coral and hides single-slide intro pager", () => {
    const journal = read("app/prayer-journal.tsx");
    assert.match(journal, /filter === f && \{ backgroundColor: theme\.accent \}/);
    assert.doesNotMatch(journal, /filter === f && \{ backgroundColor: theme\.accentInk \}/);
    assert.doesNotMatch(journal, /#C9933A/);
    assert.equal(journal.includes("1 of 1"), false);

    const tutorial = read("components/FeatureTutorial.tsx");
    assert.match(tutorial, /steps\.length > 1 \? \(\s*<ProgressDots/);
    assert.match(tutorial, /steps\.length > 1 \? \(\s*<View style=\{modalStyles\.stepCounter\}/);
    assert.match(tutorial, /\{currentStep \+ 1\} of \{steps\.length\}/);
  });
});
