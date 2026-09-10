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
  it("strips drafting notes and keeps the draft banner and placeholders", () => {
    const terms = stripDraftingNotes(termsMd);
    const privacy = stripDraftingNotes(privacyMd);
    assert.match(terms, /Draft for legal review — not yet in force/);
    assert.match(privacy, /Draft for legal review — not yet in force/);
    assert.match(terms, /\[insert ABN\]/);
    assert.match(terms, /\[support email\]/);
    assert.match(privacy, /\[insert\]/);
    assert.match(privacy, /\[hosting provider\]/);
    assert.doesNotMatch(terms, /Drafting notes for review/);
    assert.doesNotMatch(privacy, /Drafting notes for review/);
    assert.doesNotMatch(terms, /delete before publishing/);
    assert.doesNotMatch(privacy, /Fill in provider names/);
  });

  it("generated modules match the stripped markdown", () => {
    assert.equal(LEGAL_TERMS_MARKDOWN_HAS_DRAFT(), true);
    assert.match(LEGAL_TERMS.title, /Terms of Use/);
    assert.match(LEGAL_PRIVACY.title, /Privacy Policy/);
    assert.equal(LEGAL_TERMS.banner, "Draft for legal review — not yet in force");
    assert.equal(LEGAL_PRIVACY.banner, "Draft for legal review — not yet in force");
    const parsedTerms = parseLegalMarkdown(termsMd);
    assert.deepEqual(LEGAL_TERMS, parsedTerms);
    assert.doesNotMatch(JSON.stringify(LEGAL_TERMS), /Drafting notes for review/);
    assert.doesNotMatch(JSON.stringify(LEGAL_PRIVACY), /Drafting notes for review/);
  });
});

function LEGAL_TERMS_MARKDOWN_HAS_DRAFT() {
  return /Draft for legal review/.test(
    readFileSync(new URL("../lib/legal/generated.ts", import.meta.url), "utf8"),
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

  it("serves public HTML pages at /terms and /privacy", () => {
    const server = readFileSync(new URL("../server/index.ts", import.meta.url), "utf8");
    const termsHtml = readFileSync(
      new URL("../server/templates/terms.html", import.meta.url),
      "utf8",
    );
    const privacyHtml = readFileSync(
      new URL("../server/templates/privacy.html", import.meta.url),
      "utf8",
    );
    assert.match(server, /app\.get\("\/privacy"/);
    assert.match(server, /app\.get\("\/terms"/);
    assert.match(server, /templates", "terms.html"/);
    assert.match(termsHtml, /Draft for legal review/);
    assert.match(privacyHtml, /Draft for legal review/);
    assert.match(termsHtml, /\[insert ABN\]/);
    assert.match(privacyHtml, /\[hosting provider\]/);
    assert.doesNotMatch(termsHtml, /Drafting notes for review/);
    assert.doesNotMatch(privacyHtml, /Drafting notes for review/);
  });
});
