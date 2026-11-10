import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  parseLegalMarkdown,
  stripDraftingNotes,
} from "../lib/legal/parse-legal-markdown";
import { LEGAL_PRIVACY, LEGAL_TERMS } from "../lib/legal/generated";

const termsMd = readFileSync(
  new URL("../docs/legal/informed-ministries-terms-of-use.md", import.meta.url),
  "utf8",
);
const privacyMd = readFileSync(
  new URL("../docs/legal/informed-ministries-privacy-policy.md", import.meta.url),
  "utf8",
);

describe("legal markdown source", () => {
  it("publishes version 1.0 and keeps the filled-in details", () => {
    const terms = stripDraftingNotes(termsMd);
    const privacy = stripDraftingNotes(privacyMd);
    assert.match(terms, /Version 1\.0 — effective 9 November 2026/);
    assert.match(privacy, /Version 1\.1 — effective 10 November 2026/);
    assert.doesNotMatch(privacy, /photos unless you choose to share one within a group/);
    assert.match(privacy, /The App has no photo upload/);
    assert.match(privacy, /YouVersion/);
    assert.match(privacy, /OpenStreetMap Nominatim/);
    assert.match(privacy, /Zippopotam/);
    assert.match(privacy, /Expo/);
    assert.match(privacy, /Firebase Cloud Messaging/);
    assert.match(privacy, /Resend/);
    assert.match(privacy, /group discussion posts and replies/);
    assert.match(privacy, /7 days on Hobby, 14 days on Pro, and 30 days on Scale or Enterprise/);
    assert.doesNotMatch(terms, /Draft for legal review|not yet in force|Version 0\.1/);
    assert.doesNotMatch(privacy, /Draft for legal review|not yet in force|Version 0\.1/);
    assert.match(terms, /ABN 39 741 036 497/);
    assert.match(terms, /hello@informedministries\.app/);
    assert.doesNotMatch(terms, /\[support email\]/);
    assert.doesNotMatch(terms, /\[postal or email address\]/);
    assert.match(privacy, /ABN 39 741 036 497/);
    assert.match(privacy, /hello@informedministries\.app/);
    assert.doesNotMatch(privacy, /\[privacy contact email\]/);
    assert.doesNotMatch(privacy, /\[postal or email address\]/);
    assert.match(privacy, /Render in Singapore/);
    assert.match(privacy, /Neon in Sydney, Australia/);
    assert.doesNotMatch(privacy, /\[hosting provider\]/);
    assert.doesNotMatch(privacy, /\[database provider\]/);
    assert.match(privacy, /Posts you made in a group are removed/);
    assert.match(privacy, /not kept as "Former member"/);
    assert.doesNotMatch(privacy, /remain visible to the group in anonymised form/);
    assert.match(privacy, /Problem reports you sent are kept with your user id removed/);
    assert.match(privacy, /LiveKit/);
    assert.match(privacy, /YouTube/);
    assert.match(privacy, /OpenAI/);
    assert.match(privacy, /no longer than 30 days/);
    assert.doesNotMatch(privacy, /\[video provider\]/);
    assert.doesNotMatch(privacy, /\[AI provider\]/);
    assert.doesNotMatch(privacy, /\[analytics\/error provider\]/);
    assert.doesNotMatch(privacy, /\[30\]/);
    assert.doesNotMatch(privacy, /Error and usage reporting/);
    assert.doesNotMatch(terms, /Drafting notes for review/);
    assert.doesNotMatch(privacy, /Drafting notes for review/);
    assert.doesNotMatch(terms, /delete before publishing/);
    assert.doesNotMatch(privacy, /Fill in provider names/);
  });

  it("generated modules match the stripped markdown", () => {
    assert.equal(LEGAL_GENERATED_IS_IN_FORCE(), true);
    assert.match(LEGAL_TERMS.title, /Terms of Use/);
    assert.match(LEGAL_PRIVACY.title, /Privacy Policy/);
    assert.equal(LEGAL_TERMS.banner, "Version 1.0 — effective 9 November 2026");
    assert.equal(LEGAL_PRIVACY.banner, "Version 1.1 — effective 10 November 2026");
    const parsedTerms = parseLegalMarkdown(termsMd);
    assert.deepEqual(LEGAL_TERMS, parsedTerms);
    assert.doesNotMatch(JSON.stringify(LEGAL_TERMS), /Drafting notes for review/);
    assert.doesNotMatch(JSON.stringify(LEGAL_PRIVACY), /Drafting notes for review/);
  });
});

function LEGAL_GENERATED_IS_IN_FORCE() {
  const generated = readFileSync(new URL("../lib/legal/generated.ts", import.meta.url), "utf8");
  return (
    generated.includes("Version 1.0 — effective 9 November 2026") &&
    generated.includes("Version 1.1 — effective 10 November 2026") &&
    !/Draft for legal review|not yet in force|Version 0\.1/.test(generated)
  );
}

