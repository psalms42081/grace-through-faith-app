import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupTranslationsByLanguage,
  translationLabel,
  type CatalogTranslation,
} from "../lib/translation-catalog";
import { transliterateSerbian } from "../scripts/prepare-south-slavic";

const MATTHEW_5_1 = "А кад он видје народ, попе се на гору, и сједе, и приступише му ученици његови.";

describe("South Slavic catalogue grouping", () => {
  const catalog: CatalogTranslation[] = [
    { id: "YV1969", abbreviation: "YV1969", displayAbbreviation: "NSPL", name: "Novi srpski prevod", language: "sr", languageName: "Serbian", source: "youversion" },
    { id: "YV2165", abbreviation: "YV2165", displayAbbreviation: "SRP1865", name: "Sveta Biblija", language: "sr", languageName: "Serbian", source: "youversion" },
    { id: "SRKDCYR", abbreviation: "SRKDCYR", name: "Свето писмо (Караџић–Даничић)", language: "sr", languageName: "Serbian", source: "db" },
    { id: "SRKDLAT", abbreviation: "SRKDLAT", name: "Sveto pismo (Karadžić–Daničić)", language: "sr", languageName: "Serbian", source: "db" },
    { id: "SARIC", abbreviation: "SARIC", name: "Sveta Biblija (Šarić)", language: "hr", languageName: "Croatian", source: "db" },
    { id: "YV39", abbreviation: "YV39", displayAbbreviation: "KOK", name: "Knjiga O Kristu", language: "hr", languageName: "Croatian", source: "youversion" },
  ];

  it("keeps ijekavian Karadžić apart from ekavian YouVersion Serbian, and Šarić with Croatian", () => {
    const groups = groupTranslationsByLanguage(catalog);
    assert.deepEqual(groups.map((group) => group.languageName), [
      "Croatian",
      "Serbian · ekavian",
      "Serbian · ijekavian",
    ]);
    const names = (languageName: string) =>
      groups.find((group) => group.languageName === languageName)!.entries.map((entry) => entry.abbreviation);
    assert.deepEqual(names("Croatian"), ["SARIC", "YV39"]);
    assert.deepEqual(names("Serbian · ekavian"), ["YV1969", "YV2165"]);
    assert.deepEqual(names("Serbian · ijekavian"), ["SRKDCYR", "SRKDLAT"]);
    const flat = groups.flatMap((group) => group.entries);
    assert.equal(translationLabel("SRKDCYR", flat), "SRKD");
    assert.equal(translationLabel("SRKDLAT", flat), "SRKD-L");
    assert.equal(translationLabel("SARIC", flat), "Šarić");
  });

  it("transliterates Serbian Cyrillic one-to-one, including digraphs", () => {
    assert.equal(
      transliterateSerbian(MATTHEW_5_1),
      "A kad on vidje narod, pope se na goru, i sjede, i pristupiše mu učenici njegovi.",
    );
    assert.equal(transliterateSerbian("Љубав Њега Џеп"), "Ljubav Njega Džep");
    assert.equal(transliterateSerbian("ЉУБАВ"), "LJUBAV");
  });
});
