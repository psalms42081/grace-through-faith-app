import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expandStepMorph } from "../lib/step-morph";

describe("expandStepMorph — 20 known tokens", () => {
  const cases: Array<{ code: string; language?: "he" | "gr"; expected: string }> = [
    { code: "HVqp3ms", expected: "verb · qal · perfect · 3rd masculine singular" },
    { code: "Vqi3fs", expected: "verb · qal · imperfect · 3rd feminine singular" },
    { code: "HVqw3ms", expected: "verb · qal · sequential imperfect · 3rd masculine singular" },
    { code: "Vpi3ms", expected: "verb · piel · imperfect · 3rd masculine singular" },
    { code: "Vhp3ms", expected: "verb · hiphil · perfect · 3rd masculine singular" },
    { code: "Ncfsa", expected: "noun · feminine · singular · absolute" },
    { code: "Ncmpa", expected: "noun · masculine · plural · absolute" },
    { code: "Ncmsc", expected: "noun · masculine · singular · construct" },
    { code: "Aamsa", expected: "adjective · masculine · singular · absolute" },
    { code: "HTo", expected: "particle · direct object marker" },
    { code: "Vqv2ms", expected: "verb · qal · imperative · 2nd masculine singular" },
    { code: "Vqc", expected: "verb · qal · infinitive construct" },
    { code: "V-AAI-3S", language: "gr", expected: "verb · aorist · active · indicative · 3rd singular" },
    { code: "V-PAI-3S", language: "gr", expected: "verb · present · active · indicative · 3rd singular" },
    { code: "N-NSF", language: "gr", expected: "noun · nominative · singular · feminine" },
    { code: "N-ASM", language: "gr", expected: "noun · accusative · singular · masculine" },
    { code: "V-PAP-NSM", language: "gr", expected: "verb · present · active · participle · nominative · singular · masculine" },
    { code: "T-NSM", language: "gr", expected: "article · nominative · singular · masculine" },
    { code: "V-2AAI-3S", language: "gr", expected: "verb · second aorist · active · indicative · 3rd singular" },
    { code: "P-GSM", language: "gr", expected: "personal pronoun · genitive · singular · masculine" },
  ];

  it("expands twenty Hebrew and Greek codes", () => {
    assert.equal(cases.length, 20);
    for (const row of cases) {
      assert.equal(expandStepMorph(row.code, row.language), row.expected, row.code);
    }
  });

  it("expands slash-separated TAHOT affix+host codes", () => {
    assert.equal(
      expandStepMorph("HR/Ncfsa"),
      "preposition · noun · feminine · singular · absolute",
    );
  });
});
