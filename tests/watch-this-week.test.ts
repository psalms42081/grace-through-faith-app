import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MIN_DURATION_SECONDS,
  OFFICIAL_CHANNEL_ID,
  WATCH_PLAYLISTS,
  WATCH_THIS_WEEK_CRON,
  WATCH_THIS_WEEK_TIMEZONE,
  chooseFeaturedVideo,
  classifyVideoFacts,
  nextSydneySaturdayMidnight,
  parsePlaylistRss,
  parseWatchPage,
  planWatchThisWeek,
  sydneyWeekSaturday,
  visibleFeaturedVideo,
  zonedParts,
  type FeaturedVideoRow,
  type PlaylistCandidate,
  type VideoFacts,
} from "../server/services/watch-this-week";

const NOW = new Date("2026-11-08T09:23:00.000Z");
const HEART = "PL-k2Gb-DBYo_veuio-fKkSQT3Cy2I8kRd";
const DANIEL = "PLOkz7KYTpY7g";
const UNLOCKING = "PLDTnZhgYdEBQ";

const LONG: VideoFacts = {
  durationSeconds: 452,
  isShort: false,
  isLive: false,
  isPremiere: false,
};

function video(overrides: Partial<PlaylistCandidate> = {}): PlaylistCandidate {
  return {
    youtubeId: "4sePiZ18pug",
    title: "The Three Garments of Joseph - Pastor Erton Köhler",
    channel: "Seventh-day Adventist Church",
    channelId: OFFICIAL_CHANNEL_ID,
    playlistId: HEART,
    publishedAt: "2026-10-30T14:00:30.000Z",
    ...overrides,
  };
}

function row(overrides: Partial<FeaturedVideoRow> = {}): FeaturedVideoRow {
  return {
    youtubeId: "previous111",
    title: "Last week",
    channel: "Seventh-day Adventist Church",
    publishedAt: "2026-10-20T12:00:00.000Z",
    featuredWeek: "2026-10-31",
    hidden: false,
    ...overrides,
  };
}

describe("Watch this week schedule", () => {
  it("documents Saturday 00:00 Australia/Sydney as cron 0 0 * * 6", () => {
    assert.equal(WATCH_THIS_WEEK_CRON, "0 0 * * 6");
    assert.equal(WATCH_THIS_WEEK_TIMEZONE, "Australia/Sydney");
    assert.equal(MIN_DURATION_SECONDS, 300);
    assert.deepEqual(
      WATCH_PLAYLISTS.map((playlist) => playlist.id),
      [DANIEL, UNLOCKING, HEART],
    );
  });

  it("names the Sydney week by the Saturday that opened it", () => {
    assert.equal(sydneyWeekSaturday(NOW), "2026-11-07");
    const saturdayMorning = new Date("2026-11-06T13:00:00.000Z");
    assert.equal(sydneyWeekSaturday(saturdayMorning), "2026-11-07");
    const fridaySydney = new Date("2026-11-06T02:00:00.000Z");
    assert.equal(sydneyWeekSaturday(fridaySydney), "2026-10-31");
  });

  it("schedules the next run at Sydney Saturday midnight without a fixed offset", () => {
    const next = nextSydneySaturdayMidnight(NOW);
    assert.equal(next.toISOString(), "2026-11-13T13:00:00.000Z");
    const parts = zonedParts(next, WATCH_THIS_WEEK_TIMEZONE);
    assert.equal(parts.weekday, "Sat");
    assert.equal(parts.hour, 0);
    assert.equal(parts.minute, 0);
    assert.equal(`${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`, "2026-11-14");

    const winter = nextSydneySaturdayMidnight(new Date("2026-06-04T14:00:00.000Z"));
    assert.equal(winter.toISOString(), "2026-06-05T14:00:00.000Z");
    const winterParts = zonedParts(winter, WATCH_THIS_WEEK_TIMEZONE);
    assert.equal(winterParts.weekday, "Sat");
    assert.equal(winterParts.hour, 0);
  });
});

