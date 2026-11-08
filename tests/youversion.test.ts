import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import OpenAI from "openai";
import {
  aiScriptureTranslation,
  isYouVersionCode,
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
    assert.equal(isYouVersionCode("NIV"), false);
  });

  it("maps every YouVersion code to the local KJV for AI features", () => {
    assert.equal(aiScriptureTranslation("YV2692"), "KJV");
    assert.equal(aiScriptureTranslation("yv110"), "KJV");
    assert.equal(aiScriptureTranslation("NIV"), "NIV");
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
    assert.equal(isYouVersionScriptureQueryKey("/api/passage?book=41&chapter=1&translation=KJV"), false);
    assert.match(read("app/_layout.tsx"), /isYouVersionScriptureQueryKey\(/);
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
});

describe("translation picker catalog", () => {
  const catalog: CatalogTranslation[] = [
    { id: "YV149", abbreviation: "YV149", displayAbbreviation: "RVR1960", name: "Reina Valera 1960", language: "es", languageName: "Spanish", source: "youversion" },
    { id: "KJV", abbreviation: "KJV", name: "King James Version", language: "en", languageName: "English", source: "db" },
    { id: "YV2692", abbreviation: "YV2692", displayAbbreviation: "NASB2020", name: "New American Standard Bible 2020", language: "en", languageName: "English", source: "youversion" },
    { id: "NIV", abbreviation: "NIV", name: "New International Version", language: "en", languageName: "English", source: "api_bible" },
    { id: "YV1", abbreviation: "YV1", displayAbbreviation: "AFR53", name: "Afrikaans 1953", language: "af", languageName: "Afrikaans", source: "youversion" },
  ];

  it("groups by language with English first, local and API.Bible before YouVersion", () => {
    const groups = groupTranslationsByLanguage(catalog);
    assert.deepEqual(groups.map((g) => g.languageName), ["English", "Afrikaans", "Spanish"]);
    assert.deepEqual(groups[0].entries.map((e) => e.abbreviation), ["KJV", "NIV", "YV2692"]);
  });

  it("searches by language, abbreviation or name", () => {
    const groups = groupTranslationsByLanguage(catalog);
    assert.deepEqual(filterTranslationGroups(groups, "spanish").map((g) => g.languageName), ["Spanish"]);
    assert.deepEqual(filterTranslationGroups(groups, "nasb").flatMap((g) => g.entries.map((e) => e.abbreviation)), ["YV2692"]);
  });

  it("shows the version's own abbreviation and keeps YouVersion out of search", () => {
    assert.equal(translationLabel("YV2692", catalog), "NASB2020");
    assert.equal(translationLabel("KJV", catalog), "KJV");
    assert.equal(isSearchableTranslation("YV2692"), false);
    assert.equal(isSearchableTranslation("NIV"), true);
  });

  it("the reader shows each version's copyright at the foot of the chapter", () => {
    const reader = read("app/read/[bookId]/[chapter].tsx");
    assert.match(reader, /<ChapterAttribution[\s\S]*?attribution=\{data\.attribution\}/);
    assert.match(reader, /<ChapterAttribution[\s\S]*?attribution=\{splitData\.attribution\}/);
    assert.match(reader, /<TranslationPickerList/);
  });
});
