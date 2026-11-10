import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  sabbathSchoolAudioUrl,
  sabbathSchoolMediaUrl,
} from "../lib/sabbath-school-media";
import {
  earlierEpisodesHeading,
  earlierQuarterLessonClips,
  firstPlayableSabbathSchoolClip,
  flattenSabbathSchoolLessonClips,
  hasSabbathSchoolLessonVideo,
  relatedLessonVideoGroups,
  showOtherTrackVideosLabel,
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

  it("proxies Adventech lesson audio on web only", () => {
    const adventechAudio =
      "https://sabbath-school-media.adventech.io/audio/en/2026-03/lesson.mp3";
    const proxied = sabbathSchoolAudioUrl(adventechAudio, {
      platform: "web",
      baseUrl: "https://gracethroughfaith.app/",
    });
    assert.equal(
      proxied,
      `https://gracethroughfaith.app/api/sabbath-school/audio?url=${encodeURIComponent(adventechAudio)}`,
    );
    assert.doesNotMatch(proxied, /\/\/api/);
    assert.equal(
      sabbathSchoolAudioUrl(adventechAudio, { platform: "ios" }),
      adventechAudio,
    );
    const daySource = readFileSync(
      new URL("../app/(tabs)/sabbath-school-day.tsx", import.meta.url),
      "utf8",
    );
    assert.match(daySource, /sabbathSchoolAudioUrl/);
    assert.match(daySource, /waitForSabbathSchoolPlaybackStart/);
  });

  it("uses the proxy helper for Watch This Lesson thumbs and names the muted fallback", () => {
    assert.match(overviewSource, /LessonVideoPlayer/);
    assert.match(playerSource, /sabbathSchoolMediaUrl/);
    assert.match(playerSource, /LessonVideoThumb/);
    assert.match(playerSource, /videoThumbPlaceholder/);
    assert.match(playerSource, /onError=\{\(\) => setFailed\(true\)\}/);
    assert.match(playerSource, /\{artist \|\| "Lesson video"\}/);
    assert.match(playerSource, /backgroundColor: "#2F4A47"/);
    assert.doesNotMatch(watchScreenSource, /autoPlayFirst/);
    assert.doesNotMatch(playerSource, /autoPlayFirst|p\.play\(\)|autoPlay: true/);
    assert.match(playerSource, /useVideoSurfaceActive\(fullscreenLock\)/);
    assert.match(playerSource, /fullscreenOptions=\{\{ enable: true, orientation: "landscape" \}\}/);
    assert.match(playerSource, /onFullscreenEnter=\{\(\) => \{/);
    assert.match(playerSource, /onFullscreenExit=\{\(\) => \{/);
    assert.match(playerSource, /autoPlay: false/);
    assert.match(playerSource, /openYouTubeVideo\(youtubeId/);
    assert.match(playerSource, /youtubeIdFromUrl\(clip\.src\)/);
    const youtubeThumb = "https://i4.ytimg.com/vi/symxY-m2IIQ/hqdefault.jpg";
    assert.equal(
      sabbathSchoolMediaUrl(youtubeThumb, {
        platform: "web",
        baseUrl: "https://gracethroughfaith.app/",
      }),
      youtubeThumb,
    );
    assert.match(watchScreenSource, /LessonVideoPlayer/);
    assert.match(watchScreenSource, /layout="page"/);
    const pageStart = playerSource.indexOf('if (layout === "page")');
    const pageEnd = playerSource.indexOf("const chooser = showChooser");
    const pageLayout = playerSource.slice(pageStart, pageEnd);
    assert.ok(pageStart > 0 && pageEnd > pageStart);
    assert.match(pageLayout, /This week's videos/);
    assert.match(pageLayout, /s\.listThumb/);
    assert.match(playerSource, /listThumb: \{ width: 120/);
    assert.match(pageLayout, /Selected/);
    assert.match(pageLayout, /playWhenReady/);
    assert.doesNotMatch(pageLayout, /horizontal/);
    assert.doesNotMatch(pageLayout, /autoPlay:\s*true/);
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

  it("lists the other track's videos under the selected lesson video", () => {
    const hope = {
      src: "https://sabbath-school-media.adventech.io/video/en/2026-04/hope.mp4",
      title: "Hope Sabbath School",
      thumbnail: adventechThumb,
      artist: "Hope Sabbath School",
    };
    const inverse = {
      src: "https://sabbath-school-media.adventech.io/video/en/2026-04/inverse.mp4",
      title: "Now Hear This!",
      thumbnail: adventechThumb,
      artist: "inVerse Bible",
    };
    const adult = relatedLessonVideoGroups(
      [
        { label: "Adult", clips: [hope] },
        { label: "InVerse", clips: [] },
      ],
      new Set([inverse.src]),
    );
    assert.deepEqual(adult.map((group) => group.label), ["Adult"]);
    assert.equal(adult[0].clips[0].title, "Hope Sabbath School");
    assert.deepEqual(
      relatedLessonVideoGroups([{ label: "Adult", clips: [hope] }], new Set([hope.src])),
      [],
    );
    assert.match(watchScreenSource, /sabbath-school-other-videos/);
    assert.match(
      watchScreenSource,
      /\/api\/sabbath-school\/lesson\/\$\{lessonNumber\}\?userId=\$\{userId\}&curriculum=\$\{track\.id\}/,
    );
    assert.match(watchScreenSource, /more=\{moreVideos\}/);
    assert.match(
      watchScreenSource,
      /clips\.length === 0 && moreVideos\.length === 0 && earlierVideos\.length === 0/,
    );
    assert.match(watchScreenSource, /earlierLessonVideos/);
    assert.match(watchScreenSource, /useFocusEffect/);
    assert.match(watchScreenSource, /revealKey=\{`\$\{screenVisit\}:\$\{selectedTrack\}`\}/);
    assert.equal(showOtherTrackVideosLabel("Adult"), "Show Adult videos on this lesson");
    assert.equal(showOtherTrackVideosLabel("InVerse"), "Show InVerse videos on this lesson");
    assert.equal(earlierEpisodesHeading("InVerse"), "Earlier InVerse episodes");
    assert.equal(earlierEpisodesHeading("Adult"), "Earlier Adult episodes");
    assert.deepEqual(
      earlierQuarterLessonClips(
        [
          {
            lessonNumber: 7,
            title: "Now Hear This!",
            videoByArtist: [{ artist: "Hope Sabbath School", clips: [hope] }],
          },
          {
            lessonNumber: 6,
            title: "The Prophetic Writings",
            videoByArtist: [
              {
                artist: "Hope Sabbath School",
                clips: [{ ...hope, src: "https://sabbath-school-media.adventech.io/video/en/2026-04/lesson6.mp4", title: "Hope" }],
              },
            ],
          },
          { lessonNumber: 5, title: "Revelation and Inspiration", videoByArtist: [] },
        ],
        7,
      ).map((clip) => clip.title),
      ["Lesson 6 · The Prophetic Writings"],
    );
    assert.match(playerSource, /showOtherTrackVideosLabel\(group\.label\)/);
    assert.match(playerSource, /testID="lesson-video-other-toggle"/);
    assert.match(playerSource, /accessibilityState=\{\{ expanded: open \}\}/);
    assert.match(playerSource, /useState<ReadonlySet<string>>\(new Set\(\)\)/);
    assert.match(playerSource, /setOtherTracksOpen\(new Set\(\)\)/);
    assert.match(playerSource, /testID="lesson-video-earlier"/);
    assert.match(playerSource, /testID="lesson-video-earlier-row"/);
    assert.match(playerSource, /\{earlier\.heading\}/);
    assert.doesNotMatch(playerSource, /More on this week's lesson/);
    assert.match(playerSource, /testID="lesson-video-more-row"/);
    assert.match(playerSource, /s\.listRow/);
    const pageStart = playerSource.indexOf('if (layout === "page")');
    const pageEnd = playerSource.indexOf("const chooser = showChooser");
    const pageLayout = playerSource.slice(pageStart, pageEnd);
    assert.match(pageLayout, /lesson-video-earlier/);
    assert.match(pageLayout, /open\s*\?\s*group\.clips\.map/);
  });
});
