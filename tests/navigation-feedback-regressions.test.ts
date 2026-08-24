import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const tabEntrySource = readFileSync(
  new URL("../app/(tabs)/read.tsx", import.meta.url),
  "utf8",
);
const tabLayoutSource = readFileSync(
  new URL("../app/(tabs)/_layout.tsx", import.meta.url),
  "utf8",
);
const readerSource = readFileSync(
  new URL("../app/read/[bookId]/[chapter].tsx", import.meta.url),
  "utf8",
);
const tabReaderRouteSource = readFileSync(
  new URL(
    "../app/(tabs)/bible-reader/[bookId]/[chapter].tsx",
    import.meta.url,
  ),
  "utf8",
);
const rootLayoutSource = readFileSync(
  new URL("../app/_layout.tsx", import.meta.url),
  "utf8",
);

describe("external tester navigation feedback", () => {
  it("keeps Bible entry and chapter navigation inside the tab navigator", () => {
    assert.match(
      tabEntrySource,
      /pathname:\s*"\/\(tabs\)\/bible-reader\/\[bookId\]\/\[chapter\]"/,
    );
    assert.match(tabLayoutSource, /name="bible-reader"/);
    assert.match(tabLayoutSource, /name="bible-reader"[\s\S]*?href:\s*null/);
    assert.match(tabReaderRouteSource, /read\/\[bookId\]\/\[chapter\]/);
    assert.match(readerSource, /useSegments/);
    assert.match(readerSource, /isTabReader/);
    assert.match(readerSource, /router\.replace\(readerRoute\(/);
    assert.doesNotMatch(
      readerSource,
      /router\.replace\(`\/read\/\$\{bookId\}/,
    );
  });

  it("shows onboarding only when the stored first-time flag requires it", () => {
    assert.match(
      rootLayoutSource,
      /needsOnboarding\s*\?\s*"\/onboarding"\s*:\s*"\/\(tabs\)"/,
    );
    assert.doesNotMatch(
      rootLayoutSource,
      /Always show the splash\/intro on every launch/,
    );
  });
});