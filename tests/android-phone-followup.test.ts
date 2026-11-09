import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const HEBREWS_4_12_KJV =
  "For the word of God is quick, and powerful, and sharper than any twoedged sword, piercing even to the dividing asunder of soul and spirit, and of the joints and marrow, and is a discerner of the thoughts and intents of the heart.";

describe("opening screen quote", () => {
  it("credits Hebrews 4:12 (KJV) and does not attribute the line to Ellen White", () => {
    const screen = readFileSync(new URL("../app/onboarding.tsx", import.meta.url), "utf8");
    assert.match(screen, new RegExp(HEBREWS_4_12_KJV.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(screen, /QUOTE_ATTRIBUTION = "Hebrews 4:12"/);
    assert.doesNotMatch(screen, /Ellen G\. White/);
    assert.doesNotMatch(screen, /You have come to the right place/);
  });
});

describe("android system bars", () => {
  it("uses dark status-bar content on the cream app and a light navigation bar without the contrast scrim", () => {
    const root = readFileSync(new URL("../app/_layout.tsx", import.meta.url), "utf8");
    const app = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8"));
    const overlay = readFileSync(new URL("../components/home/SabbathOverlay.tsx", import.meta.url), "utf8");
    assert.match(root, /<StatusBar style="dark" \/>/);
    assert.match(root, /<NavigationBar style="dark" \/>/);
    assert.match(root, /SystemUI\.setBackgroundColorAsync\(PathB\.surface\)/);
    assert.match(overlay, /<StatusBar style="light" \/>/);
    assert.match(overlay, /<NavigationBar style="light" \/>/);
    const plugins = app.expo.plugins;
    const nav = plugins.find(
      (plugin: unknown) => Array.isArray(plugin) && plugin[0] === "expo-navigation-bar",
    ) as [string, { enforceContrast: boolean; style: string }] | undefined;
    assert.ok(nav, "expo-navigation-bar plugin missing");
    assert.equal(nav[1].enforceContrast, false);
    assert.equal(nav[1].style, "dark");
  });
});
