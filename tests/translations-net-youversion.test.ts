import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { parseNetChapterDocument } from "../scripts/prepare-net-bible";
import {
  linkSegments,
  localTranslationLicense,
  localTranslationNotice,
  NET_COPYRIGHT_NOTICE,
} from "../shared/translation-notices";
import { withQuotationNotice } from "../lib/verse-selection";
import { quotedVerseText } from "../lib/quoted-verse";
import { extractAcrosticHeadings } from "../shared/acrostic-markers";
import { withAcrosticHeadings } from "../lib/group-verses-by-paragraph";
import { creditPublisherLink, creditVersionTag } from "../shared/translation-notices";
import { READER_HEADER_LEFT_ALLOWANCE, READER_HEADER_TITLE_GAP, readerHeaderTitleMaxWidth } from "../lib/reader-header-layout";

const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

/** Server modules open no connection until queried; they only refuse to load without a URL. */
async function loadServer() {
  process.env.DATABASE_URL ||= "postgres://test@127.0.0.1:9/unused";
  const scripture = await import("../server/services/scripture-service");
  const youversion = await import("../server/services/youversion");
  return { scripture, youversion };
}

describe("NET Bible text", () => {
  const chapter = [
    "<html><head><title>NET Bible 2.1 Psalms 23</title></head><body>",
    '<h2 class="chapter">Psalm 23</h2>',
    '<p class="psasuper">A psalm of David.</p>',
    '<p class="poetry"><span class="verse">23:1</span> The <span class="smcaps">Lord</span> is my shepherd,<sup><a href="file1_notes.xhtml#n1">1</a></sup><br/>',
    "I lack nothing.</p>",
    '<p class="poetry"><span class="verse">23:2</span> He takes me to lush pastures<sup><a href="#n2">2</a></sup> ,<br/>he leads me to refreshing water. (23:3)</p>',
    '<p class="bodytext"><span class="verse">23:3</span><sup><a href="#n3">3</a></sup></p>',
    "</body></html>",
  ].join("");

  it("keeps the verse text and leaves out notes, headings and versification markers", () => {
    assert.deepEqual(parseNetChapterDocument(chapter), [
      { book: "Psalms", chapter: 23, verse: 1, text: "The LORD is my shepherd, I lack nothing." },
      { book: "Psalms", chapter: 23, verse: 2, text: "He takes me to lush pastures, he leads me to refreshing water." },
    ]);
  });

  it("skips title pages", () => {
    assert.deepEqual(parseNetChapterDocument("<html><head><title>NET Bible 2.1</title></head><body></body></html>"), []);
  });

  it("is registered for the bible_verse seed and its text stays out of git", () => {
    assert.match(read("scripts/seed-verses-prod.ts"), /id: "NET"[\s\S]*?file: "net\.json"/);
    assert.match(read(".gitignore"), /^data\/net\.json$/m);
  });
});

describe("NET quotation notice", () => {
  it("is the publisher's wording, with NET linked to netbible.org", () => {
    const notice = localTranslationNotice("net");
    assert.ok(notice);
    assert.equal(
      notice.text,
      "Scripture quoted by permission. Quotations designated (NET) are from the NET Bible® copyright ©1996, 2019 by Biblical Studies Press, L.L.C. https://netbible.com All rights reserved.",
    );
    assert.deepEqual(notice.links, [{ text: "NET", url: "https://netbible.org" }]);
    assert.equal(localTranslationLicense("NET"), "by_permission");
    assert.equal(localTranslationLicense("KJV"), "public_domain");
    assert.equal(localTranslationNotice("KJV"), null);
  });

  it("links the designation and the web address", () => {
    const links = linkSegments(NET_COPYRIGHT_NOTICE, [{ text: "NET", url: "https://netbible.org" }]).filter((s) => s.url);
    assert.deepEqual(links, [
      { text: "NET", url: "https://netbible.org" },
      { text: "https://netbible.com", url: "https://netbible.com" },
    ]);
    assert.ok(NET_COPYRIGHT_NOTICE.indexOf("(NET)") < NET_COPYRIGHT_NOTICE.indexOf("NET Bible"));
  });

  it("follows copied NET quotations, and only NET ones", () => {
    assert.equal(withQuotationNotice("John 3:16 (NET)", "NET"), `John 3:16 (NET)\n${NET_COPYRIGHT_NOTICE}`);
    assert.equal(withQuotationNotice("John 3:16 (KJV)", "KJV"), "John 3:16 (KJV)");
  });

  it("the passage and verse routes send it for local versions", () => {
    const routes = read("server/routes/bible.ts");
    assert.match(routes, /\.\.\.\(notice \? \{ attribution: notice \} : \{\}\)/);
  });
});

