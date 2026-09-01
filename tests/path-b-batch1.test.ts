import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import Colors, { KidsColors, getSabbathTheme, PathB } from "../constants/colors";

function read(rel: string) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}

const BATCH_1_FILES = [
  "components/reader/TTSPlayerBar.tsx",
  "app/read/[bookId]/[chapter].tsx",
  "components/reader/RelatedContent.tsx",
  "components/reader/ContextPanel.tsx",
  "app/(auth)/login.tsx",
  "app/(auth)/register.tsx",
  "app/(auth)/_layout.tsx",
  "app/onboarding.tsx",
  "app/org-onboarding.tsx",
  "components/InlineCoachTip.tsx",
  "components/CoachMark.tsx",
  "components/FeatureTutorial.tsx",
  "lib/tutorial-steps.tsx",
  "components/ProGateModal.tsx",
  "components/MissionInviteModal.tsx",
  "components/ShareCard.tsx",
  "app/(tabs)/connect.tsx",
];

describe("Path B sweep Batch 1", () => {
  it("drops gold hex from Batch 1 surfaces and stops inheriting theme.accent", () => {
    for (const rel of BATCH_1_FILES) {
      const source = read(rel);
      assert.doesNotMatch(source, /#C9933A/, rel);
      assert.doesNotMatch(source, /theme\.accent/, rel);
    }
  });

  it("makes the TTS play button the single coral primary", () => {
    const tts = read("components/reader/TTSPlayerBar.tsx");
    const chapter = read("app/read/[bookId]/[chapter].tsx");
    assert.match(tts, /accentColor\s*=\s*PathB\.coral/);
    assert.match(tts, /colors=\{\[accentColor,\s*PathB\.coral,\s*PathB\.coralInk\]\}/);
    assert.match(tts, /backgroundColor:\s*accentColor/);
    assert.match(tts, /color=\{muted\}/);
    assert.match(chapter, /accentColor=\{RV2_CORAL\}/);
    assert.doesNotMatch(chapter, /const GOLD/);
  });

  it("does not flip Colors.light.accent; Kids gold and Sabbath gold stay", () => {
    assert.equal(Colors.light.accent, "#C9933A");
    assert.equal(Colors.light.tabIconSelected, "#C9933A");
    assert.equal(PathB.coral, "#E8604C");
    assert.equal(KidsColors.light.starGold, "#F5A623");
    assert.equal(getSabbathTheme(Colors.light, false).accent, "#D4A245");
    assert.equal(getSabbathTheme(Colors.dark, true).accent, "#D4A245");
  });
});
