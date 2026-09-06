import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  HOME_SHARE_DISMISS_MS,
  HOME_SHARE_MESSAGE,
  homeShareNowShouldDismiss,
  shouldShowHomeShareCard,
} from "../lib/home-share-app";
import { APP_SHARE_URL } from "../constants/app";

describe("Home share-app card", () => {
  it("shows when never dismissed", () => {
    assert.equal(shouldShowHomeShareCard(null, Date.UTC(2026, 8, 6)), true);
  });

  it("hides until 30 days have passed, then shows again", () => {
    const dismissed = Date.UTC(2026, 8, 6, 12);
    const justUnder = dismissed + HOME_SHARE_DISMISS_MS - 1;
    const exactly = dismissed + HOME_SHARE_DISMISS_MS;
    const after = dismissed + HOME_SHARE_DISMISS_MS + 1;
    assert.equal(shouldShowHomeShareCard(dismissed, dismissed), false);
    assert.equal(shouldShowHomeShareCard(dismissed, justUnder), false);
    assert.equal(shouldShowHomeShareCard(dismissed, exactly), true);
    assert.equal(shouldShowHomeShareCard(dismissed, after), true);
  });

  it("treats a corrupt timestamp as show", () => {
    assert.equal(shouldShowHomeShareCard(Number.NaN, Date.now()), true);
  });

  it("pins the share URL constant and message", () => {
    assert.equal(APP_SHARE_URL, "https://informed-ministries-api.onrender.com");
    assert.match(HOME_SHARE_MESSAGE, /Informed Ministries/);
    assert.match(HOME_SHARE_MESSAGE, new RegExp(APP_SHARE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const constSource = readFileSync(
      new URL("../constants/app.ts", import.meta.url),
      "utf8",
    );
    assert.match(constSource, /export const APP_SHARE_URL/);
  });

  it("treats Share now as the same 30-day dismiss as Dismiss", () => {
    assert.equal(homeShareNowShouldDismiss("shared"), true);
    assert.equal(homeShareNowShouldDismiss("copied"), true);
    assert.equal(homeShareNowShouldDismiss("cancelled"), true);
    const card = readFileSync(
      new URL("../components/home-v2/ShareAppCard.tsx", import.meta.url),
      "utf8",
    );
    assert.match(card, /shareInformedMinistries/);
    assert.match(card, /homeShareNowShouldDismiss/);
    assert.match(card, /onDismiss\(\)/);
  });

  it("is wired on adult Home and gated out of kids mode", () => {
    const home = readFileSync(
      new URL("../app/(tabs)/home-v2.tsx", import.meta.url),
      "utf8",
    );
    const card = readFileSync(
      new URL("../components/home-v2/ShareAppCard.tsx", import.meta.url),
      "utf8",
    );
    const shareHelper = readFileSync(
      new URL("../lib/share-app.ts", import.meta.url),
      "utf8",
    );
    assert.match(home, /ShareAppCard/);
    assert.match(home, /!isKidsMode && showShareCard/);
    assert.match(card, /plan-family\.png/);
    assert.match(card, /Link copied/);
    assert.match(shareHelper, /navigator\.share/);
    assert.match(shareHelper, /export async function shareInformedMinistries/);
    assert.doesNotMatch(card, /gold|#C9933A/i);
    const header = readFileSync(
      new URL("../components/home-v2/HomeHeader.tsx", import.meta.url),
      "utf8",
    );
    assert.match(header, /numberOfLines=\{1\}/);
    assert.match(header, /fontSize: 22/);
    assert.match(header, /flexWrap: "wrap"/);
  });

  it("wires a permanent adult Profile share row that is not dismiss-gated", () => {
    const profile = readFileSync(
      new URL("../app/(tabs)/profile.tsx", import.meta.url),
      "utf8",
    );
    assert.match(profile, /Share Informed Ministries/);
    assert.match(profile, /!isKidsMode && \(/);
    assert.match(profile, /shareInformedMinistries/);
    assert.match(profile, /profile-share-app/);
    assert.match(profile, /profile-about-section/);
    assert.doesNotMatch(profile, /persistHomeShareDismissedAt|HOME_SHARE_DISMISS|showShareCard/);
  });
});
