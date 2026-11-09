import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  chapterListTitle,
  readerHeaderLabel,
  readerHeaderTitleKey,
  readerHeaderTitleNaturalWidth,
  readerHeaderTitleWidth,
} from "../lib/reader-header-layout";
import { currentReaderHeaderActions, registerReaderHeaderActions } from "../lib/reader-header-store";
import { appVersionLine, shortUpdateId } from "../lib/app-version-line";

const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("reader header on the first native frame", () => {
  it("derives the title from the route params alone", () => {
    assert.equal(readerHeaderLabel({ bookId: "40", chapter: "5" }), "Matthew 5");
    assert.equal(readerHeaderLabel({ bookId: ["23"], chapter: ["40"] }), "Isaiah 40");
    assert.equal(readerHeaderLabel({ bookId: 19, chapter: 119 }), "Psalms 119");
    assert.equal(readerHeaderLabel({ bookId: "40" }), "Matthew");
    assert.equal(readerHeaderLabel(undefined), "");
    assert.equal(chapterListTitle({ bookId: "66" }), "Revelation");
    assert.equal(chapterListTitle({}), "Chapters");
  });

  it("gives a chapter the same explicit width as the chapter before it, and only clamps long names", () => {
    assert.equal(readerHeaderTitleKey({ bookId: "42", chapter: "1" }), "42-1");
    assert.equal(readerHeaderTitleKey({ bookId: ["42"], chapter: ["2"] }), "42-2");
    const luke1 = readerHeaderTitleWidth("Luke 1", 390, 1);
    const luke2 = readerHeaderTitleWidth("Luke 2", 390, 1);
    assert.equal(luke1, luke2);
    assert.equal(luke1, readerHeaderTitleNaturalWidth("Luke 1", 1));
    const matthew = readerHeaderTitleWidth("Matthew 5", 390, 1);
    assert.equal(matthew, readerHeaderTitleNaturalWidth("Matthew 5", 1));
    assert.ok(matthew > luke1);
    const thess = readerHeaderTitleWidth("1 Thessalonians 4", 390, 1);
    const song = readerHeaderTitleWidth("Song of Solomon 2", 390, 1);
    assert.equal(thess, song);
    assert.ok(thess < readerHeaderTitleNaturalWidth("1 Thessalonians 4", 1));
    assert.ok(song < readerHeaderTitleNaturalWidth("Song of Solomon 2", 1));
  });

  it("the layouts hand the reader and chapter list their header options, not the screen", () => {
    const root = read("app/_layout.tsx");
    const tab = read("app/(tabs)/read/_layout.tsx");
    for (const source of [root, tab]) {
      assert.match(source, /readerScreenOptions/);
      assert.match(source, /chapterListScreenOptions/);
      assert.match(source, /from "@\/components\/reader\/ReaderStackHeader"/);
    }
    assert.match(root, /name="read\/\[bookId\]\/\[chapter\]" options=\{readerScreenOptions\}/);
    assert.match(root, /name="read\/\[bookId\]\/index" options=\{chapterListScreenOptions\}/);
    assert.match(root, /name="scripture" options=\{readerScreenOptions\}/);
    assert.match(tab, /name="\[bookId\]\/\[chapter\]" options=\{readerScreenOptions\}/);
    assert.match(tab, /name="\[bookId\]\/index" options=\{chapterListScreenOptions\}/);
    assert.match(tab, /contentStyle: \{ backgroundColor: READER_HEADER_SURFACE \}/);
  });

  it("the header options carry title, back and title button from the params", () => {
    const header = read("components/reader/ReaderStackHeader.tsx");
    assert.match(header, /export function readerScreenOptions\(\{ route \}/);
    assert.match(header, /const label = readerHeaderLabel\(route\.params\)/);
    assert.match(header, /title: label/);
    assert.match(header, /headerBackVisible: false/);
    assert.match(header, /readerHeaderNavigationOptions\(route\.params, label\)/);
    assert.match(header, /headerLeft: \(\) => <ReaderHeaderBack key=\{`back-\$\{key\}`\} \/>/);
    assert.match(header, /<ReaderHeaderTitle key=\{key\} label=\{label\} \/>/);
    assert.match(header, /style=\{\[styles\.titleButton, \{ width \}\]\}/);
    assert.match(header, /collapsable=\{false\}/);
    assert.doesNotMatch(header, /flexGrow|flexShrink|minWidth: 0/);
    assert.match(header, /testID="reader-header-title"/);
    assert.match(header, /testID="bible-reader-back"/);
    assert.match(header, /export function chapterListScreenOptions/);
    assert.match(header, /title: chapterListTitle\(route\.params\)/);
  });

  it("the reader re-applies a keyed header whenever the chapter changes", () => {
    const reader = read("app/read/[bookId]/[chapter].tsx");
    assert.doesNotMatch(reader, /title: ""/);
    assert.doesNotMatch(reader, /headerLeft:/);
    assert.doesNotMatch(reader, /headerTitle:/);
    assert.match(reader, /readerHeaderNavigationOptions\(\{ bookId: routeBookId, chapter: routeChapter \}, headerLabel\)/);
    assert.match(
      reader,
      /useLayoutEffect\(\(\) => \{\s*navigation\.setOptions\(/,
    );
    assert.match(reader, /useFocusEffect\(\s*useCallback\(\s*\(\) =>\s*registerReaderHeaderActions\(/);
    assert.match(reader, /openChapterPicker: \(\) => setShowChapterPicker\(true\)/);
    assert.doesNotMatch(reader, /setReaderHeaderWidths/);
    assert.doesNotMatch(reader, /@react-navigation\//);
  });

  it("the chapter list titles itself from the book id before the books request returns", () => {
    const list = read("app/read/[bookId]/index.tsx");
    assert.match(list, /title: book\?\.name \|\| chapterListTitle\(\{ bookId \}\)/);
  });

  it("the lazy-route fallback uses the cream surface", () => {
    const lazy = read("lib/lazy-screen.tsx");
    assert.match(lazy, /backgroundColor: SWEEP_LIGHT\.background/);
    assert.match(lazy, /<ActivityIndicator color=\{SWEEP_LIGHT\.text\} \/>/);
  });

  it("the store hands the header the focused reader's actions", () => {
    assert.equal(currentReaderHeaderActions(), undefined);
    const first = { openChapterPicker: () => {}, goBack: () => {} };
    const second = { openChapterPicker: () => {}, goBack: () => {} };
    const releaseFirst = registerReaderHeaderActions(first);
    const releaseSecond = registerReaderHeaderActions(second);
    assert.equal(currentReaderHeaderActions(), second);
    releaseSecond();
    assert.equal(currentReaderHeaderActions(), first);
    releaseFirst();
    assert.equal(currentReaderHeaderActions(), undefined);
  });
});

describe("no route falls back to its raw name as a header title", () => {
  function routeNames(dir: string, prefix = ""): string[] {
    const names: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        names.push(...routeNames(full, `${prefix}${entry}/`));
        continue;
      }
      if (!/\.tsx?$/.test(entry) || /^(_layout|\+)/.test(entry)) continue;
      const name = `${prefix}${entry.replace(/\.tsx?$/, "")}`.replace(/\/index$/, "");
      if (name !== "index") names.push(name);
    }
    return names;
  }

  it("every root-stack route is declared in app/_layout.tsx", () => {
    const root = read("app/_layout.tsx");
    const missing = routeNames(path.join(ROOT, "app"))
      .filter((name) => !name.startsWith("(tabs)/") && !name.startsWith("(auth)/"))
      .filter((name) => !root.includes(`name="${name}"`) && !root.includes(`name="${name}/index"`));
    assert.deepEqual(missing, []);
  });

  it("every dynamic root route has a title or hides the header", () => {
    const root = read("app/_layout.tsx");
    for (const name of routeNames(path.join(ROOT, "app")).filter((n) => /\[.+\]/.test(n) && !n.startsWith("(tabs)/"))) {
      const escaped = name.replace(/[[\]/]/g, (c) => `\\${c}`);
      const match = root.match(new RegExp(`name="${escaped}(?:\\/index)?" options=\\{([^\\n]+)\\}`));
      assert.ok(match, `${name} is declared`);
      assert.match(match![1], /headerShown: false|title:|readerScreenOptions|chapterListScreenOptions/, name);
    }
  });
});

describe("settings shows which bundle is running", () => {
  it("formats version, channel and the short update id", () => {
    assert.equal(shortUpdateId("1a2b3c4d-5e6f-7a8b-9c0d-ef1234567890"), "1a2b3c4d");
    assert.equal(shortUpdateId(null), "");
    assert.equal(
      appVersionLine({ version: "1.0.0", channel: "preview", updateId: "1a2b3c4d-5e6f-7a8b-9c0d-ef1234567890", isEmbeddedLaunch: false }),
      "Version 1.0.0 · preview · update 1a2b3c4d",
    );
    assert.equal(
      appVersionLine({ version: "1.0.0", channel: "preview", updateId: null, isEmbeddedLaunch: true }),
      "Version 1.0.0 · preview · built-in",
    );
    assert.equal(appVersionLine({ version: null, channel: "", updateId: null, isEmbeddedLaunch: false }), "Version 1.0.0 · built-in");
    assert.equal(
      appVersionLine({ version: "1.0.0", channel: "production", updateId: "abcdef12-0000", isEmbeddedLaunch: true }),
      "Version 1.0.0 · production · built-in",
    );
  });

  it("settings reads expo-updates and prints the line at the bottom", () => {
    const settings = read("app/settings.tsx");
    assert.match(settings, /import \* as Updates from "expo-updates"/);
    assert.match(settings, /channel: Updates\.channel/);
    assert.match(settings, /updateId: Updates\.updateId/);
    assert.match(settings, /isEmbeddedLaunch: Updates\.isEmbeddedLaunch/);
    assert.match(settings, /rightText: APP_VERSION/);
    assert.match(settings, /testID="settings-app-version"/);
    assert.ok(settings.indexOf('testID="settings-app-version"') > settings.indexOf('testID="settings-delete-account"'));
  });
});
