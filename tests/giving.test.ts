import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  GIVING_ABN,
  GIVING_BANK_ACCOUNT,
  GIVING_BANK_BSB,
  GIVING_BANK_NAME,
  STRIPE_GIVING_URL,
} from "../constants/app";
import { givingBankRows, givingOnlineUrl } from "../lib/giving";

const root = process.cwd();

describe("giving details", () => {
  it("publishes the ABN and the filled payment constants", () => {
    assert.equal(GIVING_ABN, "39 741 036 497");
    assert.equal(GIVING_BANK_NAME, "Luis Bermudez");
    assert.equal(GIVING_BANK_BSB, "182-182");
    assert.equal(GIVING_BANK_ACCOUNT, "001223585");
    assert.equal(STRIPE_GIVING_URL, "https://buy.stripe.com/14A4gzbSGcF53VwbAP5sA00");
  });

  it("hides an empty online link and empty bank rows", () => {
    assert.equal(givingOnlineUrl(""), null);
    assert.equal(givingOnlineUrl("  https://give.example  "), "https://give.example");
    assert.deepEqual(
      givingBankRows({ name: "", bsb: "   ", account: "", abn: "" }),
      [],
    );
    assert.deepEqual(givingBankRows({ name: "", bsb: "", account: "", abn: "39 741 036 497" }), [
      { id: "abn", label: "ABN", value: "39 741 036 497" },
    ]);
  });
});

describe("giving screen", () => {
  it("replaces the profile coming-soon toast and stays out of kids mode", () => {
    const profile = readFileSync(path.join(root, "app", "(tabs)", "profile.tsx"), "utf8");
    assert.doesNotMatch(profile, /Giving features coming soon/);
    assert.match(profile, /testID="profile-giving"/);
    assert.match(profile, /router\.push\("\/giving"/);
    const tileAt = profile.indexOf('testID="profile-giving"');
    const gateAt = profile.lastIndexOf("{!isKidsMode ?", tileAt);
    assert.ok(gateAt >= 0 && gateAt < tileAt);
    const screen = readFileSync(path.join(root, "app", "giving.tsx"), "utf8");
    assert.match(screen, /Support Informed Ministries/);
    assert.match(screen, /Informed Ministries is independent and free to use/);
    assert.match(screen, /Gifts are not tax-deductible\./);
    assert.match(screen, /Give online/);
    assert.match(screen, /Payments are handled by Stripe on Informed Ministries' behalf\./);
    assert.match(screen, /Bank transfer/);
    assert.match(screen, /Please use 'App gift' as the reference\./);
    assert.match(screen, /Giving isn't set up yet\./);
    assert.match(screen, /if \(isKidsMode\) router\.replace/);
    assert.match(screen, /Linking\.openURL/);
    assert.match(screen, /window\.open\(url, "_blank"/);
    assert.doesNotMatch(screen, /openBrowserAsync|WebBrowser|card number|Card number|amount/i);
  });
});
