import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import OpenAI from "openai";
import {
  aiScriptureTranslation,
  isYouVersionCode,
  isYouVersionScriptureQuery,
  isYouVersionScriptureQueryKey,
  youVersionBibleId,
  youVersionCode,
} from "../shared/youversion";
import {
  aiRequestFetch,
  assertNoYouVersionInAiRequest,
  YouVersionInAiRequestError,
} from "../server/services/ai-request-guard";
import { openaiClientOptions } from "../server/openai-env";
import { parseYouVersionChapterHtml } from "../server/services/youversion-html";
import {
  filterTranslationGroups,
  groupTranslationsByLanguage,
  isSearchableTranslation,
  translationLabel,
  type CatalogTranslation,
} from "../lib/translation-catalog";

const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(path.join(ROOT, dir))) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const rel = path.join(dir, name);
    if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}

describe("YouVersion codes", () => {
  it("round-trips a Platform bible id", () => {
    assert.equal(youVersionCode(2692), "YV2692");
    assert.equal(youVersionBibleId("yv2692"), 2692);
    assert.equal(youVersionBibleId("KJV"), null);
    assert.equal(isYouVersionCode("YV110"), true);
    assert.equal(isYouVersionCode("NLT"), false);
  });

  it("serves NIV, AMP and NASB from YouVersion under their familiar codes", () => {
    assert.equal(youVersionBibleId("niv"), 111);
    assert.equal(youVersionBibleId("AMP"), 1588);
    assert.equal(youVersionBibleId("NASB"), 100);
    assert.equal(youVersionCode(111), "NIV");
    assert.equal(youVersionCode(1588), "AMP");
    assert.equal(youVersionCode(100), "NASB");
    assert.equal(youVersionCode(2692), "YV2692");
    assert.equal(youVersionBibleId("constructor"), null);
  });

  it("maps every YouVersion code to the local KJV for AI features", () => {
    assert.equal(aiScriptureTranslation("YV2692"), "KJV");
    assert.equal(aiScriptureTranslation("yv110"), "KJV");
    assert.equal(aiScriptureTranslation("NIV"), "KJV");
    assert.equal(aiScriptureTranslation("NASB"), "KJV");
    assert.equal(aiScriptureTranslation("NLT"), "NLT");
    assert.equal(aiScriptureTranslation("KJV"), "KJV");
  });
});

