import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const tabEntrySource = readFileSync(
  new URL("../components/bible/useResumeBibleTabChapter.ts", import.meta.url),
  "utf8",
);
const bookPickerSource = readFileSync(
  new URL("../app/book-picker.tsx", import.meta.url),
  "utf8",
);
const bibleTabNavSource = readFileSync(
  new URL("../lib/bible-tab-navigation.ts", import.meta.url),
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
const homeHeaderSource = readFileSync(
  new URL("../components/home-v2/HomeHeader.tsx", import.meta.url),
  "utf8",
);
const homeV2Source = readFileSync(
  new URL("../app/(tabs)/home-v2.tsx", import.meta.url),
  "utf8",
);
const discoverV2Source = readFileSync(
  new URL("../app/discover-v2.tsx", import.meta.url),
  "utf8",
);
const legacyHomeSource = readFileSync(
  new URL("../app/(tabs)/index.tsx", import.meta.url),
  "utf8",
);

describe("external tester navigation feedback", () => {
  it("keeps Bible entry and chapter navigation inside the tab navigator", () => {
    assert.match(tabEntrySource, /router\.push\(bibleTabReaderPath/);
    assert.doesNotMatch(tabEntrySource, /router\.replace/);
    assert.match(bookPickerSource, /useResumeBibleTabChapter\(isBibleTabHome\)/);
    assert.match(bookPickerSource, /testID="bible-books-back"/);
    assert.match(bibleTabNavSource, /goBibleReaderBack/);
    assert.match(tabLayoutSource, /backBehavior="firstRoute"/);
    assert.match(tabLayoutSource, /name="read"/);
    assert.doesNotMatch(tabLayoutSource, /name="bible-reader"/);
    assert.match(bibleTabStackSource, /initialRouteName:\s*"index"/);
    assert.match(bibleTabStackSource, /name="\[bookId\]\/index"/);
    assert.match(bibleTabStackSource, /name="\[bookId\]\/\[chapter\]"/);
    assert.match(tabReaderRouteSource, /read\/\[bookId\]\/\[chapter\]/);
    assert.doesNotMatch(readerSource, /@react-navigation\//);
    assert.doesNotMatch(bookPickerSource, /@react-navigation\//);
    assert.doesNotMatch(
      readFileSync(new URL("../app/read/[bookId]/index.tsx", import.meta.url), "utf8"),
      /@react-navigation\//,
    );
    assert.match(readerSource, /useCanPopNestedStack\(\)/);
    assert.match(readerSource, /goBibleReaderBack\(router, canPopStack, isTabReader\)/);
    assert.match(readerSource, /testID="bible-reader-back"/);
    assert.match(readerSource, /useHardwareBackToHomeWhenAtStackRoot\(isTabReader, canPopStack\)/);
    assert.match(readerSource, /openBibleTabBooks\(router, canPopStack\)/);
    assert.match(readerSource, /useSegments/);
    assert.match(readerSource, /isTabReader/);
    assert.match(readerSource, /readerBasePath\s*=\s*isTabReader\s*\?\s*"\/\(tabs\)\/read"/);
    assert.match(readerSource, /router\.replace\(readerRoute\(/);
    assert.doesNotMatch(
      readerSource,
      /router\.replace\(`\/read\/\$\{bookId\}/,
    );
    assert.doesNotMatch(readerSource, /onPress=\{\(\) => router\.back\(\)\}/);
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
      sabbathSchoolContainmentSource,
      /useRef\(segments\[0\]\s*===\s*"\(tabs\)"\)/,
    );
    assert.doesNotMatch(
      sabbathSchoolContainmentSource,
      /const isTabContained = segments\[0\]\s*===\s*"\(tabs\)"/,
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

  it("redirects web cold-load / to Home without changing native tabs entry", () => {
    assert.match(rootLayoutSource, /Platform\.OS === "web"/);
    assert.match(
      rootLayoutSource,
      /needsOnboarding \? "\/onboarding" : "\/home-v2"/,
    );
    assert.match(
      rootLayoutSource,
      /needsOnboarding\s*\?\s*"\/onboarding"\s*:\s*"\/\(tabs\)"/,
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

  it("carries the current Bible chapter into Guided Study", () => {
    assert.match(
      readerSource,
      /label:\s*"Guided Study"[\s\S]*?pathname:\s*"\/study-guide"[\s\S]*?verseReference:\s*`\$\{bookName\} \$\{chapterNum\}:1`[\s\S]*?chapter:\s*String\(chapterNum\)[\s\S]*?verse:\s*"1"/,
    );
  });

  it("keeps profile avatars out of non-Profile headers", () => {
    assert.match(
      homeHeaderSource,
      /accessibilityLabel="Switch to Kids Mode"[\s\S]*?accessibilityLabel=\{`\$\{streak\} day reading streak`\}/,
    );
    assert.doesNotMatch(homeHeaderSource, /avatar|initial|Profile/);
    assert.doesNotMatch(homeV2Source, /onAvatarPress=|initial=\{/);

    assert.match(
      discoverV2Source,
      /<Text style=\{s\.title\}>Discover<\/Text>[\s\S]*?<View style=\{\{ flex: 1 \}\} \/>[\s\S]*?<View style=\{s\.streakPill\}/,
    );
    assert.doesNotMatch(discoverV2Source, /s\.avatar|avatarInitial|Open profile/);

    const kidsHomeSource = legacyHomeSource.slice(
      legacyHomeSource.indexOf("function KidsHomeScreen()"),
      legacyHomeSource.indexOf("export default function HomeScreen()"),
    );
    assert.match(kidsHomeSource, /accessibilityLabel="Switch child"/);
    assert.match(kidsHomeSource, /accessibilityLabel="Exit Kids Mode"/);
    assert.doesNotMatch(kidsHomeSource, /avatar|Open profile/);
  });
});