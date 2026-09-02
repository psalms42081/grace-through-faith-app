import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import {
  assertReflectionReadingAlignment,
  formatGreeting,
  getHomeLocalDay,
  getTodaysReflection,
  parseBibleReference,
} from "../components/home-v2/home-data";
import {
  SIGNPOST_SHARE_ORIGIN,
  buildHeroShareMessage,
  buildSignpostTopicUrl,
} from "../components/home-v2/hero-share";

const originalTimeZone = process.env.TZ;

before(() => {
  process.env.TZ = "Australia/Melbourne";
});

after(() => {
  process.env.TZ = originalTimeZone;
});

describe("Home hero coherence", () => {
  it("uses the Melbourne-local morning across the UTC boundary", () => {
    const localDay = getHomeLocalDay(
      new Date("2026-08-25T23:58:00.000Z"),
    );

    assert.equal(localDay.dateKey, "2026-08-26");
    assert.equal(localDay.daypart, "morning");
    assert.equal(localDay.dayLabel, "Wednesday");
    assert.match(localDay.dateLine, /^Wednesday\b/);
    assert.equal(getTodaysReflection(localDay.dayIndex).reference.length > 0, true);
  });

  it("renders a clean greeting when a name is absent or placeholder punctuation", () => {
    assert.equal(formatGreeting("Good morning", null), "Good morning.");
    assert.equal(formatGreeting("Good morning", ""), "Good morning.");
    assert.equal(formatGreeting("Good morning", "..."), "Good morning.");
    assert.equal(formatGreeting("Good morning", "  Joe Example  "), "Good morning, Joe");
  });

  it("parses multi-word reflection references and fails loudly on CTA drift", () => {
    assert.deepEqual(parseBibleReference("2 Corinthians 3:18"), {
      bookName: "2 Corinthians",
      chapterNumber: 3,
    });
    assert.doesNotThrow(() =>
      assertReflectionReadingAlignment("Ephesians 2:8-9", {
        reference: "Ephesians 2:8-9",
        bookName: "Ephesians",
        chapterNumber: 2,
      }),
    );
    assert.throws(
      () =>
        assertReflectionReadingAlignment("Ephesians 2:8-9", {
          reference: "Ephesians 2:8-9",
          bookName: "John",
          chapterNumber: 3,
        }),
      /Home reflection\/reading mismatch/,
    );
  });
});

describe("Home hero share payload", () => {
  const verse = {
    text: "For God so loved the world",
    reference: "John 3:16",
  };
  const signpost = {
    id: "hope",
    title: "Hope",
    description: "Hold fast to the promise that God is already at work.",
  };
  const reflection = {
    thought: "Grace is not a doctrine to be memorised.",
    reference: "Ephesians 2:8-9",
  };

  it("shares verse of the day from the verse tab", () => {
    assert.equal(
      buildHeroShareMessage({ tab: "verse", verse, signpost, reflection }),
      `\u201C${verse.text}\u201D\n\u2014 ${verse.reference}`,
    );
  });

  it("shares reflection text from the reflection tab", () => {
    assert.equal(
      buildHeroShareMessage({ tab: "reflection", verse, signpost, reflection }),
      `${reflection.thought}\n\u2014 Reflection on ${reflection.reference}`,
    );
  });

  it("shares signpost title, body, and topic link from the signpost tab", () => {
    const message = buildHeroShareMessage({
      tab: "signpost",
      verse,
      signpost,
      reflection,
    });
    const topicUrl = buildSignpostTopicUrl("hope", SIGNPOST_SHARE_ORIGIN);

    assert.equal(
      message,
      `${signpost.title}\n\n${signpost.description}\n\n${topicUrl}`,
    );
    assert.doesNotMatch(message, /John 3:16/);
    assert.doesNotMatch(message, /For God so loved the world/);
  });

  it("uses the selected-tab helper from the Home hero share button", () => {
    const heroSource = readFileSync(
      new URL("../components/home-v2/HeroCard.tsx", import.meta.url),
      "utf8",
    );
    assert.match(heroSource, /buildHeroShareMessage/);
    assert.match(heroSource, /tab:\s*activeTab/);
  });
});