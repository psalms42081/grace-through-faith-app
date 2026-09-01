import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ENABLE_ORG_TOOLS } from "../lib/feature-flags";

const profileSource = readFileSync(
  new URL("../app/(tabs)/profile.tsx", import.meta.url),
  "utf8",
);
const flagsSource = readFileSync(
  new URL("../lib/feature-flags.ts", import.meta.url),
  "utf8",
);
const orgOnboardingSource = readFileSync(
  new URL("../app/org-onboarding.tsx", import.meta.url),
  "utf8",
);
const schemaSource = readFileSync(
  new URL("../shared/schema.ts", import.meta.url),
  "utf8",
);

const ORG_UI_STRINGS = [
  "Admin Dashboard",
  "Conference Portal",
  "Leader Tools",
  "Broadcast Announcements",
  "Church Member Analytics",
  "My Conference",
  "Church organization",
  "Request Leader Access",
  "org-onboarding",
  "leader-broadcast",
  "leader-analytics",
  "conference-portal",
];


describe("Profile Path B batch 2", () => {
  it("defaults ENABLE_ORG_TOOLS to false and reads EXPO_PUBLIC_ENABLE_ORG_TOOLS", () => {
    assert.equal(ENABLE_ORG_TOOLS, false);
    assert.match(flagsSource, /EXPO_PUBLIC_ENABLE_ORG_TOOLS === "true"/);
    assert.match(profileSource, /ENABLE_ORG_TOOLS/);
  });

  it("does not render org/admin/leader strings when the flag is off", () => {
    assert.equal(ENABLE_ORG_TOOLS, false);
    const gate = profileSource.indexOf("{ENABLE_ORG_TOOLS && (<>");
    assert.ok(gate >= 0, "org/admin/leader UI must be wrapped in ENABLE_ORG_TOOLS");
    const beforeGate = profileSource.slice(0, gate);
    const afterGate = profileSource.slice(gate);
    for (const needle of ORG_UI_STRINGS) {
      assert.equal(
        beforeGate.includes(needle),
        false,
        `${needle} must not appear outside the ENABLE_ORG_TOOLS wrapper`,
      );
      assert.ok(afterGate.includes(needle), `${needle} should remain for flag-on revival`);
    }
  });

  it("uses ink activity text, not white-on-cream", () => {
    assert.match(profileSource, /activityLabel:\s*\{[\s\S]*?color:\s*C\.ink/);
    assert.match(profileSource, /activitySub:\s*\{[\s\S]*?color:\s*C\.inkMuted/);
    assert.doesNotMatch(profileSource, /activityLabel:\s*\{[\s\S]*?color:\s*"#FFFFFF"/);
    assert.doesNotMatch(profileSource, /activitySub:\s*\{[\s\S]*?color:\s*"rgba\(255,255,255/);
    assert.doesNotMatch(
      profileSource,
      /sectionTitle[\s\S]{0,80}color:\s*"#FFFFFF"/,
    );
  });

  it("has no heritage gold on the Profile screen", () => {
    assert.doesNotMatch(profileSource, /#C9933A/);
    assert.doesNotMatch(profileSource, /theme\.accent/);
    assert.doesNotMatch(profileSource, /Colors\.light\.accent/);
  });

  it("drops badges and Share Profile (share was a text blurb, not a real URL)", () => {
    assert.doesNotMatch(profileSource, /Share Profile/);
    assert.doesNotMatch(profileSource, /handleShareProfile/);
    assert.doesNotMatch(profileSource, /Badges/);
    assert.doesNotMatch(profileSource, /Week Warrior/);
  });

  it("keeps org tables and bounces org-onboarding while the flag is off", () => {
    assert.match(schemaSource, /export const organizations = pgTable/);
    assert.match(schemaSource, /export const organizationMembers = pgTable/);
    assert.match(orgOnboardingSource, /ENABLE_ORG_TOOLS/);
    assert.match(orgOnboardingSource, /<Redirect href="\/\(tabs\)\/home-v2" \/>/);
  });
});
