import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertBibleProjectVideoCatalog,
  BIBLE_PROJECT_VIDEOS,
  KNOWN_UNAVAILABLE_YOUTUBE_IDS,
} from "../data/bibleProjectVideos";

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
});