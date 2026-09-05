import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  PIONEER_AUTHORS,
  PIONEER_SHELF_PUBLIC_DOMAIN,
  PIONEER_SHELF_SLUGS,
  publicDomainLine,
  sortPioneerAuthorsByBirth,
} from "../shared/pioneer-authors";
import { displayPioneerChapterTitle } from "../shared/pioneer-title";

describe("displayPioneerChapterTitle", () => {
  it("strips a leading chapter number and title-cases ALL CAPS remainder", () => {
    assert.equal(displayPioneerChapterTitle("02 - THE GREAT IMAGE"), "The Great Image");
    assert.equal(
      displayPioneerChapterTitle("01 - DANIEL IN CAPTIVITY"),
      "Daniel in Captivity",
    );
    assert.equal(displayPioneerChapterTitle("12: THE LAW OF GOD"), "The Law of God");
    assert.equal(displayPioneerChapterTitle("Chapter 1 — Foo"), "Foo");
    assert.equal(displayPioneerChapterTitle("02. Title"), "Title");
  });

  it("leaves already-clean titles unchanged except title-case when needed", () => {
    assert.equal(displayPioneerChapterTitle("THE 2300 DAYS"), "The 2300 Days");
    assert.equal(
      displayPioneerChapterTitle("Christ and His Righteousness"),
      "Christ and His Righteousness",
    );
    assert.equal(displayPioneerChapterTitle("The Great Image"), "The Great Image");
  });

  it("does not strip numbers that belong to the real title", () => {
    assert.equal(
      displayPioneerChapterTitle("02 - THE 2300 DAYS"),
      "The 2300 Days",
    );
    assert.equal(displayPioneerChapterTitle("3 Angels' Messages"), "3 Angels' Messages");
    assert.equal(
      displayPioneerChapterTitle("1844 — The Midnight Cry"),
      "1844 — The Midnight Cry",
    );
  });

  it("does not crash on empty or odd strings", () => {
    assert.equal(displayPioneerChapterTitle(""), "");
    assert.equal(displayPioneerChapterTitle("   "), "");
    assert.equal(displayPioneerChapterTitle("02 -"), "");
    assert.equal(displayPioneerChapterTitle("!!!"), "!!!");
    assert.equal(displayPioneerChapterTitle(undefined as unknown as string), "");
    assert.equal(displayPioneerChapterTitle(null as unknown as string), "");
  });
});

const SHELF_SLUGS = [
  "joseph-bates",
  "james-white",
  "john-loughborough",
  "uriah-smith",
  "stephen-haskell",
  "at-jones",
  "ej-waggoner",
] as const;

describe("pioneer shelf author order", () => {
  it("orders authors by birth year, Loughborough before Smith", () => {
    const productionFirstNameOrder = [
      { slug: "at-jones", name: "Alonzo Trevier Jones" },
      { slug: "ej-waggoner", name: "Ellet Joseph Waggoner" },
      { slug: "james-white", name: "James Springer White" },
      { slug: "john-loughborough", name: "John Norton Loughborough" },
      { slug: "joseph-bates", name: "Joseph Bates" },
      { slug: "stephen-haskell", name: "Stephen Nelson Haskell" },
      { slug: "uriah-smith", name: "Uriah Smith" },
    ];
    assert.deepEqual(
      sortPioneerAuthorsByBirth(productionFirstNameOrder).map((author) => author.slug),
      [...SHELF_SLUGS],
    );
  });

  it("puts Loughborough before Smith even though Smith died earlier", () => {
    const smith = PIONEER_AUTHORS.find((author) => author.slug === "uriah-smith");
    const loughborough = PIONEER_AUTHORS.find((author) => author.slug === "john-loughborough");
    assert.equal(smith?.birthYear, 1832);
    assert.equal(loughborough?.birthYear, 1832);
    assert.equal(smith?.deathYear, 1903);
    assert.equal(loughborough?.deathYear, 1924);
    assert.ok((loughborough?.shelfOrder ?? 0) < (smith?.shelfOrder ?? 0));
    assert.deepEqual(
      sortPioneerAuthorsByBirth([{ slug: "uriah-smith" }, { slug: "john-loughborough" }]).map(
        (author) => author.slug,
      ),
      ["john-loughborough", "uriah-smith"],
    );
  });

  it("records the birth years used for that order", () => {
    assert.deepEqual(PIONEER_SHELF_SLUGS, [...SHELF_SLUGS]);
    assert.deepEqual(
      PIONEER_AUTHORS.map((author) => [author.slug, author.birthYear]),
      [
        ["joseph-bates", 1792],
        ["james-white", 1821],
        ["john-loughborough", 1832],
        ["uriah-smith", 1832],
        ["stephen-haskell", 1833],
        ["at-jones", 1850],
        ["ej-waggoner", 1855],
      ],
    );
  });

  it("sorts the shelf in the API, not ad-hoc in the UI", () => {
    const service = readFileSync(new URL("../server/services/pioneerService.ts", import.meta.url), "utf8");
    const shelf = readFileSync(new URL("../components/devotions-v2/PioneerShelf.tsx", import.meta.url), "utf8");
    assert.match(service, /sortPioneerAuthorsByBirth/);
    assert.doesNotMatch(shelf, /sortPioneerAuthorsByBirth|birthYear|\.sort\(/);
    assert.doesNotMatch(shelf, /localeCompare/);
  });
});

describe("pioneer public-domain copy", () => {
  it("uses a shelf-wide line on the authors list", () => {
    assert.equal(
      PIONEER_SHELF_PUBLIC_DOMAIN,
      "Public domain — all works on this shelf were published before 1929",
    );
  });

  it("keeps the per-work line for books and chapters", () => {
    assert.equal(
      publicDomainLine("Uriah Smith", "Daniel and the Revelation", 1907),
      "Public domain — Uriah Smith, Daniel and the Revelation (1907)",
    );
  });
});
