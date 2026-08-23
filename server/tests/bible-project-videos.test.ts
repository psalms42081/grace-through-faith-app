import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BIBLE_PROJECT_VIDEOS } from "../data/bibleProjectVideos";

const unavailableYoutubeIds = new Set([
  "p-dwZ8cPQ7c",
  "Lb4dOM4-FVM",
  "oMhesKPKQPo",
  "s3BXfvCjIkM",
  "XRRbkMa217I",
]);

describe("BibleProject topic videos", () => {
  it("does not publish YouTube videos confirmed unavailable", () => {
    for (const [topicId, videos] of Object.entries(BIBLE_PROJECT_VIDEOS)) {
      for (const video of videos) {
        assert.equal(
          unavailableYoutubeIds.has(video.youtubeId),
          false,
          `${topicId} still publishes unavailable video ${video.title} (${video.youtubeId})`
        );
      }
    }
  });

  it("pulls the dead rails from the sensitive topics and keeps the working Addiction video", () => {
    assert.deepEqual(BIBLE_PROJECT_VIDEOS.grief, []);
    assert.deepEqual(BIBLE_PROJECT_VIDEOS.anxiety, []);
    assert.deepEqual(
      BIBLE_PROJECT_VIDEOS.addiction.map((video) => video.youtubeId),
      ["aNOZ7ocLD74"]
    );
  });
});