describe("legal surfaces", () => {
  it("renders terms and privacy from the generated document", () => {
    const termsScreen = readFileSync(new URL("../app/terms.tsx", import.meta.url), "utf8");
    const privacyScreen = readFileSync(new URL("../app/privacy.tsx", import.meta.url), "utf8");
    assert.match(termsScreen, /LEGAL_TERMS/);
    assert.match(privacyScreen, /LEGAL_PRIVACY/);
    assert.match(termsScreen, /Terms of Use/);
    assert.match(privacyScreen, /Privacy Policy/);
  });

  it("links both documents from Profile About and sign-up", () => {
    const profile = readFileSync(
      new URL("../app/(tabs)/profile.tsx", import.meta.url),
      "utf8",
    );
    const register = readFileSync(
      new URL("../app/(auth)/register.tsx", import.meta.url),
      "utf8",
    );
    assert.match(profile, /profile-about-section/);
    assert.match(profile, /Terms of Use/);
    assert.match(profile, /Privacy Policy/);
    assert.match(profile, /profile-terms-of-use/);
    assert.match(profile, /profile-privacy-policy/);
    assert.match(register, /By creating an account you agree to the/);
    assert.match(register, /register-legal-agree/);
    assert.match(register, /router\.push\("\/terms"/);
    assert.match(register, /router\.push\("\/privacy"/);
  });

  it("serves public HTML pages at /terms, /privacy, and /delete-account", () => {
    const server = readFileSync(new URL("../server/index.ts", import.meta.url), "utf8");
    const termsHtml = readFileSync(
      new URL("../server/templates/terms.html", import.meta.url),
      "utf8",
    );
    const privacyHtml = readFileSync(
      new URL("../server/templates/privacy.html", import.meta.url),
      "utf8",
    );
    const deleteAccountHtml = readFileSync(
      new URL("../server/templates/delete-account.html", import.meta.url),
      "utf8",
    );
    assert.match(server, /app\.get\("\/privacy"/);
    assert.match(server, /app\.get\("\/terms"/);
    assert.match(server, /app\.get\("\/delete-account"/);
    assert.match(server, /templates", "terms.html"/);
    assert.match(termsHtml, /Version 1\.0 — effective 9 November 2026/);
    assert.match(privacyHtml, /Version 1\.1 — effective 10 November 2026/);
    assert.doesNotMatch(privacyHtml, /photos unless you choose to share one within a group/);
    assert.match(privacyHtml, /YouVersion/);
    assert.match(privacyHtml, /Nominatim/);
    assert.match(privacyHtml, /Zippopotam/);
    assert.match(privacyHtml, /Firebase Cloud Messaging/);
    assert.match(privacyHtml, /Resend/);
    assert.doesNotMatch(termsHtml, /Draft for legal review|not yet in force|Version 0\.1/);
    assert.doesNotMatch(privacyHtml, /Draft for legal review|not yet in force|Version 0\.1/);
    assert.match(termsHtml, /ABN 39 741 036 497/);
    assert.match(termsHtml, /hello@informedministries\.app/);
    assert.doesNotMatch(termsHtml, /\[postal or email address\]/);
    assert.match(privacyHtml, /Render in Singapore/);
    assert.match(privacyHtml, /Neon in Sydney, Australia/);
    assert.match(privacyHtml, /hello@informedministries\.app/);
    assert.match(privacyHtml, /Posts you made in a group are removed/);
    assert.doesNotMatch(privacyHtml, /remain visible to the group in anonymised form/);
    assert.doesNotMatch(privacyHtml, /\[hosting provider\]/);
    assert.doesNotMatch(privacyHtml, /\[postal or email address\]/);
    assert.match(privacyHtml, /LiveKit/);
    assert.match(privacyHtml, /YouTube/);
    assert.match(privacyHtml, /OpenAI/);
    assert.doesNotMatch(privacyHtml, /\[video provider\]/);
    assert.doesNotMatch(privacyHtml, /\[AI provider\]/);
    assert.doesNotMatch(privacyHtml, /\[analytics\/error provider\]/);
    assert.doesNotMatch(privacyHtml, /Error and usage reporting/);
    assert.match(deleteAccountHtml, /Delete your Informed Ministries account/);
    assert.match(deleteAccountHtml, /hello@informedministries\.app/);
    assert.match(deleteAccountHtml, /Profile/);
    assert.match(deleteAccountHtml, /Settings/);
    assert.match(deleteAccountHtml, /group discussion posts and replies/);
    assert.match(deleteAccountHtml, /Can't sign in\?/);
    assert.match(deleteAccountHtml, /mailto:hello@informedministries\.app/);
    assert.match(
      deleteAccountHtml,
      /from your account email and we'll delete your account within 30 days\./,
    );
    assert.doesNotMatch(termsHtml, /Drafting notes for review/);
    assert.doesNotMatch(privacyHtml, /Drafting notes for review/);
  });
});
