import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { bibleBookNamesMatch } from "../components/home-v2/home-data";

const homeSource = readFileSync(
  new URL("../app/(tabs)/home-v2.tsx", import.meta.url),
  "utf8",
);
const sabbathSchoolSource = readFileSync(
  new URL("../app/sabbath-school.tsx", import.meta.url),
  "utf8",
);
const themeSource = readFileSync(
  new URL("../hooks/useTheme.ts", import.meta.url),
  "utf8",
);
const authLayoutSource = readFileSync(
  new URL("../app/(auth)/_layout.tsx", import.meta.url),
  "utf8",
);
const loginSource = readFileSync(
  new URL("../app/(auth)/login.tsx", import.meta.url),
  "utf8",
);
const registerSource = readFileSync(
  new URL("../app/(auth)/register.tsx", import.meta.url),
  "utf8",
);
const odbDevotionalSource = readFileSync(
  new URL("../app/odb-devotional.tsx", import.meta.url),
  "utf8",
);

describe("daily Home and theme resilience", () => {
  it("matches the Psalm reference to the canonical Psalms book name", () => {
    assert.equal(bibleBookNamesMatch("Psalm", "Psalms"), true);
    assert.equal(bibleBookNamesMatch("2 Corinthians", "2 Corinthians"), true);
    assert.equal(bibleBookNamesMatch("John", "Joshua"), false);
  });

  it("does not represent an unresolved VOTD dependency as loading forever", () => {
    assert.doesNotMatch(homeSource, /verseLoading\s*=\s*!canFetchVotd/);
    assert.match(homeSource, /booksIsError\s*\|\|/);
    assert.match(homeSource, /dateKey:\s*localDay\.dateKey/);
    assert.match(homeSource, /timeZone:\s*deviceTimeZone/);
  });

  it("keys Sabbath School current content by local date without changing the URL", () => {
    assert.match(
      sabbathSchoolSource,
      /queryKey:\s*\[[\s\S]*?"sabbath-school-current"[\s\S]*?localDateKey/,
    );
    assert.match(sabbathSchoolSource, /queryFn:\s*async[\s\S]*?withDeviceTimeZone/);
    assert.doesNotMatch(
      sabbathSchoolSource,
      /sabbath-school\/current[^`]*dateKey=/,
    );
    assert.match(
      homeSource,
      /currentLesson\?\.days\.find\(\(day\) => day\.dayNumber === ssDayIndex\)\?\.title/,
    );
    assert.match(homeSource, /lessonTitle=\{ssTodayTitle\}/);
    assert.match(homeSource, /`\$\{dayLabel\} — \$\{ssTodayTitle\}`/);
  });

  it("keeps shared member screens light-first", () => {
    assert.match(themeSource, /const isDark = false/);
    assert.match(themeSource, /KidsColors\.light/);
    assert.match(themeSource, /Colors\.light/);
    assert.doesNotMatch(themeSource, /const isDark = true/);
    assert.doesNotMatch(authLayoutSource, /#050507/);
    assert.doesNotMatch(loginSource, /backgroundColor:\s*"#050507"/);
    assert.doesNotMatch(registerSource, /backgroundColor:\s*"#050507"/);
    assert.match(odbDevotionalSource, /backgroundColor:\s*PathB\.surface/);
    assert.doesNotMatch(odbDevotionalSource, /const BG = "#050507"/);
  });
});