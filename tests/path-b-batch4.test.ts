import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import Colors, { KidsColors, getSabbathTheme, PathB } from "../constants/colors";

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

  it("leaves Kids celebratory gold and kids accent untouched", () => {
    assert.equal(KidsColors.light.starGold, "#F5A623");
    assert.equal(KidsColors.dark.starGold, "#F5A623");
    assert.equal(KidsColors.light.accent, "#4A90D9");
    assert.notEqual(KidsColors.light.accent, PathB.coral);
    const kidsStars = read("app/(tabs)/kids-stars.tsx");
    const kidsLearn = read("app/(tabs)/kids-learn.tsx");
    const storyFlow = read("components/kids/StoryCompletionFlow.tsx");
    const kidsShop = read("constants/kids-shop.ts");
    assert.match(kidsStars, /starGold/);
    assert.match(kidsLearn, /starGold/);
    assert.match(kidsLearn, /#FFD700|#F5A623/);
    assert.match(storyFlow, /#C9933A|#F5A623|#FFD700/);
    assert.match(kidsShop, /#C9933A|#F5A623/);
  });

  it("insulates kids from the adult accent flip via useTheme(true) → KidsColors", () => {
    const useThemeSource = read("hooks/useTheme.ts");
    assert.match(useThemeSource, /isKidsMode\s*\n\s*\? KidsColors\.light\s*\n\s*: Colors\.light/);
    assert.match(read("app/(tabs)/kids-stars.tsx"), /useTheme\(true\)/);
    assert.match(read("app/(tabs)/kids-learn.tsx"), /useTheme\(true\)/);
    assert.match(read("app/(tabs)/kids-stories.tsx"), /useTheme\(true\)/);
    assert.match(read("app/kids/story/[id].tsx"), /useTheme\(true\)/);
    assert.match(read("app/kids/sabbath-school.tsx"), /useTheme\(true\)/);
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
