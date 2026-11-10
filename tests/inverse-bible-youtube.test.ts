import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, beforeEach } from "node:test";

import { flattenSabbathSchoolLessonClips, youtubeIdFromUrl } from "../lib/sabbath-school-video-clips";
import {
  INVERSE_BIBLE_CHANNEL_ID,
  INVERSE_BIBLE_UPLOADS_PLAYLIST_ID,
  INVERSE_EMPTY_LIST_RETRY_MS,
  INVERSE_EPISODE_CACHE_TTL_MS,
  earlierInverseLessonClips,
  getInverseEpisodes,
  inverseEpisodeArtistGroup,
  setInverseEpisodeStore,
  matchInverseEpisode,
  parseInverseEpisodeTitle,
  parseInverseUploadsRss,
  resetInverseEpisodeCacheForTests,
  withInverseYouTubeLesson,
  type InverseEpisode,
  type InverseUpload,
} from "../server/services/inverse-bible-youtube";

const Q4 = { startDate: "27/09/2026", endDate: "26/12/2026" };
const Q3 = { startDate: "28/06/2026", endDate: "26/09/2026" };
const NOW_HEAR_THIS_THUMB = "https://i4.ytimg.com/vi/symxY-m2IIQ/hqdefault.jpg";

const RSS = `<?xml version="1.0"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
  <yt:channelId>${INVERSE_BIBLE_CHANNEL_ID}</yt:channelId>
  <yt:playlistId>${INVERSE_BIBLE_UPLOADS_PLAYLIST_ID}</yt:playlistId>
  <entry>
    <yt:videoId>symxY-m2IIQ</yt:videoId>
    <title>7 Now Hear This!</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=symxY-m2IIQ"/>
    <published>2026-11-08T14:00:11+00:00</published>
    <author><name>inVerse Bible</name></author>
    <media:group>
      <media:thumbnail url="${NOW_HEAR_THIS_THUMB}" width="480" height="360"/>
    </media:group>
  </entry>
  <entry>
    <yt:videoId>IaZKbqOimjA</yt:videoId>
    <title>Join us on Facebook or at HopeTV.org/inVerse!</title>
    <published>2026-11-04T17:00:12+00:00</published>
    <author><name>inVerse Bible</name></author>
    <media:group>
      <media:thumbnail url="https://i2.ytimg.com/vi/IaZKbqOimjA/hqdefault.jpg" width="480" height="360"/>
    </media:group>
  </entry>
  <entry>
    <yt:videoId>short123456</yt:videoId>
    <title>8 A Short Lesson</title>
    <link rel="alternate" href="https://www.youtube.com/shorts/short123456"/>
    <published>2026-11-15T14:00:00+00:00</published>
    <author><name>inVerse Bible</name></author>
    <media:group>
      <media:thumbnail url="https://i1.ytimg.com/vi/short123456/hqdefault.jpg" width="480" height="360"/>
    </media:group>
  </entry>
  <entry>
    <yt:videoId>GULEYad6Kt8</yt:videoId>
    <title>13 Earth’s Closing Scenes</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=GULEYad6Kt8"/>
    <published>2026-09-20T13:00:26+00:00</published>
    <author><name>inVerse Bible</name></author>
    <media:group>
      <media:thumbnail url="https://i4.ytimg.com/vi/GULEYad6Kt8/hqdefault.jpg" width="480" height="360"/>
    </media:group>
  </entry>
  <entry>
    <yt:videoId>CFyZLiV7jVI</yt:videoId>
    <title>1 The Creator Speaks</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=CFyZLiV7jVI"/>
    <published>2026-09-27T13:00:04+00:00</published>
    <author><name>inVerse Bible</name></author>
    <media:group>
      <media:thumbnail url="https://i4.ytimg.com/vi/CFyZLiV7jVI/hqdefault.jpg" width="480" height="360"/>
    </media:group>
  </entry>
  <entry>
    <yt:videoId>BrWzdThOo9s</yt:videoId>
    <title>6 The Prophetic Writings</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=BrWzdThOo9s"/>
    <published>2026-11-01T14:00:34+00:00</published>
    <author><name>inVerse Bible</name></author>
    <media:group>
      <media:thumbnail url="https://i3.ytimg.com/vi/BrWzdThOo9s/hqdefault.jpg" width="480" height="360"/>
    </media:group>
  </entry>
</feed>`;

