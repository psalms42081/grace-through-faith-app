import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const tabEntrySource = readFileSync(
  new URL("../components/bible/BibleEntryScreen.tsx", import.meta.url),
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
    "../app/(tabs)/read/[bookId]/[chapter].tsx",
    import.meta.url,
  ),
  "utf8",
);
const bibleTabStackSource = readFileSync(
  new URL("../app/(tabs)/read/_layout.tsx", import.meta.url),
  "utf8",
);
const sabbathSchoolTabStackSource = readFileSync(
  new URL("../app/(tabs)/ss/_layout.tsx", import.meta.url),
  "utf8",
);
const sabbathSchoolTabDaySource = readFileSync(
  new URL("../app/(tabs)/sabbath-school-day.tsx", import.meta.url),
  "utf8",
);
const sabbathSchoolTabQuarterSource = readFileSync(
  new URL("../app/(tabs)/sabbath-school-quarter.tsx", import.meta.url),
  "utf8",
);
const sabbathSchoolDaySource = readFileSync(
  new URL("../app/(tabs)/sabbath-school-day.tsx", import.meta.url),
  "utf8",
);
const sabbathSchoolContainmentSource = readFileSync(
  new URL("../lib/sabbath-school-route-containment.ts", import.meta.url),
  "utf8",
);
const rootLayoutSource = readFileSync(
  new URL("../app/_layout.tsx", import.meta.url),
  "utf8",
);
const devotionsSource = readFileSync(
  new URL("../components/devotions-v2/DevotionsPreview.tsx", import.meta.url),
  "utf8",
);
const devotionsPrimitivesSource = readFileSync(
  new URL("../components/devotions-v2/PreviewPrimitives.tsx", import.meta.url),
  "utf8",
);

describe("external tester navigation feedback", () => {
  it("keeps Bible entry and chapter navigation inside the tab navigator", () => {
    assert.match(
      tabEntrySource,
      /pathname:\s*"\/\(tabs\)\/read\/\[bookId\]\/\[chapter\]"/,
    );
    assert.match(tabLayoutSource, /name="read"/);
    assert.doesNotMatch(tabLayoutSource, /name="bible-reader"/);
    assert.match(bibleTabStackSource, /name="\[bookId\]\/\[chapter\]"/);
    assert.match(tabReaderRouteSource, /read\/\[bookId\]\/\[chapter\]/);
    assert.match(readerSource, /useSegments/);
    assert.match(readerSource, /isTabReader/);
    assert.match(readerSource, /readerBasePath\s*=\s*isTabReader\s*\?\s*"\/\(tabs\)\/read"/);
    assert.match(readerSource, /router\.replace\(readerRoute\(/);
    assert.doesNotMatch(
      readerSource,
      /router\.replace\(`\/read\/\$\{bookId\}/,
    );
  });

  it("keeps the Sabbath School chain inside the tab navigator", () => {
    assert.equal(
      existsSync(new URL("../app/sabbath-school-day.tsx", import.meta.url)),
      false,
    );
    assert.equal(
      existsSync(new URL("../app/sabbath-school-quarter.tsx", import.meta.url)),
      false,
    );
    assert.match(tabLayoutSource, /name="ss"[\s\S]*?href:\s*null/);
    assert.match(
      tabLayoutSource,
      /name="sabbath-school-day"[\s\S]*?href:\s*null/,
    );
    assert.match(
      tabLayoutSource,
      /name="sabbath-school-quarter"[\s\S]*?href:\s*null/,
    );
    assert.match(tabLayoutSource, /isSabbathSchoolTabPath\(pathname\)/);
    assert.match(
      sabbathSchoolContainmentSource,
      /pathname\.startsWith\("\/ss\/sabbath-school"\)[\s\S]*?pathname === "\/sabbath-school-day"[\s\S]*?pathname === "\/sabbath-school-quarter"/,
    );
    assert.match(sabbathSchoolTabStackSource, /headerShown:\s*false/);
    assert.match(sabbathSchoolTabDaySource, /sabbath-school-day/);
    assert.match(sabbathSchoolTabQuarterSource, /sabbath-school-quarter/);
    assert.match(
      sabbathSchoolContainmentSource,
      /router\.replace\(\{[\s\S]*?pathname:\s*sabbathSchoolPublicPath\(screen\)[\s\S]*?params:/,
    );
    assert.match(
      sabbathSchoolDaySource,
      /useSabbathSchoolTabContainment/,
    );
    assert.match(
      sabbathSchoolDaySource,
      /sabbathSchoolTabBarClearance/,
    );
    assert.match(
      rootLayoutSource,
      /directEntryPaths[\s\S]*?"\/sabbath-school"[\s\S]*?"\/sabbath-school-quarter"[\s\S]*?"\/sabbath-school-day"[\s\S]*?"\/sabbath-school-day-tutor"[\s\S]*?"\/sabbath-school-discussion"/,
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

  it("keeps the guest Devotions hero intact and centers web tab content", () => {
    assert.match(
      devotionsSource,
      /testID="devotions-preview-hero"[\s\S]*?A little time with God, today\./,
    );
    assert.match(devotionsPrimitivesSource, /<BookOpen /);
    assert.doesNotMatch(
      devotionsPrimitivesSource,
      /<Ionicons name="book-outline"/,
    );
    assert.match(
      tabLayoutSource,
      /sceneStyle:\s*isWeb\s*\?\s*styles\.webScene\s*:\s*undefined/,
    );
    assert.match(
      tabLayoutSource,
      /webScene:[\s\S]*?maxWidth:\s*700[\s\S]*?alignSelf:\s*"center"/,
    );
  });
});