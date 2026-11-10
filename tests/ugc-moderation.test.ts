import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseBlockedUserId, parseUgcReport, ugcMemberId } from "../lib/ugc-moderation";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("ugc report and block", () => {
  it("parses a report and rejects a missing reason", () => {
    const parsed = parseUgcReport({
      surface: "group-discussion",
      contentId: "post-1",
      targetUserId: "11111111-1111-4111-8111-111111111111",
      snapshot: "Hello group",
      reason: "Spam",
      comment: "  ",
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.comment, null);
      assert.equal(parsed.value.reason, "Spam");
    }
    assert.equal(parseUgcReport({ surface: "group-discussion", contentId: "post-1", snapshot: "Hi" }).ok, false);
    assert.equal(parseBlockedUserId({ blockedUserId: "member-1" }).ok, true);
    assert.equal(ugcMemberId("not-a-member"), null);
    assert.equal(ugcMemberId("11111111-1111-4111-8111-111111111111"), "11111111-1111-4111-8111-111111111111");
  });

  it("offers report and block on each member-visible surface", () => {
    const group = source("../app/group/[id].tsx");
    const prayers = source("../components/PrayerWall.tsx");
    const bibleGroup = source("../app/bible-group/[id].tsx");
    const stream = source("../app/stream/[id].tsx");
    const bibleLive = source("../app/bible-group-live/[id].tsx");
    const room = source("../server/templates/livekit-room.html");
    const bibleRoom = source("../server/templates/bible-group-live-room.js");
    const route = source("../server/routes/ugc.ts");
    for (const file of [group, prayers, bibleGroup, stream, bibleLive]) {
      assert.match(file, /ReportOrBlock/);
    }
    assert.match(group, /group-discussion/);
    assert.match(group, /group-reply/);
    assert.match(group, /group-prayer|PrayerWall/);
    assert.match(prayers, /group-prayer/);
    assert.match(group, /group-member/);
    assert.match(group, /group-live/);
    assert.match(bibleGroup, /bible-group-post/);
    assert.match(bibleGroup, /bible-group-member/);
    assert.match(bibleGroup, /bible-group-live/);
    assert.match(stream, /live-participant/);
    assert.match(bibleLive, /ugc_report/);
    assert.match(room, /ugc_report/);
    assert.match(bibleRoom, /ugc_report/);
    assert.match(route, /\/api\/ugc\/reports/);
    assert.match(route, /\/api\/ugc\/blocks/);
    assert.match(source("../server/routes/community.ts"), /withoutBlockedUsers/);
    assert.match(source("../server/routes/bible-groups.ts"), /withoutBlockedUsers/);
  });
});