function watchHtml(id: string, seconds: number): string {
  const player = {
    videoDetails: { videoId: id, lengthSeconds: String(seconds) },
    playabilityStatus: { status: "OK" },
  };
  return `<html><script>ytInitialPlayerResponse = ${JSON.stringify(player)};</script></html>`;
}

function fakeFetch(xml: string) {
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    if (url.includes("feeds/videos.xml")) {
      return new Response(xml, { status: 200 });
    }
    const id = new URL(url).searchParams.get("v") ?? "";
    const seconds = id === "short123456" ? 42 : 28 * 60;
    return new Response(watchHtml(id, seconds), { status: 200, headers: { "content-type": "text/html" } });
  };
  return { fetchImpl, urls };
}

function episode(overrides: Partial<InverseEpisode> = {}): InverseEpisode {
  const upload: InverseUpload = {
    youtubeId: "symxY-m2IIQ",
    youtubeTitle: "7 Now Hear This!",
    lessonNumber: 7,
    lessonTitle: "Now Hear This!",
    rowTitle: "Lesson 7 · Now Hear This!",
    thumbnail: NOW_HEAR_THIS_THUMB,
    channel: "inVerse Bible",
    publishedAt: "2026-11-08T14:00:11+00:00",
    ...overrides,
  };
  return { ...upload, ...overrides };
}

