import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  ANDROID_TOOLBAR_SIDE_INSETS,
  BIBLE_BOOK_SHORT_NAMES,
  bibleBookShortName,
  chapterListTitle,
  READER_HEADER_AA_PADDING,
  READER_HEADER_BACK_ICON,
  READER_HEADER_BACK_PADDING,
  READER_HEADER_CHEVRON_GAP,
  READER_HEADER_CHEVRON_SIZE,
  READER_HEADER_CHIP_FONT_CAP,
  READER_HEADER_CHIP_GAP,
  READER_HEADER_PILL_PADDING,
  READER_HEADER_TITLE_FONT_CAP,
  READER_HEADER_TITLE_FONT_SIZE,
  READER_HEADER_TITLE_TEXT_WIDTH,
  READER_HEADER_TITLE_WIDTH,
  READER_HEADER_TOGGLE_PADDING,
  READER_VERSION_CHIP_MAX_WIDTH,
  readerHeaderAccessibilityLabel,
  readerHeaderLabel,
  readerHeaderTitle,
} from "../lib/reader-header-layout";
import { currentReaderHeaderActions, registerReaderHeaderActions } from "../lib/reader-header-store";
import { appVersionLine, shortUpdateId } from "../lib/app-version-line";

const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

/** Advance widths from a TrueType font (hmtx + format-4 cmap), in px at a given size. */
function fontMeasurer(rel: string): (text: string, px: number) => number {
  const buf = readFileSync(path.join(ROOT, rel));
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const tables: Record<string, number> = {};
  for (let i = 0; i < dv.getUint16(4); i++) {
    const o = 12 + i * 16;
    tables[String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3])] = dv.getUint32(o + 8);
  }
  const unitsPerEm = dv.getUint16(tables.head + 18);
  const numHMetrics = dv.getUint16(tables.hhea + 34);
  const advance = (gid: number) => dv.getUint16(tables.hmtx + Math.min(gid, numHMetrics - 1) * 4);
  let sub = -1;
  for (let i = 0; i < dv.getUint16(tables.cmap + 2); i++) {
    const off = dv.getUint32(tables.cmap + 8 + i * 8);
    if (dv.getUint16(tables.cmap + off) === 4) sub = tables.cmap + off;
  }
  const segX2 = dv.getUint16(sub + 6);
  const ends = sub + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const ranges = deltas + segX2;
  const glyphFor = (cp: number) => {
    for (let s = 0; s < segX2 / 2; s++) {
      if (cp > dv.getUint16(ends + s * 2)) continue;
      const start = dv.getUint16(starts + s * 2);
      if (cp < start) return 0;
      const delta = dv.getInt16(deltas + s * 2);
      const ro = dv.getUint16(ranges + s * 2);
      if (ro === 0) return (cp + delta) & 0xffff;
      const g = dv.getUint16(ranges + s * 2 + ro + (cp - start) * 2);
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
    return 0;
  };
  return (text, px) => {
    let units = 0;
    for (const ch of text) units += advance(glyphFor(ch.codePointAt(0)!));
    return (units / unitsPerEm) * px;
  };
}

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

  it("shows the book's short name and describes the full name and chapter to screen readers", () => {
    assert.equal(Object.keys(BIBLE_BOOK_SHORT_NAMES).length, 66);
    for (let id = 1; id <= 66; id++) assert.ok(bibleBookShortName(id), `book ${id}`);
    assert.equal(bibleBookShortName(1), "Gen");
    assert.equal(bibleBookShortName("19"), "Ps");
    assert.equal(bibleBookShortName(22), "Song");
    assert.equal(bibleBookShortName(40), "Matt");
    assert.equal(bibleBookShortName(42), "Luke");
    assert.equal(bibleBookShortName(52), "1 Thess");
    assert.equal(bibleBookShortName(57), "Phlm");
    assert.equal(bibleBookShortName(66), "Rev");
    assert.equal(bibleBookShortName(67), "");
    assert.equal(bibleBookShortName("x"), "");
    assert.equal(readerHeaderTitle({ bookId: "42", chapter: "2" }), "Luke");
    assert.equal(readerHeaderTitle({ bookId: ["23"], chapter: ["40"] }), "Isa");
    assert.equal(readerHeaderAccessibilityLabel({ bookId: "42", chapter: "2" }), "Luke chapter 2, change book or chapter");
    assert.equal(readerHeaderAccessibilityLabel({ bookId: "52", chapter: "4" }), "1 Thessalonians chapter 4, change book or chapter");
    assert.equal(readerHeaderAccessibilityLabel({}), "Change book or chapter");
  });

  it("the fixed title fits the widest short form, and title plus chips fit a 390px Android header", () => {
    const lora = fontMeasurer("node_modules/@expo-google-fonts/lora/600SemiBold/Lora_600SemiBold.ttf");
    const inter = fontMeasurer("node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf");
    const titlePx = READER_HEADER_TITLE_FONT_SIZE * READER_HEADER_TITLE_FONT_CAP;
    const widest = Math.max(...Object.values(BIBLE_BOOK_SHORT_NAMES).map((s) => lora(s, titlePx)));
    assert.ok(widest <= READER_HEADER_TITLE_TEXT_WIDTH, `widest short form ${widest.toFixed(1)}px vs ${READER_HEADER_TITLE_TEXT_WIDTH}px`);
    assert.equal(READER_HEADER_TITLE_TEXT_WIDTH + READER_HEADER_CHEVRON_GAP + READER_HEADER_CHEVRON_SIZE, READER_HEADER_TITLE_WIDTH);

    const chipPx = (base: number) => base * READER_HEADER_CHIP_FONT_CAP;
    const versionText = (version: string) => Math.min(inter(version, chipPx(13)), READER_VERSION_CHIP_MAX_WIDTH);
    const chips = (version: string) =>
      inter("Word study", chipPx(11)) + 0.2 * 10 + READER_HEADER_TOGGLE_PADDING * 2 +
      inter("Compare", chipPx(11)) + 0.2 * 7 + READER_HEADER_TOGGLE_PADDING * 2 +
      inter("AA", chipPx(15)) - 0.5 * 2 + READER_HEADER_AA_PADDING * 2 +
      13 + 4 + versionText(version) + READER_HEADER_PILL_PADDING * 2 +
      READER_HEADER_CHIP_GAP * 3;
    const back = READER_HEADER_BACK_ICON + READER_HEADER_BACK_PADDING * 2;
    const available = 390 - ANDROID_TOOLBAR_SIDE_INSETS;
    // Four-letter codes show in full; longer ones ellipsize inside the chip's cap.
    for (const version of ["KJV", "NKJV", "NASB"]) {
      assert.ok(inter(version, chipPx(13)) <= READER_VERSION_CHIP_MAX_WIDTH, `${version} fits its chip`);
    }
    for (const version of ["KJV", "NKJV", "SRP1865"]) {
      const used = back + READER_HEADER_TITLE_WIDTH + chips(version);
      assert.ok(used <= available, `${version}: ${used.toFixed(1)}px used of ${available}px`);
    }
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
    assert.match(header, /const title = readerHeaderTitle\(route\.params\)/);
    assert.match(header, /const accessibilityLabel = readerHeaderAccessibilityLabel\(route\.params\)/);
    assert.match(header, /title: readerHeaderLabel\(route\.params\)/);
    assert.match(header, /headerBackVisible: false/);
    assert.match(header, /headerLeft: \(\) => <ReaderHeaderBack \/>/);
    assert.match(header, /headerTitle: \(\) => <ReaderHeaderTitle title=\{title\} accessibilityLabel=\{accessibilityLabel\} \/>/);
    assert.match(header, /titleButton: \{\s*width: READER_HEADER_TITLE_WIDTH,/);
    assert.match(header, /titleTextBox: \{\s*width: READER_HEADER_TITLE_TEXT_WIDTH,/);
    assert.match(header, /maxFontSizeMultiplier=\{READER_HEADER_TITLE_FONT_CAP\}/);
    assert.match(header, /numberOfLines=\{1\}/);
    assert.match(header, /size=\{READER_HEADER_CHEVRON_SIZE\}/);
    assert.doesNotMatch(header, /flex:|flexGrow|flexShrink|maxWidth|key=|useWindowDimensions|PixelRatio|readerHeaderTitleWidth/);
    assert.match(header, /testID="reader-header-title"/);
    assert.match(header, /testID="bible-reader-back"/);
    assert.match(header, /export function chapterListScreenOptions/);
    assert.match(header, /title: chapterListTitle\(route\.params\)/);
  });

  it("the reader leaves the header to the layout and keeps the chips at a fixed size", () => {
    const reader = read("app/read/[bookId]/[chapter].tsx");
    assert.doesNotMatch(reader, /title: ""/);
    assert.doesNotMatch(reader, /headerLeft:/);
    assert.doesNotMatch(reader, /headerTitle:/);
    assert.doesNotMatch(reader, /navigation\.setOptions|readerHeaderNavigationOptions|useNavigation/);
    assert.equal((reader.match(/maxFontSizeMultiplier=\{READER_HEADER_CHIP_FONT_CAP\}/g) ?? []).length, 4);
    assert.match(reader, /gap: READER_HEADER_CHIP_GAP/);
    assert.match(reader, /paddingHorizontal: READER_HEADER_TOGGLE_PADDING/);
    assert.match(reader, /padding: READER_HEADER_AA_PADDING/);
    assert.match(reader, /paddingHorizontal: READER_HEADER_PILL_PADDING/);
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