describe("YouVersion Scripture never reaches an AI request", () => {
  it("rejects a request body naming a YouVersion version or verse id", () => {
    for (const body of [
      JSON.stringify({ messages: [{ role: "user", content: "Explain John 3:16 (YV2692)" }] }),
      JSON.stringify({ input: "verse yv110-43-3-16" }),
    ]) {
      assert.throws(() => assertNoYouVersionInAiRequest(body), YouVersionInAiRequestError);
    }
    assert.doesNotThrow(() =>
      assertNoYouVersionInAiRequest(JSON.stringify({ messages: [{ role: "user", content: "John 3:16 (KJV)" }] })),
    );
  });

  it("rejects an aliased version named as the request's translation, without blocking prose", () => {
    for (const body of [
      JSON.stringify({ translation: "NIV" }),
      JSON.stringify({ messages: [{ role: "user", content: JSON.stringify({ translationCode: "nasb" }) }] }),
    ]) {
      assert.throws(() => assertNoYouVersionInAiRequest(body), YouVersionInAiRequestError);
    }
    assert.doesNotThrow(() =>
      assertNoYouVersionInAiRequest(JSON.stringify({ messages: [{ role: "user", content: "I grew up reading the NIV" }] })),
    );
  });

  it("the guarded fetch refuses before anything leaves the server", async () => {
    await assert.rejects(
      aiRequestFetch("http://127.0.0.1:9/v1/chat/completions", {
        method: "POST",
        body: JSON.stringify({ translation: "YV2692" }),
      }),
      YouVersionInAiRequestError,
    );
  });

  it("an OpenAI client built from openaiClientOptions() refuses a YouVersion prompt", async () => {
    const saved = { key: process.env.OPENAI_API_KEY, base: process.env.OPENAI_BASE_URL };
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
    try {
      const client = new OpenAI({ ...openaiClientOptions(), maxRetries: 0 });
      await assert.rejects(
        client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Explain Mark 1:17 in YV2692" }],
        }),
        (err: unknown) =>
          err instanceof YouVersionInAiRequestError ||
          (err instanceof Error && (err as any).cause instanceof YouVersionInAiRequestError),
      );
    } finally {
      if (saved.key === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = saved.key;
      if (saved.base === undefined) delete process.env.OPENAI_BASE_URL;
      else process.env.OPENAI_BASE_URL = saved.base;
    }
  });

  it("every OpenAI client on the server uses the guarded fetch", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles("server")) {
      const src = read(file);
      for (const match of src.matchAll(/new OpenAI\(\{([\s\S]*?)\}\)/g)) {
        if (!/openaiClientOptions\(\)|fetch:\s*aiRequestFetch/.test(match[1])) offenders.push(file);
      }
    }
    assert.deepEqual(offenders, []);
  });

  it("only the reader routes import the YouVersion text fetchers", () => {
    const importers = [...sourceFiles("server"), ...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")]
      .filter((file) => !/server[\\/]services[\\/]youversion/.test(file))
      .filter((file) => /services\/youversion(?:-html)?["']/.test(read(file)))
      .map((file) => file.replace(/\\/g, "/"));
    assert.deepEqual(importers, ["server/routes/bible.ts"]);
  });

  it("every translation normaliser used by AI routes maps YouVersion to KJV", () => {
    const service = read("server/services/scripture-service.ts");
    const normaliser = service.slice(service.indexOf("export function normalizeTranslationParam"));
    assert.match(normaliser.slice(0, normaliser.indexOf("\n}\n")), /aiScriptureTranslation\(/);
    for (const file of ["server/routes/strongs.ts", "server/routes/study-guide.ts"]) {
      const src = read(file);
      const fn = src.slice(src.indexOf("function normalizeTranslation"));
      assert.match(fn.slice(0, fn.indexOf("\n}\n")), /aiScriptureTranslation\(/, file);
    }
  });

  it("the verse sheet sends KJV to Explain This Verse and skips the AI verse map", () => {
    const sheet = read("components/reader/VerseSheet.tsx");
    assert.match(sheet, /first\?\.id && !youVersionText/);
    assert.match(sheet, /translation: aiScriptureTranslation\(translation\)/);
    assert.match(read("app/verse-explain.tsx"), /aiScriptureTranslation\(translation \|\| "KJV"\)/);
    assert.match(read("app/verse-actions.tsx"), /!isYouVersionCode\(t\.abbreviation\)/);
  });
});

describe("YouVersion text stays off the device and the key stays on the server", () => {
  it("query persistence skips YouVersion passages", () => {
    assert.equal(isYouVersionScriptureQueryKey("/api/passage?book=41&chapter=1&translation=YV2692"), true);
    assert.equal(isYouVersionScriptureQueryKey("/api/verse?book=41&chapter=1&verse=17&translation=YV110"), true);
    assert.equal(isYouVersionScriptureQueryKey("/api/passage?book=41&chapter=1&translation=NIV"), true);
    assert.equal(isYouVersionScriptureQueryKey("/api/passage?book=41&chapter=1&translation=KJV"), false);
    assert.equal(isYouVersionScriptureQuery(["/api/verse", { book: 43, chapter: 3, verse: 16, translation: "NASB" }]), true);
    assert.equal(isYouVersionScriptureQuery(["/api/passage", 43, 3, "YV2692"]), true);
    assert.equal(isYouVersionScriptureQuery(["/api/verse", { book: 43, chapter: 3, verse: 16, translation: "KJV" }]), false);
    assert.equal(isYouVersionScriptureQuery(["/api/signposts/daily", "NIV"]), false);
    assert.match(read("app/_layout.tsx"), /isYouVersionScriptureQuery\(query\.queryKey\)/);
  });

  it("Scripture shown outside the reader carries its licence credit", () => {
    assert.match(read("app/(tabs)/home-v2.tsx"), /verseAttribution=\{votdVerseData\?\.attribution\}/);
    assert.match(read("components/home-v2/HeroCard.tsx"), /<ScriptureCredit attribution=\{verseAttribution\}/);
    assert.match(read("components/devotions-v2/DevotionalDayPreview.tsx"), /<ScriptureCredit attribution=\{passage\.data\.attribution\}/);
  });

  it("the reader routes send YouVersion text with no-store", () => {
    assert.match(read("server/routes/bible.ts"), /Cache-Control", "no-store"/);
  });

  it("no client source mentions the app key or its header", () => {
    for (const dir of ["app", "components", "lib", "shared", "hooks", "context"]) {
      for (const file of sourceFiles(dir)) {
        const src = read(file);
        assert.doesNotMatch(src, /YOUVERSION_APP_KEY|X-YVP-App-Key/i, file);
      }
    }
  });

  it("the YouVersion SDK runs only inside the server proxy, never the React or Expo SDKs", () => {
    const users = [...sourceFiles("server"), ...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib"), ...sourceFiles("shared")]
      .filter((file) => /@youversion\//.test(read(file)))
      .map((file) => file.replace(/\\/g, "/"))
      .sort();
    assert.deepEqual(users, ["server/services/youversion-html.ts", "server/services/youversion.ts"]);
    const pkg = JSON.parse(read("package.json"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    assert.deepEqual(deps.filter((name) => name.startsWith("@youversion/")), ["@youversion/platform-core"]);
  });

  it("backs off when YouVersion rate-limits the key and keeps the last good catalog", () => {
    const service = read("server/services/youversion.ts");
    assert.match(service, /status === 429\) \{\s*throttledUntil = Date\.now\(\) \+ RATE_LIMIT_COOLDOWN_MS/);
    assert.match(service, /if \(throttledUntil > Date\.now\(\)\)/);
    assert.match(service, /if \(!value && failure && failure\.until > Date\.now\(\)\) throw failure\.error/);
    assert.match(service, /value = \{ data: value\.data, expires: Date\.now\(\) \+ RETRY_AFTER_FAILURE_MS \}/);
  });

  it("logs the HTTP status of the versions call without the key", () => {
    const service = read("server/services/youversion.ts");
    assert.match(service, /\[youversion\] versions call HTTP \$\{getHttpStatus\(err\) \?\? "error"\}/);
    assert.match(service, /\[youversion\] versions call HTTP 200: \$\{bibles\.length\} versions/);
    assert.doesNotMatch(service, /console\.\w+\([^)]*\bkey\b/);
  });

  it("refreshes a catalog that came back without YouVersion instead of keeping it for a day", async () => {
    const { catalogStaleTime } = await import("../hooks/useTranslationCatalog");
    const local: CatalogTranslation[] = [{ id: "KJV", abbreviation: "KJV", name: "King James Version", language: "en", source: "db" }];
    const full: CatalogTranslation[] = [...local, { id: "YV3034", abbreviation: "YV3034", name: "Berean Standard Bible", language: "en", source: "youversion" }];
    assert.equal(catalogStaleTime(local), 60 * 1000);
    assert.equal(catalogStaleTime(full), 60 * 60 * 1000);
    assert.match(read("server/routes/bible.ts"), /catalog unavailable:", err\?\.message\);\s*res\.set\("Cache-Control", "no-store"\)/);
    for (const screen of ["app/read/[bookId]/[chapter].tsx", "app/book-picker.tsx", "app/verse-actions.tsx", "app/discover-v2.tsx"]) {
      const source = read(screen);
      assert.match(source, /useTranslationCatalog\(\)/, screen);
      assert.doesNotMatch(source, /queryKey: \["\/api\/translations"\]/, screen);
    }
  });

  it("leaves out The Passion Translation", () => {
    assert.match(read("server/services/youversion.ts"), /\[1849, "The Passion Translation/);
  });
});

describe("YouVersion chapter HTML", () => {
  const html = [
    '<div class="s1 yv-h">The Calling</div>',
    '<div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>First verse text.',
    '<span class="yv-n f"><span class="fr">1:1 </span><span class="ft">Or <span class="fqa">alternate</span> reading</span></span>',
    ' <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>Second &amp; verse.</div>',
    '<div class="q1"><span class="yv-v" v="3"></span><span class="yv-vlbl">3</span>A poetic line,</div>',
    '<div class="q2">its second line.</div>',
  ].join("");
  const parsed = parseYouVersionChapterHtml(html, { code: "YV9999", bookId: 41, chapter: 1 });

  it("reads verses, entities and poetry lines", () => {
    assert.deepEqual(
      parsed.verses.map((v) => [v.id, v.text]),
      [
        ["yv9999-41-1-1", "First verse text."],
        ["yv9999-41-1-2", "Second & verse."],
        ["yv9999-41-1-3", "A poetic line,\nits second line."],
      ],
    );
  });

  it("keeps headings and paragraphs", () => {
    assert.deepEqual(parsed.providerContent.headings, [{ text: "The Calling", beforeVerse: 1 }]);
    assert.deepEqual(parsed.providerContent.paragraphs, [{ verseStart: 1, verseEnd: 2 }]);
  });

  it("keeps every footnote, without the reference prefix", () => {
    assert.deepEqual(parsed.footnotes, [{ verse: 1, text: "Or alternate reading" }]);
  });

  it("labels verses a version prints together and keeps cross references out of the text", async () => {
    const { verseNumberLabel, coveredVerseNumbers } = await import("../lib/verse-label");
    const kriol = [
      '<div class="p"><span class="yv-v" ev="2" v="1"></span><span class="yv-vlbl">1,2</span>Wal God kaan faindim gilti.</div>',
      '<div class="p"><span class="yv-v" v="3"></span><span class="yv-vlbl">3</span>Wal det lowa.',
      '<span class="yv-n x"><span class="ref" usfm="1CO.3.16">1 Karin 3:16</span></span></div>',
      '<div class="p"><span class="yv-v" v="5"></span><span class="yv-vlbl">5-6</span>Wal ol wi pipul.</div>',
    ].join("");
    const merged = parseYouVersionChapterHtml(kriol, { code: "YV1362", bookId: 45, chapter: 8 });
    assert.deepEqual(
      merged.verses.map((v) => [v.verse, v.verseEnd ?? null, v.text]),
      [
        [1, 2, "Wal God kaan faindim gilti."],
        [3, null, "Wal det lowa."],
        [5, 6, "Wal ol wi pipul."],
      ],
    );
    assert.deepEqual(merged.footnotes, [{ verse: 3, text: "1 Karin 3:16" }]);
    assert.equal(verseNumberLabel(merged.verses[0]), "1\u20132");
    assert.equal(verseNumberLabel(merged.verses[1]), "3");
    assert.deepEqual(coveredVerseNumbers([merged.verses[0], merged.verses[2]]), [1, 2, 5, 6]);
    assert.equal(parsed.verses.some((v) => "verseEnd" in v), false);
    const reader = read("app/read/[bookId]/[chapter].tsx");
    const prose = read("components/reader/TypographyPreviewProse.tsx");
    assert.match(reader, /\{verseNumberLabel\(v\)\}\{"\\u00a0"\}/);
    assert.match(prose, /\{verseNumberLabel\(v\)\}/);
    // The bookmark mark stays on the verse's last line instead of wrapping alone.
    assert.match(reader, /\{"\\u00a0◆"\}/);
    assert.match(prose, /\{"\\u00a0◆"\}/);
    assert.doesNotMatch(reader, /> ◆</);
    assert.doesNotMatch(prose, /\{" "\}◆/);
  });

  it("keeps merged verses aligned in Compare, whichever side merges", async () => {
    const { alignCompanionVerses, companionNeedsNumbers } = await import("../lib/compare-alignment");
    const kriol = [{ verse: 1, verseEnd: 2 }, { verse: 3 }, { verse: 4 }];
    const kjv = [{ verse: 1 }, { verse: 2 }, { verse: 3 }, { verse: 4 }];
    const underKriol = alignCompanionVerses(kriol, kjv);
    assert.deepEqual([...underKriol.entries()].map(([verse, items]) => [verse, items.map((item) => item.verse)]), [
      [1, [1, 2]],
      [3, [3]],
      [4, [4]],
    ]);
    assert.equal(companionNeedsNumbers(kriol[0], underKriol.get(1)!), true);
    assert.equal(companionNeedsNumbers(kriol[1], underKriol.get(3)!), false);
    const underKjv = alignCompanionVerses(kjv, kriol);
    assert.deepEqual([...underKjv.entries()].map(([verse, items]) => [verse, items.map((item) => item.verse)]), [
      [2, [1]],
      [3, [3]],
      [4, [4]],
    ]);
    assert.equal(companionNeedsNumbers(kjv[1], underKjv.get(2)!), true);
    const reader = read("app/read/[bookId]/[chapter].tsx");
    assert.match(reader, /alignCompanionVerses\(verses, splitVerses\)/);
    assert.match(reader, /\{numbered \? ` \$\{verseNumberLabel\(companion\)\}` : ""\}/);
  });

  it("shows parallel-passage references as a muted line under the heading", async () => {
    const { headingKind, headingsByVerse } = await import("../lib/group-verses-by-paragraph");
    const tcs = [
      '<div class="s yv-h">Jesus Krais famli</div>',
      '<div class="r yv-h">(Luk 3.23-38)</div>',
      '<div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Dis buk i tok.</div>',
    ].join("");
    const parsed = parseYouVersionChapterHtml(tcs, { code: "YV1400", bookId: 40, chapter: 1 });
    assert.deepEqual(parsed.providerContent.headings, [
      { text: "Jesus Krais famli", beforeVerse: 1 },
      { text: "(Luk 3.23-38)", kind: "r", beforeVerse: 1 },
    ]);
    // Older servers send the line without a kind; the brackets still mark it.
    assert.equal(headingKind({ text: "(Luk 3.23-38)" }), "r");
    assert.equal(headingKind({ text: "(Mark 1:1-8; Luke 3:1-18)" }), "r");
    assert.equal(headingKind({ text: "The Beatitudes" }), undefined);
    assert.equal(headingKind({ text: "Aleph", kind: "qa" }), "qa");
    assert.deepEqual(headingsByVerse([{ text: "(Luk 3.23-38)", beforeVerse: 1 }]).get(1), [{ text: "(Luk 3.23-38)", kind: "r" }]);
    for (const file of ["app/read/[bookId]/[chapter].tsx", "components/reader/TypographyPreviewProse.tsx"]) {
      const source = read(file);
      assert.match(source, /heading\.kind === "r"/, file);
      assert.match(source, /testID="reader-parallel-reference"/, file);
    }
    assert.match(read("app/read/[bookId]/[chapter].tsx"), /providerHeadingReference: \{[\s\S]*?fontFamily: "Inter_400Regular"[\s\S]*?color: RV2_INK_MUTED/);
    assert.match(read("components/reader/TypographyPreviewProse.tsx"), /headingReference: \{[\s\S]*?fontFamily: "Inter_400Regular"/);
  });
});

describe("translation picker catalog", () => {
  const catalog: CatalogTranslation[] = [
    { id: "YV149", abbreviation: "YV149", displayAbbreviation: "RVR1960", name: "Reina Valera 1960", language: "es", languageName: "Spanish", source: "youversion" },
    { id: "KJV", abbreviation: "KJV", name: "King James Version", language: "en", languageName: "English", source: "db" },
    { id: "YV2692", abbreviation: "YV2692", displayAbbreviation: "NASB2020", name: "New American Standard Bible 2020", language: "en", languageName: "English", source: "youversion" },
    { id: "NLT", abbreviation: "NLT", name: "New Living Translation", language: "en", languageName: "English", source: "nlt_provider" },
    { id: "YV1", abbreviation: "YV1", displayAbbreviation: "AFR53", name: "Afrikaans 1953", language: "af", languageName: "Afrikaans", source: "youversion" },
  ];

  it("groups by language with English first, local and API.Bible before YouVersion", () => {
    const groups = groupTranslationsByLanguage(catalog);
    assert.deepEqual(groups.map((g) => g.languageName), ["English", "Afrikaans", "Spanish"]);
    assert.deepEqual(groups[0].entries.map((e) => e.abbreviation), ["KJV", "NLT", "YV2692"]);
  });

  it("searches by language, abbreviation or name", () => {
    const groups = groupTranslationsByLanguage(catalog);
    assert.deepEqual(filterTranslationGroups(groups, "spanish").map((g) => g.languageName), ["Spanish"]);
    assert.deepEqual(filterTranslationGroups(groups, "nasb").flatMap((g) => g.entries.map((e) => e.abbreviation)), ["YV2692"]);
    assert.deepEqual(filterTranslationGroups(groups, "king james").flatMap((g) => g.entries.map((e) => e.abbreviation)), ["KJV"]);
  });

  it("lists an exact abbreviation before a language that only contains those letters", () => {
    const groups = groupTranslationsByLanguage([
      ...catalog,
      { id: "NET", abbreviation: "NET", name: "NET Bible®, New English Translation", language: "en", languageName: "English", source: "db" },
      { id: "NIV", abbreviation: "NIV", name: "New International Version", language: "en", languageName: "English", source: "youversion" },
      { id: "YV2163", abbreviation: "YV2163", displayAbbreviation: "NIVUK", name: "New International Version (Anglicised)", language: "en", languageName: "English", source: "youversion" },
      { id: "YV2576", abbreviation: "YV2576", displayAbbreviation: "tex", name: "Tennet", language: "tex", languageName: "Tennet", source: "youversion" },
    ]);
    const net = filterTranslationGroups(groups, "Net").flatMap((g) => g.entries.map((e) => e.abbreviation));
    assert.equal(net[0], "NET");
    assert.ok(net.includes("YV2576"));
    assert.deepEqual(filterTranslationGroups(groups, "kjv").flatMap((g) => g.entries.map((e) => e.abbreviation)), ["KJV"]);
    assert.deepEqual(
      filterTranslationGroups(groups, "niv").flatMap((g) => g.entries.map((e) => e.displayAbbreviation || e.abbreviation)).slice(0, 2),
      ["NIV", "NIVUK"],
    );
  });

  it("shows the version's own abbreviation and keeps YouVersion out of search", () => {
    assert.equal(translationLabel("YV2692", catalog), "NASB2020");
    assert.equal(translationLabel("KJV", catalog), "KJV");
    assert.equal(translationLabel("YV1362", [{ abbreviation: "YV1362", displayAbbreviation: "rop", id: "YV1362", name: "Kriol Baibul", language: "rop" }]), "Kriol");
    assert.equal(translationLabel("YV1400", [{ abbreviation: "YV1400", displayAbbreviation: "tcsDBL", id: "YV1400", name: "Torres Strait Creole NT+", language: "tcs" }]), "Yumplatok");
    assert.equal(translationLabel("YV1355", [{ abbreviation: "YV1355", displayAbbreviation: "wbp", id: "YV1355", name: "Warlpiri Bible 2014", language: "wbp" }]), "Warlpiri");
    assert.equal(translationLabel("YV1399", undefined), "Kala Lagaw Ya");
    assert.equal(isSearchableTranslation("YV2692"), false);
    assert.equal(isSearchableTranslation("NIV"), false);
    assert.equal(isSearchableTranslation("NLT"), true);
  });

  it("the reader shows each version's copyright at the foot of the chapter", () => {
    const reader = read("app/read/[bookId]/[chapter].tsx");
    assert.match(reader, /<ChapterAttribution[\s\S]*?attribution=\{data\.attribution\}/);
    assert.match(reader, /<ChapterAttribution[\s\S]*?attribution=\{splitData\.attribution\}/);
    assert.match(reader, /<TranslationPickerList/);
    assert.equal(reader.match(/catalog=\{pickerCatalog\}/g)?.length, 4);
    assert.match(reader, /testID="split-translation-picker"/);
    assert.match(reader, /testID="reader-translation-picker"/);
    assert.match(reader, /MissingTranslationNotice/);
    assert.match(read("app/book-picker.tsx"), /bookIsInEdition/);
  });
});

describe("Languages of Australia", () => {
  const australia: CatalogTranslation[] = [
    { id: "YV1362", abbreviation: "YV1362", displayAbbreviation: "rop", name: "Kriol Baibul", language: "rop", languageName: "Australian Creole", source: "youversion" },
    { id: "YV1291", abbreviation: "YV1291", displayAbbreviation: "bvrNT", name: "Burarra", language: "bvr", languageName: "Burarra", source: "youversion" },
    { id: "YV1332", abbreviation: "YV1332", displayAbbreviation: "wimNT", name: "Wik-Mungkan", language: "wim", languageName: "Wik-Mungkan", source: "youversion" },
    { id: "YV1400", abbreviation: "YV1400", displayAbbreviation: "tcsDBL", name: "Torres Strait Creole NT+", language: "tcs", languageName: "Torres Strait Creole", source: "youversion" },
    { id: "YV1355", abbreviation: "YV1355", displayAbbreviation: "wbp", name: "Warlpiri Bible 2014", language: "wbp", languageName: "Warlpiri", source: "youversion" },
    { id: "YV2571", abbreviation: "YV2571", displayAbbreviation: "aly", name: "Alyawarr Bible", language: "aly", languageName: "Alyawarr", source: "youversion" },
    { id: "YV2572", abbreviation: "YV2572", displayAbbreviation: "amxB", name: "Anmatyerr Bible", language: "amx", languageName: "Anmatyerre", source: "youversion" },
    { id: "YV1399", abbreviation: "YV1399", displayAbbreviation: "mwpBIBLEPO", name: "Minar Poelayzimayl", language: "mwp", languageName: "Kala Lagaw Ya", source: "youversion" },
    { id: "YV2403", abbreviation: "YV2403", displayAbbreviation: "dji", name: "Djinang", language: "dji", languageName: "Djinang", source: "youversion" },
    { id: "KJV", abbreviation: "KJV", name: "King James Version", language: "en", languageName: "English", source: "db" },
  ];

  it("lists the nine editions immediately after English, most complete first, and keeps their own groups", () => {
    const groups = groupTranslationsByLanguage(australia);
    assert.deepEqual(groups.slice(0, 2).map((group) => group.languageName), ["English", "Languages of Australia"]);
    const featured = groups[1].entries;
    assert.deepEqual(featured.map((entry) => entry.abbreviation), [
      "YV1362", "YV1291", "YV1332", "YV1400", "YV1355", "YV2571", "YV2572", "YV1399", "YV2403",
    ]);
    assert.deepEqual(featured.map((entry) => entry.coverage), [
      "Full Bible",
      "New Testament",
      "New Testament",
      "New Testament + some OT",
      "New Testament + some OT",
      "Selected books",
      "Selected books",
      "Selected books",
      "Selected books",
    ]);
    assert.equal(featured[0].australiaLanguage, "Kriol");
    assert.ok(groups.some((group) => group.languageName === "Burarra"));
    assert.ok(groups.some((group) => group.languageName === "Australian Creole"));
  });

  it("finds Kriol, Yumplatok, and the whole group from the search aliases", () => {
    const groups = groupTranslationsByLanguage(australia);
    const codes = (query: string) =>
      filterTranslationGroups(groups, query).flatMap((group) => group.entries.map((entry) => entry.abbreviation));
    assert.deepEqual(
      filterTranslationGroups(groups, "kriol").find((group) => group.languageName === "Languages of Australia")?.entries.map((entry) => entry.abbreviation),
      ["YV1362"],
    );
    assert.deepEqual(
      filterTranslationGroups(groups, "australian kriol")
        .find((group) => group.languageName === "Languages of Australia")
        ?.entries.map((entry) => entry.abbreviation),
      ["YV1362"],
    );
    assert.equal(codes("australian kriol").includes("YV1291"), false);
    assert.ok(codes("yumplatok").includes("YV1400"));
    assert.equal(codes("yumplatok").includes("YV1291"), false);
    for (const query of ["aboriginal", "torres strait", "indigenous", "australia"]) {
      const featured = filterTranslationGroups(groups, query).find((group) => group.languageName === "Languages of Australia");
      assert.equal(featured?.entries.length, 9, query);
    }
  });
});

describe("partial editions", () => {
  it("names the gap, offers the nearest book, and keeps YouVersion text out of AI", async () => {
    const {
      nearestTranslatedBook,
      noticeForMissingPassage,
      openingChapter,
      partialCanonBooks,
      passageErrorIsUntranslated,
      previousReadingTranslation,
      untranslatedBook,
      untranslatedBookMessage,
      untranslatedEarlyChapter,
      booksForEdition,
      chaptersInEdition,
    } = await import("../shared/partial-bible");
    const { NT_USFM, OT_USFM } = await import("../shared/bible-books");

    assert.equal(partialCanonBooks([...OT_USFM, ...NT_USFM]), undefined);
    assert.equal(partialCanonBooks(NT_USFM)?.length, 27);
    assert.equal(untranslatedBookMessage("Isaiah", "Warlpiri"), "Isaiah isn't translated in Warlpiri yet");
    assert.equal(nearestTranslatedBook("Isaiah", booksForEdition("YV1355")!), "Psalms");
    assert.equal(nearestTranslatedBook("Exodus", booksForEdition("YV2403")!), "Genesis");
    const warlpiriIsaiah = untranslatedBook("YV1355", "Isaiah");
    assert.equal(warlpiriIsaiah?.nearestBook, "Psalms");
    assert.equal(warlpiriIsaiah?.nearestChapter, 23);
    assert.equal(openingChapter("YV1355", "Judges"), 2);
    assert.equal(openingChapter("YV1355", "Genesis"), 1);
    assert.deepEqual(chaptersInEdition("YV1355", "Psalms"), [23]);
    assert.equal(chaptersInEdition("YV1355", "Judges")?.includes(1), false);
    assert.equal(chaptersInEdition("YV1355", "Judges")?.includes(3), false);
    assert.equal(chaptersInEdition("YV1355", "Judges")?.includes(4), true);
    assert.equal(chaptersInEdition("YV1355", "Exodus")?.includes(18), false);
    assert.equal(chaptersInEdition("YV1355", "Genesis"), undefined);
    assert.deepEqual(chaptersInEdition("YV1355", "Isaiah"), []);
    assert.equal(chaptersInEdition("YV2403", "Genesis")?.length, 31);
    assert.equal(chaptersInEdition("YV1291", "Matthew"), undefined);
    assert.equal(untranslatedEarlyChapter("YV1355", "Judges", 3)?.nearestChapter, 2);
    assert.equal(untranslatedEarlyChapter("YV1355", "Judges", 9)?.nearestChapter, 8);
    assert.equal(untranslatedEarlyChapter("YV1355", "Exodus", 18)?.nearestChapter, 17);
    const psalmsOne = untranslatedEarlyChapter("YV1355", "Psalms", 1);
    assert.equal(psalmsOne?.bookName, "Psalms 1");
    assert.equal(psalmsOne?.nearestChapter, 23);
    assert.equal(untranslatedEarlyChapter("YV1355", "Psalms", 23), null);
    const judgesThree = noticeForMissingPassage("YV1355", "Judges", 3);
    assert.equal(judgesThree.nearestBook, "Judges");
    assert.equal(judgesThree.nearestChapter, 2);
    const gap = untranslatedBook("YV2403", "Exodus");
    assert.equal(gap?.language, "Djinang");
    assert.equal(gap?.nearestBook, "Genesis");
    assert.equal(gap?.nearestBookId, 1);
    assert.equal(gap?.nearestChapter, 1);
    assert.equal(untranslatedBook("YV1362", "Isaiah"), null);
    assert.equal(untranslatedBook("YV1291", "Matthew", { partial: false }), null);
    assert.equal(previousReadingTranslation("YV1355", "KJV"), "KJV");
    assert.equal(previousReadingTranslation("YV1355", "YV1355"), "KJV");
    assert.equal(previousReadingTranslation("YV1355", "NLT"), "NLT");
    assert.equal(passageErrorIsUntranslated(new Error("404: {\"error\":\"bvrNT doesn't include Isaiah.\"}")), true);
    assert.equal(passageErrorIsUntranslated(new Error("500: unavailable")), false);
    assert.equal(aiScriptureTranslation("YV1362"), "KJV");
    assert.equal(aiScriptureTranslation("YV2403"), "KJV");
    assert.equal(partialCanonBooks(["GEN", "1JN"])?.join(" "), "GEN 1JN");
    const catalog = read("server/services/youversion.ts");
    assert.match(catalog, /partialCanonBooks\(reportedBooks\)/);
    assert.match(catalog, /partial: !!books/);
  });
});
