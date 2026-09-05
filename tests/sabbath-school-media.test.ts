import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { sabbathSchoolMediaUrl } from "../lib/sabbath-school-media";
import {
  firstPlayableSabbathSchoolClip,
  flattenSabbathSchoolLessonClips,
  hasSabbathSchoolLessonVideo,
} from "../lib/sabbath-school-video-clips";

const overviewSource = readFileSync(
  new URL("../app/sabbath-school.tsx", import.meta.url),
  "utf8",
);
const playerSource = readFileSync(
  new URL("../components/sabbath-school/LessonVideoPlayer.tsx", import.meta.url),
  "utf8",
);
const watchScreenSource = readFileSync(
  new URL("../app/(tabs)/sabbath-school-video.tsx", import.meta.url),
  "utf8",
);
const homeSource = readFileSync(
  new URL("../app/(tabs)/home-v2.tsx", import.meta.url),
  "utf8",
);
const cardSource = readFileSync(
  new URL("../components/home-v2/SSGradientCard.tsx", import.meta.url),
  "utf8",
);

const adventechThumb =
  "https://sabbath-school-media.adventech.io/video/en/2026-03/thumb/hope.webp";

describe("Sabbath School web media proxy", () => {
  it("proxies Adventech thumbs through the existing video allowlist without //api", () => {
    const proxied = sabbathSchoolMediaUrl(adventechThumb, {
      platform: "web",
      baseUrl: "https://gracethroughfaith.app/",
    });
    assert.equal(
      proxied,
      `https://gracethroughfaith.app/api/sabbath-school/video?url=${encodeURIComponent(adventechThumb)}`,
    );
    assert.doesNotMatch(proxied, /\/\/api/);
    assert.equal(
      sabbathSchoolMediaUrl(adventechThumb, { platform: "ios" }),
      adventechThumb,
    );
    assert.equal(
      sabbathSchoolMediaUrl(adventechThumb, {
        platform: "web",
        baseUrl: "https://gracethroughfaith.app",
      }).includes("//api"),
      false,
    );
  });

  it("uses the proxy helper for Watch This Lesson thumbs and names the muted fallback", () => {
    assert.match(overviewSource, /LessonVideoPlayer/);
    assert.match(playerSource, /sabbathSchoolMediaUrl/);
    assert.match(playerSource, /LessonVideoThumb/);
    assert.match(playerSource, /videoThumbPlaceholder/);
    assert.match(playerSource, /onError=\{\(\) => setFailed\(true\)\}/);
    assert.match(playerSource, /\{artist \|\| "Lesson video"\}/);
    assert.match(playerSource, /backgroundColor: "#2F4A47"/);
    assert.match(watchScreenSource, /autoPlayFirst/);
    assert.match(watchScreenSource, /LessonVideoPlayer/);
    assert.equal(
      firstPlayableSabbathSchoolClip(
        flattenSabbathSchoolLessonClips([
          {
            artist: "It Is Written",
            clips: [
              {
                src: "https://sabbath-school-media.adventech.io/video/en/2026-03/iiw.mp4",
                title: "IIW",
                thumbnail: adventechThumb,
              },
            ],
          },
          {
            artist: "Hope Lives 365",
            clips: [
              {
                src: "https://sabbath-school-media.adventech.io/video/en/2026-03/hope.mp4",
                title: "Hope",
                thumbnail: adventechThumb,
              },
            ],
          },
        ]),
      )?.artist,
      "It Is Written",
    );
  });

  it("hides Home Watch when the lesson has no video URL", () => {
    assert.equal(hasSabbathSchoolLessonVideo(null), false);
    assert.equal(hasSabbathSchoolLessonVideo([]), false);
    assert.equal(
      hasSabbathSchoolLessonVideo([{ artist: "Hope", clips: [] }]),
      false,
    );
    assert.equal(
      hasSabbathSchoolLessonVideo([
        { artist: "Hope", clips: [{ src: "", title: "Missing" }] },
      ]),
      false,
    );
    assert.equal(
      hasSabbathSchoolLessonVideo([
        {
          artist: "Hope",
          clips: [{ src: "http://sabbath-school-media.adventech.io/video/en/x.mp4" }],
        },
      ]),
      false,
    );
    assert.equal(
      hasSabbathSchoolLessonVideo([
        {
          artist: "Hope",
          clips: [
            {
              src: "https://sabbath-school-media.adventech.io/video/en/2026-03/hope.mp4",
            },
          ],
        },
      ]),
      true,
    );
    assert.equal(
      flattenSabbathSchoolLessonClips(null).length,
      0,
    );
    assert.match(homeSource, /hasSabbathSchoolLessonVideo/);
    assert.match(homeSource, /showWatch=\{hasLessonVideo\}/);
    assert.match(cardSource, /showWatch && \(/);
    assert.match(cardSource, /▶ Watch/);
    assert.match(homeSource, /onContinue=\{goToContinueDay\}/);
    assert.match(watchScreenSource, /No lesson video is available for this week yet\./);
    assert.match(watchScreenSource, /Read this week's lesson/);
    assert.match(
      watchScreenSource,
      /buildSabbathSchoolTabRoute\(\s*"sabbath-school-day"/,
    );
    assert.match(watchScreenSource, /lastRead:\s*null/);
    assert.doesNotMatch(
      watchScreenSource,
      /clips\.length === 0 \? \s*<View style=\{s\.center\}/,
    );
  });
});
