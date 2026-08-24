import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertBibleProjectVideoCatalog,
  BIBLE_PROJECT_VIDEOS,
  KNOWN_UNAVAILABLE_YOUTUBE_IDS,
} from "../data/bibleProjectVideos";
import {
  auditCuratedYoutubeVideoAvailability,
  formatUnavailableCuratedVideoReport,
  YoutubeVideoAvailabilityAuditError,
} from "../services/youtubeVideoAvailabilityAudit";
import { collectAllCuratedYoutubeVideoReferences } from "../data/curatedYoutubeVideoRegistry";

function youtubeResponse(
  youtubeIds: string[],
  status = 200,
): Response {
  return new Response(
    JSON.stringify({
      items: youtubeIds.map((id) => ({
        id,
        status: { privacyStatus: "public", uploadStatus: "processed" },
      })),
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

describe("pastoral topic video availability contract", () => {
  it("removes the audited dead resources and preserves Addiction's working Sin video", () => {
    assert.deepEqual(BIBLE_PROJECT_VIDEOS.grief, []);
    assert.deepEqual(BIBLE_PROJECT_VIDEOS.anxiety, []);
    assert.deepEqual(
      BIBLE_PROJECT_VIDEOS.addiction.map((video) => video.youtubeId),
      ["aNOZ7ocLD74"]
    );
  });

  it("never serves a known unavailable YouTube ID under any topic", () => {
    const returnedIds = Object.values(BIBLE_PROJECT_VIDEOS)
      .flat()
      .map((video) => video.youtubeId);

    for (const deadId of KNOWN_UNAVAILABLE_YOUTUBE_IDS) {
      assert.equal(returnedIds.includes(deadId), false, `${deadId} must not be returned`);
    }
  });

  it("fails explicitly if a known unavailable ID is reintroduced", () => {
    assert.throws(
      () =>
        assertBibleProjectVideoCatalog({
          grief: [
            {
              id: "regression",
              title: "Unavailable",
              youtubeId: "p-dwZ8cPQ7c",
              duration: "0:00",
              description: "Contract fixture",
              series: "Test",
            },
          ],
        }),
      /Known unavailable YouTube video p-dwZ8cPQ7c/
    );
  });

  it("reports every affected topic and card after confirming an unavailable video", async () => {
    const fetchCalls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      fetchCalls.push(input.toString());
      return youtubeResponse([]);
    };
    const catalog = {
      grief: [
        {
          id: "grief-card",
          title: "Hope in Grief",
          youtubeId: "newly-removed",
          duration: "5:00",
          description: "Fixture",
          series: "Fixture",
        },
      ],
      hope: [
        {
          id: "hope-card",
          title: "Hope Restored",
          youtubeId: "newly-removed",
          duration: "5:00",
          description: "Fixture",
          series: "Fixture",
        },
      ],
    };

    const result = await auditCuratedYoutubeVideoAvailability(
      catalog,
      "test-secret-that-must-not-appear",
      {
        fetchImpl,
        sleep: async () => {},
        maxRequestAttempts: 1,
        confirmationDelayMs: 0,
      },
    );
    const report = formatUnavailableCuratedVideoReport(result);

    assert.equal(fetchCalls.length, 2, "a missing video must be confirmed");
    assert.equal(result.unavailable.length, 2);
    assert.match(
      report,
      /Topic "grief" on Pastoral topic videos — card "Hope in Grief" \(grief-card\)/,
    );
    assert.match(
      report,
      /Topic "hope" on Pastoral topic videos — card "Hope Restored" \(hope-card\)/,
    );
    assert.match(report, /YouTube ID: newly-removed/);
    assert.doesNotMatch(report, /test-secret-that-must-not-appear/);
  });

  it("does not fail a card that reappears on the confirmation request", async () => {
    let call = 0;
    const fetchImpl: typeof fetch = async () => {
      call += 1;
      return youtubeResponse(call === 1 ? [] : ["temporarily-missing"]);
    };

    const result = await auditCuratedYoutubeVideoAvailability(
      {
        anxiety: [
          {
            id: "anxiety-card",
            title: "Temporary Provider Delay",
            youtubeId: "temporarily-missing",
            duration: "5:00",
            description: "Fixture",
            series: "Fixture",
          },
        ],
      },
      "test-secret",
      {
        fetchImpl,
        sleep: async () => {},
        maxRequestAttempts: 1,
        confirmationDelayMs: 0,
      },
    );

    assert.equal(call, 2);
    assert.deepEqual(result.unavailable, []);
  });

  it("retries rate limits without classifying videos as unavailable", async () => {
    let call = 0;
    const delays: number[] = [];
    const fetchImpl: typeof fetch = async () => {
      call += 1;
      if (call === 1) {
        return youtubeResponse([], 429);
      }
      return youtubeResponse(["rate-limited-video"]);
    };

    const result = await auditCuratedYoutubeVideoAvailability(
      {
        prayer: [
          {
            id: "prayer-card",
            title: "Prayer",
            youtubeId: "rate-limited-video",
            duration: "5:00",
            description: "Fixture",
            series: "Fixture",
          },
        ],
      },
      "test-secret",
      {
        fetchImpl,
        sleep: async (milliseconds) => {
          delays.push(milliseconds);
        },
        maxRequestAttempts: 2,
      },
    );

    assert.equal(call, 2);
    assert.deepEqual(delays, [500]);
    assert.deepEqual(result.unavailable, []);
  });

  it("keeps persistent provider failures inconclusive and credentials out of errors", async () => {
    const secret = "credential-that-must-stay-private";
    const fetchImpl: typeof fetch = async () => youtubeResponse([], 429);

    await assert.rejects(
      () =>
        auditCuratedYoutubeVideoAvailability(
          {
            purpose: [
              {
                id: "purpose-card",
                title: "Purpose",
                youtubeId: "purpose-video",
                duration: "5:00",
                description: "Fixture",
                series: "Fixture",
              },
            ],
          },
          secret,
          {
            fetchImpl,
            sleep: async () => {},
            maxRequestAttempts: 2,
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof YoutubeVideoAvailabilityAuditError);
        assert.match(error.message, /temporarily unavailable/);
        assert.doesNotMatch(error.message, new RegExp(secret));
        return true;
      },
    );
  });

  it("registers every static member-facing curated YouTube collection", () => {
    const references = collectAllCuratedYoutubeVideoReferences();
    const surfaces = new Set(references.map((reference) => reference.surface));

    assert.deepEqual(
      [...surfaces].sort(),
      [
        "Discover featured series",
        "Discover watch rail",
        "Great Controversy teacher rail",
        "Pastoral topic videos",
        "Prophecy Explorer teacher rail",
        "Touchpoint resources",
      ].sort(),
    );
    assert.ok(
      references.some(
        (reference) =>
          reference.surface === "Touchpoint resources" &&
          reference.youtubeId === "vajA7LgeZaA",
      ),
    );
    assert.equal(
      references.some(
        (reference) =>
          reference.surface === "Verse explanation BibleProject thumbnails",
      ),
      false,
      "thumbnail-only IDs must not block release when cards open BibleProject pages",
    );
    assert.ok(
      references.some(
        (reference) =>
          reference.surface === "Discover watch rail" &&
          reference.cardId === "bp-forgiveness",
      ),
    );
    assert.ok(
      references.some(
        (reference) =>
          reference.surface === "Prophecy Explorer teacher rail" &&
          reference.youtubeId === "4V0p5R7Ga8I",
      ),
    );
    assert.ok(
      references.some(
        (reference) =>
          reference.surface === "Great Controversy teacher rail" &&
          reference.youtubeId === "N_u66nrvfjE",
      ),
    );
  });
});