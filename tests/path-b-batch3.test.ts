import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import Colors, { KidsColors, getSabbathTheme, PathB } from "../constants/colors";
import { ENABLE_PREMIUM, ENABLE_ORG_TOOLS } from "../lib/feature-flags";

function read(rel: string) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}

const flagsSource = read("lib/feature-flags.ts");
const settingsSource = read("app/settings.tsx");
const historicVoicesSource = read("app/historic-voices.tsx");
const resourceDetailSource = read("app/resource-detail.tsx");
const gcSource = read("app/great-controversy.tsx");
const lessonSource = read("app/lesson/[id].tsx");
const proContextSource = read("contexts/ProContext.tsx");

const TOKEN_SWAP_FILES = [
  "app/verse-actions.tsx",
  "app/touchpoints.tsx",
  "app/touchpoint-topic.tsx",
  "app/touchpoint-study.tsx",
  "components/BroadcastCard.tsx",
  "app/broadcasts.tsx",
  "app/leader-broadcast.tsx",
];

const LAYOUT_FILES = [
  "app/historic-voices.tsx",
  "app/resource-detail.tsx",
  "app/great-controversy.tsx",
  "app/lesson/[id].tsx",
];

describe("Path B sweep Batch 3", () => {
  it("defaults ENABLE_PREMIUM to false and reads EXPO_PUBLIC_ENABLE_PREMIUM", () => {
    assert.equal(ENABLE_PREMIUM, false);
    assert.match(flagsSource, /EXPO_PUBLIC_ENABLE_PREMIUM === "true"/);
    assert.match(settingsSource, /ENABLE_PREMIUM/);
    assert.match(proContextSource, /ENABLE_PREMIUM/);
  });

  it("does not render Go Premium when ENABLE_PREMIUM is false", () => {
    assert.equal(ENABLE_PREMIUM, false);
    const gate = settingsSource.indexOf("{ENABLE_PREMIUM && renderRow(\"diamond-outline\"");
    assert.ok(gate >= 0, "Go Premium row must be wrapped in ENABLE_PREMIUM");
    const beforeGate = settingsSource.slice(0, gate);
    assert.equal(beforeGate.includes("Go Premium"), false);
    assert.ok(settingsSource.slice(gate).includes("Go Premium"));
  });

  it("makes Edit Profile and Notification Settings plain working items", () => {
    assert.doesNotMatch(settingsSource, /comingSoon\("Edit Profile"\)/);
    assert.doesNotMatch(settingsSource, /comingSoon\("Notification Settings"\)/);
    assert.match(settingsSource, /handleEditProfile/);
    assert.match(settingsSource, /NotificationSettings/);
    assert.match(settingsSource, /PUT", "\/api\/auth\/profile"/);
    const editBlock = settingsSource.slice(
      settingsSource.indexOf('"Edit Profile"'),
      settingsSource.indexOf('"Notification Settings"'),
    );
    assert.doesNotMatch(editBlock, /lock-closed"/);
    const notifBlock = settingsSource.slice(
      settingsSource.indexOf('"Notification Settings"'),
      settingsSource.indexOf("ENABLE_PREMIUM && renderRow"),
    );
    assert.doesNotMatch(notifBlock, /lock-closed"/);
  });

  it("styles Reset Reading History as a destructive action, not amber or gold", () => {
    assert.match(settingsSource, /name="refresh-outline" size=\{20\} color="#EF4444"/);
    assert.match(settingsSource, /signOutText[\s\S]{0,200}Reset Reading History/);
    assert.doesNotMatch(settingsSource, /#F59E0B/);
  });

  it("labels every pioneer summary as AI-generated", () => {
    assert.match(historicVoicesSource, /AI-generated summary/);
    assert.match(historicVoicesSource, /adventistEntries\.map/);
    assert.match(historicVoicesSource, /Not a quotation from their published works/);
    const classicIdx = historicVoicesSource.indexOf("classicEntries.map");
    const classicBlock = historicVoicesSource.slice(classicIdx);
    assert.equal(classicBlock.includes("AI-generated summary"), false);
  });

  it("collapses layout surfaces to Path B tokens with one coral primary", () => {
    assert.match(historicVoicesSource, /borderLeftColor:\s*PathB\.coral/);
    assert.match(historicVoicesSource, /backgroundColor:\s*PathB\.coral/);
    assert.match(historicVoicesSource, /SWEEP_LIGHT/);
    assert.doesNotMatch(historicVoicesSource, /theme\.accent/);

    assert.match(resourceDetailSource, /backgroundColor:\s*PathB\.coral/);
    assert.match(resourceDetailSource, /Complete & Continue/);
    assert.match(resourceDetailSource, /color: "#fff"/);

    assert.match(gcSource, /youAreHereBadge[\s\S]*?backgroundColor:\s*PathB\.coral/);
    assert.match(gcSource, /SWEEP_LIGHT/);

    assert.match(lessonSource, /Complete Lesson/);
    assert.match(lessonSource, /backgroundColor:\s*PathB\.coral/);
    assert.match(lessonSource, /SWEEP_LIGHT/);
  });

  it("drops heritage gold CTA chrome from Batch 3 files", () => {
    for (const rel of [...TOKEN_SWAP_FILES, ...LAYOUT_FILES, "app/settings.tsx"]) {
      const source = read(rel);
      assert.doesNotMatch(source, /#C9933A/, rel);
      assert.doesNotMatch(source, /const GOLD/, rel);
    }
  });

  it("Batch 4 flipped Colors.light.accent to coral; Kids gold stays; org tools stay off", () => {
    assert.equal(Colors.light.accent, PathB.coral);
    assert.equal(Colors.light.tabIconSelected, PathB.coral);
    assert.equal(PathB.coral, "#E8604C");
    assert.equal(KidsColors.light.starGold, "#F5A623");
    assert.equal(getSabbathTheme(Colors.light, false).accent, PathB.coral);
    assert.equal(ENABLE_ORG_TOOLS, false);
  });
});