describe("Watch this week selection", () => {
  it("keeps uploads inside the last 30 days and drops anything older", () => {
    const inside = video({
      youtubeId: "insidevid11",
      publishedAt: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const outside = video({
      youtubeId: "outsidevi11",
      publishedAt: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000 - 1).toISOString(),
      playlistId: DANIEL,
    });
    const facts = new Map<string, VideoFacts>([
      [inside.youtubeId, LONG],
      [outside.youtubeId, { ...LONG, durationSeconds: 2400 }],
    ]);
    const picked = chooseFeaturedVideo({
      now: NOW,
      videos: [outside, inside],
      factsById: facts,
      blockedIds: new Set(),
    });
    assert.equal(picked?.youtubeId, inside.youtubeId);
  });

  it("does not fall back to an older video when nothing in the window qualifies", () => {
    const older = video({
      youtubeId: "olderlong11",
      publishedAt: "2026-09-01T00:00:00.000Z",
      playlistId: DANIEL,
    });
    const picked = chooseFeaturedVideo({
      now: NOW,
      videos: [older],
      factsById: new Map([[older.youtubeId, { ...LONG, durationSeconds: 3600 }]]),
      blockedIds: new Set(),
    });
    assert.equal(picked, null);

    const plan = planWatchThisWeek({
      now: NOW,
      videos: [older],
      factsById: new Map([[older.youtubeId, LONG]]),
      history: [row()],
    });
    assert.equal(plan.outcome, "keep-previous");
    assert.equal(plan.youtubeId, "previous111");
    assert.equal(plan.featuredWeek, "2026-11-07");
  });

  it("leaves the card empty when there is no previous feature and nothing qualifies", () => {
    const plan = planWatchThisWeek({
      now: NOW,
      videos: [],
      factsById: new Map(),
      history: [],
    });
    assert.equal(plan.outcome, "empty");
    assert.equal(plan.youtubeId, null);
    assert.equal(visibleFeaturedVideo([]), null);
  });

  it("skips a hidden video and features the next qualifying one", () => {
    const hidden = video({
      youtubeId: "hiddenvid11",
      publishedAt: "2026-11-06T18:00:22.000Z",
    });
    const next = video({
      youtubeId: "nextqualif1",
      publishedAt: "2026-10-30T14:00:30.000Z",
    });
    const plan = planWatchThisWeek({
      now: NOW,
      videos: [hidden, next],
      factsById: new Map([
        [hidden.youtubeId, LONG],
        [next.youtubeId, LONG],
      ]),
      history: [row({ youtubeId: hidden.youtubeId, hidden: true, featuredWeek: "2026-11-01" })],
    });
    assert.equal(plan.outcome, "feature");
    assert.equal(plan.youtubeId, next.youtubeId);
  });

  it("skips videos under 5 minutes, including an otherwise newer upload", () => {
    const tooShort = video({
      youtubeId: "tooshort111",
      publishedAt: "2026-11-06T18:00:22.000Z",
    });
    const longEnough = video({
      youtubeId: "longenough1",
      publishedAt: "2026-10-30T14:00:30.000Z",
      playlistId: DANIEL,
    });
    const facts = new Map<string, VideoFacts>([
      [tooShort.youtubeId, { ...LONG, durationSeconds: 299 }],
      [longEnough.youtubeId, { ...LONG, durationSeconds: 300 }],
    ]);
    assert.equal(classifyVideoFacts(facts.get(tooShort.youtubeId)!).reason, "under-5-minutes");
    assert.equal(classifyVideoFacts(facts.get(longEnough.youtubeId)!).eligible, true);
    const picked = chooseFeaturedVideo({
      now: NOW,
      videos: [tooShort, longEnough],
      factsById: facts,
      blockedIds: new Set(),
    });
    assert.equal(picked?.youtubeId, longEnough.youtubeId);
  });

  it("skips Shorts, livestreams, premieres, and unknown durations", () => {
    const cases: Array<[string, VideoFacts]> = [
      ["shortv11111", { ...LONG, isShort: true, durationSeconds: 600 }],
      ["livevid1111", { ...LONG, isLive: true }],
      ["premiere111", { ...LONG, isPremiere: true }],
      ["unknowndur1", { ...LONG, durationSeconds: null }],
    ];
    for (const [youtubeId, facts] of cases) {
      const picked = chooseFeaturedVideo({
        now: NOW,
        videos: [video({ youtubeId })],
        factsById: new Map([[youtubeId, facts]]),
        blockedIds: new Set(),
      });
      assert.equal(picked, null, youtubeId);
    }
  });

  it("only considers the three allow-listed playlists on the official channel", () => {
    const outsider = video({
      youtubeId: "godfirst111",
      playlistId: "PLgodfirstxx",
      publishedAt: "2026-11-07T00:00:00.000Z",
    });
    const otherChannel = video({
      youtubeId: "otherchan11",
      channelId: "UCnotthechurch",
      publishedAt: "2026-11-07T01:00:00.000Z",
      playlistId: UNLOCKING,
    });
    const allowed = video({
      youtubeId: "allowed1111",
      playlistId: UNLOCKING,
      publishedAt: "2026-10-20T00:00:00.000Z",
    });
    const picked = chooseFeaturedVideo({
      now: NOW,
      videos: [outsider, otherChannel, allowed],
      factsById: new Map([
        [outsider.youtubeId, LONG],
        [otherChannel.youtubeId, LONG],
        [allowed.youtubeId, LONG],
      ]),
      blockedIds: new Set(),
    });
    assert.equal(picked?.youtubeId, allowed.youtubeId);
    assert.equal(picked?.playlistId, UNLOCKING);
  });

  it("does not feature a video that was already featured, and keeps this week's row", () => {
    const already = video({ youtubeId: "already1111", publishedAt: "2026-11-01T00:00:00.000Z" });
    const newer = video({
      youtubeId: "newerone111",
      publishedAt: "2026-11-06T00:00:00.000Z",
      playlistId: DANIEL,
    });
    const repeat = chooseFeaturedVideo({
      now: NOW,
      videos: [already, newer],
      factsById: new Map([
        [already.youtubeId, LONG],
        [newer.youtubeId, LONG],
      ]),
      blockedIds: new Set([already.youtubeId]),
    });
    assert.equal(repeat?.youtubeId, newer.youtubeId);

    const plan = planWatchThisWeek({
      now: NOW,
      videos: [newer],
      factsById: new Map([[newer.youtubeId, LONG]]),
      history: [row({ youtubeId: "thisweek111", featuredWeek: "2026-11-07", publishedAt: "2026-10-30T00:00:00.000Z" })],
    });
    assert.equal(plan.outcome, "already-featured");
    assert.equal(plan.youtubeId, "thisweek111");
  });

  it("shows the previous visible week when this week's row is hidden", () => {
    const card = visibleFeaturedVideo([
      row({ youtubeId: "hiddenweek1", featuredWeek: "2026-11-07", hidden: true, publishedAt: "2026-11-06T00:00:00.000Z" }),
      row({ youtubeId: "lastvisible", featuredWeek: "2026-10-31" }),
    ]);
    assert.equal(card?.youtubeId, "lastvisible");
  });
});

describe("public YouTube classification", () => {
  it("reads duration from the watch page and rejects a missing duration", () => {
    const html = [
      '<link rel="canonical" href="https://www.youtube.com/watch?v=4sePiZ18pug">',
      'var ytInitialPlayerResponse = {"playabilityStatus":{"status":"OK"},"videoDetails":{"videoId":"4sePiZ18pug","lengthSeconds":"452","isLiveContent":false},"microformat":{"playerMicroformatRenderer":{}}};',
    ].join("\n");
    const facts = parseWatchPage(html, "4sePiZ18pug");
    assert.deepEqual(facts, {
      durationSeconds: 452,
      isShort: false,
      isLive: false,
      isPremiere: false,
    });
    assert.equal(classifyVideoFacts(facts).eligible, true);

    const missing = parseWatchPage(
      'var ytInitialPlayerResponse = {"playabilityStatus":{"status":"OK"},"videoDetails":{"videoId":"4sePiZ18pug","isLiveContent":false}};',
      "4sePiZ18pug",
    );
    assert.equal(missing.durationSeconds, null);
    assert.equal(classifyVideoFacts(missing).reason, "duration-unknown");
  });

  it("flags Shorts, livestreams, and premieres from the public page", () => {
    const shortHtml = '<link rel="canonical" href="https://www.youtube.com/shorts/shortv11111">var ytInitialPlayerResponse = {"playabilityStatus":{"status":"OK"},"videoDetails":{"videoId":"shortv11111","lengthSeconds":"600","isLiveContent":false}};';
    assert.equal(parseWatchPage(shortHtml, "shortv11111").isShort, true);

    const liveHtml = 'var ytInitialPlayerResponse = {"playabilityStatus":{"status":"OK"},"videoDetails":{"videoId":"livevid1111","lengthSeconds":"1200","isLiveContent":true},"microformat":{"playerMicroformatRenderer":{"liveBroadcastDetails":{"isLiveNow":true,"startTimestamp":"2026-11-08T00:00:00+00:00"}}}};';
    assert.equal(parseWatchPage(liveHtml, "livevid1111").isLive, true);

    const premiereHtml = 'var ytInitialPlayerResponse = {"playabilityStatus":{"status":"LIVE_STREAM_OFFLINE","reason":"This live event will begin in 3 hours."},"videoDetails":{"videoId":"premiere111","lengthSeconds":"0","isLiveContent":true}};';
    const premiere = parseWatchPage(premiereHtml, "premiere111");
    assert.equal(premiere.isPremiere, true);
    assert.equal(classifyVideoFacts(premiere).eligible, false);
  });

  it("parses an allow-listed playlist RSS feed and refuses any other feed", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
        <yt:playlistId>${HEART}</yt:playlistId>
        <yt:channelId>${OFFICIAL_CHANNEL_ID}</yt:channelId>
        <entry>
          <yt:videoId>4sePiZ18pug</yt:videoId>
          <title>Joseph &amp; the coat</title>
          <published>2026-10-30T14:00:30+00:00</published>
          <author><name>Seventh-day Adventist Church</name></author>
        </entry>
      </feed>`;
    const videos = parsePlaylistRss(xml, HEART);
    assert.equal(videos.length, 1);
    assert.equal(videos[0]?.title, "Joseph & the coat");
    assert.equal(videos[0]?.playlistId, HEART);
    assert.equal(videos[0]?.channelId, OFFICIAL_CHANNEL_ID);

    assert.throws(() => parsePlaylistRss(xml, "PLsomeotherplaylist000000000000"), /allow-list/);
    assert.throws(
      () => parsePlaylistRss(xml.replace(OFFICIAL_CHANNEL_ID, "UCsomeoneelse"), HEART),
      /official church channel/,
    );
  });
});