describe("InVerse YouTube episodes", () => {
  beforeEach(() => {
    resetInverseEpisodeCacheForTests();
  });

  it("reads the lesson number from the front of the title", () => {
    assert.deepEqual(parseInverseEpisodeTitle("6 The Prophetic Writings"), {
      lessonNumber: 6,
      lessonTitle: "The Prophetic Writings",
      rowTitle: "Lesson 6 · The Prophetic Writings",
    });
    assert.deepEqual(parseInverseEpisodeTitle("07 Now Hear This!"), {
      lessonNumber: 7,
      lessonTitle: "Now Hear This!",
      rowTitle: "Lesson 7 · Now Hear This!",
    });
    assert.equal(parseInverseEpisodeTitle("14 The Extra Lesson")?.lessonNumber, 14);
    assert.equal(parseInverseEpisodeTitle("Join us on Facebook or at HopeTV.org/inVerse!"), null);
    assert.equal(parseInverseEpisodeTitle("Episode 07 Now Hear This!"), null);
    assert.equal(parseInverseEpisodeTitle("15 Outside the Quarter"), null);
  });

  it("keeps the YouTube thumbnail and skips promos, shorts, and the previous quarter", () => {
    const uploads = parseInverseUploadsRss(RSS);
    assert.deepEqual(
      uploads.map((item) => item.youtubeTitle),
      [
        "7 Now Hear This!",
        "13 Earth’s Closing Scenes",
        "1 The Creator Speaks",
        "6 The Prophetic Writings",
      ],
    );
    const lesson7 = uploads.find((item) => item.lessonNumber === 7);
    assert.ok(lesson7);
    assert.equal(lesson7.thumbnail, NOW_HEAR_THIS_THUMB);
    assert.equal(lesson7.rowTitle, "Lesson 7 · Now Hear This!");
    assert.equal(lesson7.channel, "inVerse Bible");

    const qualified = uploads;
    const quarter = { curriculumType: "inverse", ...Q4 };
    const matched = matchInverseEpisode(qualified, { lessonNumber: 7, ...Q4 });
    assert.equal(matched?.rowTitle, "Lesson 7 · Now Hear This!");
    assert.equal(matched?.thumbnail, NOW_HEAR_THIS_THUMB);
    assert.equal(matchInverseEpisode(qualified, { lessonNumber: 8, ...Q4 }), null);
    assert.equal(matchInverseEpisode(qualified, { lessonNumber: 13, ...Q4 }), null);
    assert.equal(
      matchInverseEpisode(qualified, { lessonNumber: 13, ...Q3 })?.youtubeTitle,
      "13 Earth’s Closing Scenes",
    );
    assert.equal(
      matchInverseEpisode(qualified, { lessonNumber: 1, ...Q4 })?.rowTitle,
      "Lesson 1 · The Creator Speaks",
    );

    const group = inverseEpisodeArtistGroup(matched!);
    assert.equal(group.clips[0].title, "Lesson 7 · Now Hear This!");
    assert.equal(group.clips[0].thumbnail, NOW_HEAR_THIS_THUMB);
    assert.equal(group.clips[0].youtubeId, "symxY-m2IIQ");

    const stored = {
      lessonNumber: 7,
      videoByArtist: [{ artist: "InVerse Bible", clips: [{ src: "https://sabbath-school-media.adventech.io/x.mp4", title: "Now Hear This!" }] }],
    };
    const replaced = withInverseYouTubeLesson(stored, quarter, qualified);
    assert.equal(replaced.videoByArtist?.[0].clips[0].title, "Lesson 7 · Now Hear This!");
    assert.equal(
      withInverseYouTubeLesson(stored, { curriculumType: "adult", ...Q4 }, qualified),
      stored,
    );

    const clips = flattenSabbathSchoolLessonClips(replaced.videoByArtist);
    assert.equal(clips[0].youtubeId, "symxY-m2IIQ");
    assert.equal(clips[0].thumbnail, NOW_HEAR_THIS_THUMB);
    assert.equal(youtubeIdFromUrl(clips[0].src), "symxY-m2IIQ");
    assert.equal(youtubeIdFromUrl("https://www.youtube.com/shorts/symxY-m2IIQ"), null);
  });

  it("lists this quarter's earlier episodes newest first", () => {
    const episodes = [
      episode({
        lessonNumber: 7,
        publishedAt: "2026-11-08T14:00:11+00:00",
        rowTitle: "Lesson 7 · Now Hear This!",
        youtubeTitle: "7 Now Hear This!",
      }),
      episode({
        youtubeId: "BrWzdThOo9s",
        lessonNumber: 6,
        lessonTitle: "The Prophetic Writings",
        youtubeTitle: "6 The Prophetic Writings",
        rowTitle: "Lesson 6 · The Prophetic Writings",
        publishedAt: "2026-11-01T14:00:34+00:00",
        thumbnail: "https://i3.ytimg.com/vi/BrWzdThOo9s/hqdefault.jpg",
      }),
      episode({
        youtubeId: "CFyZLiV7jVI",
        lessonNumber: 1,
        lessonTitle: "The Creator Speaks",
        youtubeTitle: "1 The Creator Speaks",
        rowTitle: "Lesson 1 · The Creator Speaks",
        publishedAt: "2026-09-27T13:00:04+00:00",
      }),
      episode({
        youtubeId: "GULEYad6Kt8",
        lessonNumber: 13,
        lessonTitle: "Earth’s Closing Scenes",
        youtubeTitle: "13 Earth’s Closing Scenes",
        rowTitle: "Lesson 13 · Earth’s Closing Scenes",
        publishedAt: "2026-09-20T13:00:26+00:00",
      }),
    ];
    assert.deepEqual(
      earlierInverseLessonClips(episodes, { lessonNumber: 7, ...Q4 }).map((clip) => clip.title),
      ["Lesson 6 · The Prophetic Writings", "Lesson 1 · The Creator Speaks"],
    );
    assert.deepEqual(earlierInverseLessonClips(episodes, { lessonNumber: 1, ...Q4 }), []);
  });

  it("caches the uploads list for a day", async () => {
    const { fetchImpl, urls } = fakeFetch(RSS);
    const first = await getInverseEpisodes({ now: 1_000, fetchImpl });
    const second = await getInverseEpisodes({ now: 1_000 + INVERSE_EPISODE_CACHE_TTL_MS - 1, fetchImpl });
    assert.equal(second, first);
    assert.equal(urls.filter((url) => url.includes("feeds/videos.xml")).length, 1);
    assert.equal(first.find((item) => item.lessonNumber === 7)?.rowTitle, "Lesson 7 · Now Hear This!");
    assert.equal(first.some((item) => item.youtubeId === "short123456"), false);
    assert.equal(first.some((item) => item.lessonNumber === 8), false);

    await getInverseEpisodes({ now: 1_000 + INVERSE_EPISODE_CACHE_TTL_MS, fetchImpl });
    assert.equal(urls.filter((url) => url.includes("feeds/videos.xml")).length, 2);
  });

  it("remembers an episode after it leaves the latest uploads page", async () => {
    const laterOnly = RSS.replace(/<entry>[\s\S]*?CFyZLiV7jVI[\s\S]*?<\/entry>/, "");
    assert.equal(laterOnly.includes("CFyZLiV7jVI"), false);
    let xml = RSS;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("feeds/videos.xml")) return new Response(xml, { status: 200 });
      const id = new URL(url).searchParams.get("v") ?? "";
      const seconds = id === "short123456" ? 42 : 28 * 60;
      return new Response(watchHtml(id, seconds), { status: 200 });
    };
    const now = Date.parse("2026-11-10T00:00:00Z");
    const first = await getInverseEpisodes({ now, fetchImpl });
    assert.equal(first.some((item) => item.lessonNumber === 1), true);
    xml = laterOnly;
    const second = await getInverseEpisodes({
      now: now + INVERSE_EPISODE_CACHE_TTL_MS,
      fetchImpl,
    });
    assert.equal(second.some((item) => item.lessonNumber === 1), true);
    assert.equal(second.some((item) => item.lessonNumber === 7), true);
  });

  it("reads the saved list after the process memory is cleared", async () => {
    let saved: { fetchedAt: number; episodes: InverseEpisode[] } | null = null;
    const { fetchImpl, urls } = fakeFetch(RSS);
    const store = {
      async read() {
        return saved;
      },
      async write(entry: { fetchedAt: number; episodes: InverseEpisode[] }) {
        saved = entry;
      },
    };
    setInverseEpisodeStore(store);
    const now = Date.parse("2026-11-10T00:00:00Z");
    await getInverseEpisodes({ now, fetchImpl });
    assert.ok(saved);
    resetInverseEpisodeCacheForTests();
    setInverseEpisodeStore(store);
    const restored = await getInverseEpisodes({ now: now + 60_000, fetchImpl });
    assert.equal(restored.some((item) => item.lessonNumber === 7), true);
    assert.equal(urls.filter((url) => url.includes("feeds/videos.xml")).length, 1);
  });

  it("shares one refresh across overlapping screen opens", async () => {
    const { fetchImpl, urls } = fakeFetch(RSS);
    const [a, b] = await Promise.all([
      getInverseEpisodes({ now: 5_000, fetchImpl }),
      getInverseEpisodes({ now: 5_000, fetchImpl }),
    ]);
    assert.equal(a, b);
    assert.equal(urls.filter((url) => url.includes("feeds/videos.xml")).length, 1);
  });

  it("serves the episode from the current and lesson routes through the existing player", () => {
    const route = readFileSync(new URL("../server/routes/sabbath-school.ts", import.meta.url), "utf8");
    assert.equal(route.match(/await lessonWithInverseEpisode\(/g)?.length, 2);
    const opener = readFileSync(new URL("../lib/open-youtube-video.ts", import.meta.url), "utf8");
    assert.match(opener, /pathname: "\/sermon-player"/);
    const server = readFileSync(new URL("../server/index.ts", import.meta.url), "utf8");
    assert.match(server, /setInverseEpisodeStore\(inverseEpisodeDbStore\)/);
    assert.match(server, /getInverseEpisodes\(\)/);
    const player = readFileSync(new URL("../app/sermon-player.tsx", import.meta.url), "utf8");
    assert.match(player, /autoplay=0/);
    assert.match(player, /autoplay:0/);
    assert.match(player, /mediaPlaybackRequiresUserAction/);
  });

  it("qualifies episodes from the uploads feed without watch pages", async () => {
    const source = readFileSync(new URL("../server/services/inverse-bible-youtube.ts", import.meta.url), "utf8");
    assert.doesNotMatch(source, /loadWatchFacts/);
    assert.doesNotMatch(source, /youtubei\/v1\/player/);
    const { fetchImpl, urls } = fakeFetch(RSS);
    const episodes = await getInverseEpisodes({ now: 20_000, fetchImpl });
    assert.equal(episodes.find((item) => item.lessonNumber === 7)?.youtubeId, "symxY-m2IIQ");
    assert.equal(episodes.some((item) => item.youtubeId === "short123456"), false);
    assert.equal(urls.some((url) => url.includes("youtube.com/watch") || url.includes("youtubei")), false);
    assert.equal(urls.filter((url) => url.includes("feeds/videos.xml")).length, 1);
  });

  it("refetches when the saved list is empty", async () => {
    const now = Date.parse("2026-11-10T09:46:01.109Z");
    let writes = 0;
    setInverseEpisodeStore({
      async read() {
        return { fetchedAt: now, episodes: [] };
      },
      async write() {
        writes += 1;
      },
    });
    const { fetchImpl, urls } = fakeFetch(RSS);
    const episodes = await getInverseEpisodes({ now: now + 60_000, fetchImpl });
    assert.equal(episodes.some((item) => item.lessonNumber === 7), true);
    assert.equal(urls.filter((url) => url.includes("feeds/videos.xml")).length, 1);
    assert.equal(writes, 1);
  });

  it("does not keep a failed qualification for a day", async () => {
    const promoOnly = RSS.replace(/<entry>[\s\S]*?<\/entry>/g, (entry) =>
      entry.includes("Join us on Facebook") ? entry : "",
    );
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("feeds/videos.xml")) return new Response(promoOnly, { status: 200 });
      return new Response("unused", { status: 500 });
    };
    const now = Date.parse("2026-11-10T09:46:01.109Z");
    const first = await getInverseEpisodes({ now, fetchImpl });
    assert.deepEqual(first, []);
    await getInverseEpisodes({ now: now + INVERSE_EMPTY_LIST_RETRY_MS - 1, fetchImpl });
    assert.equal(urls.filter((url) => url.includes("feeds/videos.xml")).length, 1);
    await getInverseEpisodes({ now: now + INVERSE_EMPTY_LIST_RETRY_MS, fetchImpl });
    assert.equal(urls.filter((url) => url.includes("feeds/videos.xml")).length, 2);
  });

  it("replaces the live Adventech mp4 shape with the matching episode", () => {
    const liveLesson = {
      lessonNumber: 7,
      title: "Now Hear This!",
      videoByArtist: [
        {
          artist: "InVerse Bible",
          clips: [
            {
              src: "https://sabbath-school-media.adventech.io/video/en/2026-04-cq/clip.mp4",
              title: "Now Hear This!",
              thumbnail: "https://sabbath-school-media.adventech.io/thumb.webp",
              target: "en/2026-04-cq/07",
            },
          ],
        },
      ],
    };
    const episodes = [
      episode(),
      episode({
        youtubeId: "BrWzdThOo9s",
        lessonNumber: 6,
        lessonTitle: "The Prophetic Writings",
        youtubeTitle: "6 The Prophetic Writings",
        rowTitle: "Lesson 6 · The Prophetic Writings",
        publishedAt: "2026-11-01T14:00:34+00:00",
        thumbnail: "https://i3.ytimg.com/vi/BrWzdThOo9s/hqdefault.jpg",
      }),
    ];
    const replaced = withInverseYouTubeLesson(liveLesson, { curriculumType: "inverse", ...Q4 }, episodes);
    const clips = flattenSabbathSchoolLessonClips(replaced.videoByArtist);
    assert.equal(clips[0].title, "Lesson 7 · Now Hear This!");
    assert.equal(clips[0].youtubeId, "symxY-m2IIQ");
    assert.equal(clips[0].artist, "inVerse Bible");
    assert.equal(earlierInverseLessonClips(episodes, { lessonNumber: 7, ...Q4 })[0].title, "Lesson 6 · The Prophetic Writings");
  });
});
