import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapRssItem } from "../odb-map";
import {
  ODB_BACKOFF_INTERVAL_MS,
  ODB_CONTACT_EMAIL,
  ODB_FAILURES_BEFORE_BACKOFF,
  ODB_FEED_URL,
  ODB_JITTER_MS,
  ODB_REFRESH_INTERVAL_MS,
  ODB_USER_AGENT,
  addUtcDays,
  odbDayPageUrl,
  dateKeyFromOdbUrl,
  htmlIsOdbSpaShell,
  nextOdbRefreshDelayMs,
  odbWpDayUrl,
  parseOdbRss,
  pickNewestMissingOdbItem,
  withOdbJitter,
} from "../services/odb-refresh";

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>
<item><dc:creator>Kenneth Petersen</dc:creator><description><![CDATA[<p>Before our trip to Switzerland.</p>]]></description><title>The Ultimate Snapshot</title><pubDate>Wed, 02 Sep 2026 00:00:00 GMT</pubDate><guid isPermaLink="true">https://odb.org/2026/09/02/</guid><link>https://odb.org/2026/09/02/</link><image>https://www.odbm.org/globalassets/global/images/odbm20260902.jpg</image></item>
<item><dc:creator>Xochitl Dixon</dc:creator><description><![CDATA[<p>They devoted themselves.</p>]]></description><title>Gathering to Grow in Christ</title><pubDate>Tue, 01 Sep 2026 00:00:00 GMT</pubDate><link>https://odb.org/2026/09/01/</link></item>
<item><title>Christ in Me</title><link>https://odb.org/2026/08/31/christ-in-me/</link></item>
</channel></rss>`;

describe("ODB RSS parse and missing-day pick", () => {
  it("parses feed items with YYYY-MM-DD from the link", () => {
    const items = parseOdbRss(SAMPLE_RSS);
    assert.equal(items.length, 3);
    assert.equal(items[0]?.date, "2026-09-02");
    assert.equal(items[0]?.title, "The Ultimate Snapshot");
    assert.equal(items[0]?.author, "Kenneth Petersen");
    assert.match(items[0]?.descriptionHtml ?? "", /Switzerland/);
    assert.equal(
      items[0]?.imageUrl,
      "https://www.odbm.org/globalassets/global/images/odbm20260902.jpg",
    );
    assert.equal(items[1]?.date, "2026-09-01");
    assert.equal(items[2]?.date, "2026-08-31");
  });

  it("returns no items for a Cloudflare challenge body", () => {
    assert.deepEqual(
      parseOdbRss("<html>Just a moment... cf-browser-verification</html>"),
      [],
    );
  });

  it("picks the newest RSS date we do not already have", () => {
    const items = parseOdbRss(SAMPLE_RSS);
    const picked = pickNewestMissingOdbItem(
      items,
      ["2026-08-31", "2026-08-30"],
      "2026-09-03",
    );
    assert.equal(picked?.date, "2026-09-02");
    assert.equal(picked?.title, "The Ultimate Snapshot");
  });

  it("does not pick a future calendar day or a date already in odb_posts", () => {
    const items = parseOdbRss(SAMPLE_RSS);
    assert.equal(
      pickNewestMissingOdbItem(items, ["2026-08-31"], "2026-08-31")?.date,
      undefined,
    );
    const afterSep2 = pickNewestMissingOdbItem(
      items,
      ["2026-09-02", "2026-08-31"],
      "2026-09-03",
    );
    assert.equal(afterSep2?.date, "2026-09-01");
    assert.equal(
      pickNewestMissingOdbItem(
        items,
        ["2026-09-02", "2026-09-01", "2026-08-31"],
        "2026-09-03",
      ),
      null,
    );
  });

  it("maps an RSS item without inventing verse or insights text", () => {
    const [item] = parseOdbRss(SAMPLE_RSS);
    const row = mapRssItem(item!);
    assert.equal(row?.date, "2026-09-02");
    assert.equal(row?.title, "The Ultimate Snapshot");
    assert.equal(row?.author, "Kenneth Petersen");
    assert.equal(row?.bodyText, "Before our trip to Switzerland.");
    assert.equal(row?.verse, "");
    assert.equal(row?.thought, "");
    assert.equal(row?.insights, "");
    assert.equal(row?.sourceId, null);
  });
});

describe("ODB refresh URL and backoff", () => {
  it("uses the odb.org RSS feed as the listing URL", () => {
    assert.equal(ODB_FEED_URL, "https://odb.org/feed/");
    assert.match(ODB_USER_AGENT, /Informed Ministries/);
    assert.match(ODB_USER_AGENT, /gracethroughfaith\.app/);
    assert.match(ODB_USER_AGENT, new RegExp(ODB_CONTACT_EMAIL.replace(".", "\\.")));
  });

  it("builds a light per-day WP JSON URL from the RSS date", () => {
    assert.equal(dateKeyFromOdbUrl("https://odb.org/2026/09/02/"), "2026-09-02");
    assert.equal(addUtcDays("2026-09-01", 1), "2026-09-02");
    const url = odbWpDayUrl("2026-09-02");
    assert.match(url, /https:\/\/odb\.org\/wp-json\/wp\/v2\/posts/);
    assert.match(url, /after=2026-09-01T23:59:59/);
    assert.match(url, /before=2026-09-03T00:00:00/);
    assert.match(url, /per_page=3/);
    assert.equal(odbDayPageUrl("2026-09-02"), "https://odb.org/2026/09/02");
    assert.equal(
      htmlIsOdbSpaShell('<div id="loading-screen"></div><div id="root"></div>'),
      true,
    );
    assert.equal(htmlIsOdbSpaShell("<article>devotion</article>"), false);
  });

  it("stays on 30 minutes until two consecutive failures, then hourly", () => {
    assert.equal(ODB_FAILURES_BEFORE_BACKOFF, 2);
    assert.equal(nextOdbRefreshDelayMs(0), ODB_REFRESH_INTERVAL_MS);
    assert.equal(nextOdbRefreshDelayMs(1), ODB_REFRESH_INTERVAL_MS);
    assert.equal(nextOdbRefreshDelayMs(2), ODB_BACKOFF_INTERVAL_MS);
    assert.equal(nextOdbRefreshDelayMs(5), ODB_BACKOFF_INTERVAL_MS);
    assert.equal(ODB_REFRESH_INTERVAL_MS, 30 * 60 * 1000);
    assert.equal(ODB_BACKOFF_INTERVAL_MS, 60 * 60 * 1000);
  });

  it("adds small jitter without shrinking the base delay", () => {
    assert.equal(withOdbJitter(ODB_REFRESH_INTERVAL_MS, () => 0), ODB_REFRESH_INTERVAL_MS);
    assert.equal(
      withOdbJitter(ODB_REFRESH_INTERVAL_MS, () => 1),
      ODB_REFRESH_INTERVAL_MS + ODB_JITTER_MS,
    );
    const mid = withOdbJitter(ODB_REFRESH_INTERVAL_MS, () => 0.5);
    assert.equal(mid >= ODB_REFRESH_INTERVAL_MS, true);
    assert.equal(mid <= ODB_REFRESH_INTERVAL_MS + ODB_JITTER_MS, true);
  });
});