describe("NIV, AMP and NASB through YouVersion", () => {
  it("API.Bible is reached only for a discovered NKJV", async () => {
    const { scripture } = await loadServer();
    assert.deepEqual(Object.keys(scripture.API_BIBLE_TRANSLATIONS), []);
    assert.equal(scripture.isApiBibleCandidate("nkjv"), true);
    for (const code of ["NIV", "AMP", "NASB", "NLT", "KJV", "constructor"]) {
      assert.equal(scripture.isApiBibleCandidate(code), false, code);
    }
  });

  it("counts API.Bible requests per UTC month", async () => {
    const { scripture } = await loadServer();
    assert.equal(scripture.apiBibleUsageKey(new Date("2026-11-08T12:00:00Z")), "APIB202611");
    assert.equal(scripture.apiBibleUsageKey(new Date("2027-01-31T23:59:59Z")), "APIB202701");
    assert.ok(scripture.apiBibleUsageKey().length <= 10, "fits bible_cache_stats.translation");
    const service = read("server/services/scripture-service.ts");
    assert.equal((service.match(/"api-key"/g) ?? []).length, 1, "only apiBibleFetch sends the API.Bible key");
    assert.equal((service.match(/await apiBibleFetch\(/g) ?? []).length, 4);
  });

  it("Biblica's NIV links to Biblica and Lockman's versions carry the Lockman notice and link", async () => {
    const { youversion } = await loadServer();
    const base = { localized_title: null, info: null, publisher_name: null, publisher_url: null } as any;
    const niv = youversion.youVersionAttribution({
      ...base,
      id: 111,
      abbreviation: "NIV11",
      title: "New International Version",
      organization_id: "05a9aa40-37b6-4e34-b9f1-a443fa4b1fff",
      copyright: "Holy Bible, New International Version® NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.®",
    });
    assert.ok(niv);
    assert.match(niv.publisherName ?? "", /Biblica/);
    assert.match(niv.publisherUrl ?? "", /biblica\.com/);
    assert.equal(niv.notice, null);

    const nasb = youversion.youVersionAttribution({
      ...base,
      id: 100,
      abbreviation: "NASB1995",
      title: "New American Standard Bible - NASB 1995",
      organization_id: "798d8fa4-f640-4155-8cfb-fa91d1d8a06c",
      copyright: "Copyright © 1960, 1971, 1977, 1995 by The Lockman Foundation",
    });
    assert.ok(nasb);
    assert.match(nasb.notice ?? "", /NASB 1995 Copyright © 1960, 1971, 1977, 1995 by The Lockman Foundation\. All rights reserved\. Used by permission\. https:\/\/www\.Lockman\.org$/);
    assert.equal(nasb.publisherUrl, "https://www.lockman.org");
    for (const id of [100, 1588, 2692]) assert.ok(youversion.LOCKMAN_NOTICES.get(id), String(id));
  });

  it("Biblica and Lockman versions are no longer left out of the catalog", () => {
    const service = read("server/services/youversion.ts");
    const excluded = service.slice(service.indexOf("YOUVERSION_EXCLUDED_BIBLES"), service.indexOf("]);", service.indexOf("YOUVERSION_EXCLUDED_BIBLES")));
    assert.doesNotMatch(excluded, /\[(111|1588|100),/);
  });
});

describe("reader header", () => {
  it("caps the title to the room the chips leave", () => {
    assert.equal(readerHeaderTitleMaxWidth(0, 200), undefined);
    assert.equal(readerHeaderTitleMaxWidth(390, 0), undefined);
    assert.equal(readerHeaderTitleMaxWidth(390, 200), 390 - READER_HEADER_LEFT_ALLOWANCE - 200 - READER_HEADER_TITLE_GAP);
    assert.equal(readerHeaderTitleMaxWidth(320, 400), 0);
  });

  it("the title truncates and the version chip ellipsizes", () => {
    const reader = read("app/read/[bookId]/[chapter].tsx");
    assert.match(reader, /headerTitleMaxWidth !== undefined && \{ maxWidth: headerTitleMaxWidth \}/);
    assert.match(reader, /testID="reader-header-chips"\s+onLayout=/);
    assert.match(reader, /styles\.headerTitleText[^>]*numberOfLines=\{1\} ellipsizeMode="tail"/);
    assert.match(reader, /maxWidth: READER_VERSION_CHIP_MAX_WIDTH/);
  });
});

describe("quoted verse of the day", () => {
  it("adds a closing mark only when the version did not already end with one", () => {
    assert.equal(quotedVerseText("Be strong and courageous."), "\u201CBe strong and courageous.\u201D");
    assert.equal(
      quotedVerseText("Have I not commanded you? Be strong and courageous.\u201D"),
      "\u201CHave I not commanded you? Be strong and courageous.\u201D",
    );
    assert.equal(quotedVerseText("\u201CAlready wrapped.\u201D"), "\u201CAlready wrapped.\u201D");
    assert.equal(quotedVerseText('Straight quotes."'), "\u201CStraight quotes.\"");
  });

  it("Home uses the helper for the card and for share", () => {
    assert.match(read("components/home-v2/HeroCard.tsx"), /quotedVerseText\(verse\.text\)/);
    assert.match(read("components/home-v2/hero-share.ts"), /quotedVerseText\(input\.verse\.text\)/);
  });
});

describe("BBE acrostic letter markers", () => {
  it("lifts HTML-escaped Psalm 119 markers into qa headings", () => {
    const parsed = extractAcrosticHeadings([
      { verse: 1, text: "&lt;ALEPH&gt; Happy are they who are without sin in their ways." },
      { verse: 2, text: "Happy are they who keep his unchanging word." },
      { verse: 9, text: "<BETH> How may a young man make his way clean?" },
    ]);
    assert.deepEqual(
      parsed.verses.map((v) => v.text),
      [
        "Happy are they who are without sin in their ways.",
        "Happy are they who keep his unchanging word.",
        "How may a young man make his way clean?",
      ],
    );
    assert.deepEqual(parsed.headings, [
      { text: "Aleph", beforeVerse: 1, kind: "qa" },
      { text: "Beth", beforeVerse: 9, kind: "qa" },
    ]);
  });

  it("is idempotent when the API has already lifted the markers", () => {
    const again = withAcrosticHeadings(
      [{ verse: 1, text: "Happy are they who are without sin in their ways." }],
      [{ text: "Aleph", beforeVerse: 1, kind: "qa" }],
    );
    assert.equal(again.verses[0].text, "Happy are they who are without sin in their ways.");
    assert.deepEqual(again.headingsByVerse.get(1), [{ text: "Aleph", kind: "qa" }]);
  });

  it("Compare strips the companion's acrostic markers but shows headings from the reading version only", () => {
    const reader = read("app/read/[bookId]/[chapter].tsx");
    assert.match(reader, /withAcrosticHeadings\(splitLoadFailed \? \[\] : \(splitData\?\.verses \?\? \[\]\), undefined\)\.verses/);
    assert.doesNotMatch(reader, /splitHeadings/);
    assert.doesNotMatch(reader, /split-heading/);
  });

  it("Compare gives the verse number the verse's own line height so Android lines do not collapse", () => {
    const reader = read("app/read/[bookId]/[chapter].tsx");
    assert.match(reader, /const verseNumInlineScaled = \{[\s\S]*?lineHeight: 32 \* fontScale,/);
    assert.equal((reader.match(/styles\.verseNumInline, verseNumInlineScaled/g) ?? []).length, 2);
    assert.doesNotMatch(reader, /lineHeight: Math\.min\(11 \* fontScale, 18 \* fontScale \* 0\.62\) \* 1\.2/);
  });

  it("styles the Compare version chip as a pill like the header version chip", () => {
    const reader = read("app/read/[bookId]/[chapter].tsx");
    assert.match(reader, /style=\{\[styles\.compareBarVersion, \{ backgroundColor: headerPillBg \}\]\}/);
    assert.match(reader, /compareBarVersion: \{[^}]*borderRadius: 20/s);
  });
});

describe("compact Home credit", () => {
  it("keeps Biblica and Lockman on the compact line with their required names", () => {
    assert.deepEqual(
      creditPublisherLink({ publisherName: "Biblica, Inc.", publisherUrl: "https://www.biblica.com" }),
      { name: "Biblica", url: "https://www.biblica.com" },
    );
    assert.deepEqual(
      creditPublisherLink({ publisherName: null, publisherUrl: "https://www.lockman.org" }),
      { name: "The Lockman Foundation", url: "https://www.lockman.org" },
    );
    assert.equal(
      creditVersionTag({ versionName: "New American Standard Bible - NASB 1995" }),
      "NASB1995",
    );
  });

  it("opens the full notice from Copyright and does not drop the wording", () => {
    const credit = read("components/reader/ChapterAttribution.tsx");
    assert.match(credit, /accessibilityLabel="Show copyright notice"/);
    assert.match(credit, />\s*Copyright\s*</);
    assert.match(credit, /testID=\{testID \? `\$\{testID\}-full` : undefined\}/);
    assert.match(credit, /<CreditNoticeBody attribution=\{attribution\} \/>/);
    assert.match(credit, /attribution\.notice/);
    assert.match(read("components/home-v2/HeroCard.tsx"), /<ScriptureCredit attribution=\{verseAttribution\}/);
  });
});
