import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { getHomeLocalDay, getTodaysVerse } from "../components/home-v2/home-data";
import {
  NOTIFICATIONS_BLOCKED_MESSAGE,
  dailyVerseNotification,
  dayIndexForDateKey,
  duePushKinds,
  fallsInCurrentWindow,
  firstVerseLine,
  isGonePushStatus,
  readRegisteredPushToken,
  sabbathSchoolNotification,
  verseReferenceForLocalDate,
} from "../lib/daily-verse-push";

const root = process.cwd();

describe("daily verse push schedule", () => {
  const base = {
    timezone: "UTC",
    verseTimeLocal: "07:00",
    ssReminder: false,
    lastVerseLocalDate: null,
    lastSsLocalDate: null,
  };

  it("sends when the chosen time falls in the current 15-minute window", () => {
    assert.equal(fallsInCurrentWindow(7 * 60 + 7, "07:00"), true);
    assert.equal(fallsInCurrentWindow(7 * 60 + 16, "07:00"), false);
    const due = duePushKinds(base, new Date("2026-09-23T07:07:00Z"));
    assert.deepEqual(due, ["verse"]);
  });

  it("does not send the same local day twice", () => {
    const due = duePushKinds(
      { ...base, lastVerseLocalDate: "2026-09-23" },
      new Date("2026-09-23T07:07:00Z"),
    );
    assert.deepEqual(due, []);
  });

  it("sends the Sabbath School reminder on Friday at 6:00 pm local", () => {
    const due = duePushKinds(
      { ...base, verseTimeLocal: "07:00", ssReminder: true },
      new Date("2026-09-25T18:05:00Z"),
    );
    assert.deepEqual(due, ["sabbath"]);
  });

  it("uses the same verse the Home hero shows that day", () => {
    const now = new Date(2026, 8, 23, 15, 0, 0);
    const dateKey = "2026-09-23";
    assert.equal(dayIndexForDateKey(dateKey), getHomeLocalDay(now).dayIndex);
    assert.equal(
      verseReferenceForLocalDate(dateKey),
      getTodaysVerse(getHomeLocalDay(now).dayIndex).reference,
    );
  });

  it("formats the verse notification and the Sabbath School body", () => {
    const verse = dailyVerseNotification(
      "Isaiah 41:13",
      "For I the LORD thy God will hold thy right hand,\nsaying unto thee, Fear not.",
      "/scripture?bookId=23&chapter=41&verse=13",
    );
    assert.equal(verse.title, "Verse of the Day · Isaiah 41:13 KJV");
    assert.equal(verse.body, "For I the LORD thy God will hold thy right hand,");
    assert.equal(verse.url, "/scripture?bookId=23&chapter=41&verse=13");
    assert.equal(firstVerseLine("For God so loved the world."), "For God so loved the world.");
    assert.equal(sabbathSchoolNotification(7).body, "Lesson 7 is ready for Sabbath");
  });

  it("accepts pushToken and the older token field", () => {
    assert.equal(readRegisteredPushToken({ pushToken: "ExponentPushToken[abc]" }), "ExponentPushToken[abc]");
    assert.equal(readRegisteredPushToken({ token: "ExponentPushToken[abc]" }), "ExponentPushToken[abc]");
    assert.equal(readRegisteredPushToken({ pushToken: " new ", token: "old" }), "new");
    assert.equal(readRegisteredPushToken({}), "");
  });

  it("retires endpoints the push service reports as gone", () => {
    assert.equal(isGonePushStatus(410), true);
    assert.equal(isGonePushStatus(404), true);
    assert.equal(isGonePushStatus(500), false);
  });
});

describe("daily verse push wiring", () => {
  it("registers native tokens with pushToken", () => {
    const source = readFileSync(path.join(root, "lib", "notifications.ts"), "utf8");
    assert.match(source, /JSON\.stringify\(\{ pushToken, platform: Platform\.OS \}\)/);
    assert.doesNotMatch(source, /token: pushToken/);
  });

  it("handles push and notificationclick in the service worker", () => {
    const source = readFileSync(path.join(root, "public", "sw.js"), "utf8");
    assert.match(source, /addEventListener\("push"/);
    assert.match(source, /addEventListener\("notificationclick"/);
    assert.match(source, /openWindow/);
  });

  it("hides notification settings in kids mode and states the blocked message", () => {
    const profile = readFileSync(path.join(root, "app", "(tabs)", "profile.tsx"), "utf8");
    const settings = readFileSync(
      path.join(root, "components", "profile", "NotificationSettings.tsx"),
      "utf8",
    );
    assert.match(profile, /isAuthenticated && !isKidsMode \? <NotificationSettings \/> : null/);
    const subscribe = readFileSync(path.join(root, "lib", "push-subscribe.ts"), "utf8");
    assert.match(settings, /NOTIFICATIONS_BLOCKED_MESSAGE/);
    assert.equal(
      NOTIFICATIONS_BLOCKED_MESSAGE,
      "Notifications are blocked for this site — enable them in your browser settings",
    );
    assert.match(subscribe, /Notification\.requestPermission/);
    assert.doesNotMatch(settings, /Notification\.requestPermission/);
    assert.match(settings, /acquirePushEndpoint\(\)/);
  });

  it("records notification subscriptions in the privacy policy", () => {
    const policy = readFileSync(
      path.join(root, "docs", "legal", "informed-ministries-privacy-policy.md"),
      "utf8",
    );
    assert.match(policy, /push endpoint/);
    assert.match(policy, /time you chose/);
    assert.match(policy, /time zone/);
    assert.match(policy, /deleted when you turn the reminder off/);
    assert.match(policy, /deleted with your account/);
  });

  it("stores the subscription columns the scheduler needs", () => {
    const sql = readFileSync(
      path.join(root, "migrations", "0017_push_subscription.sql"),
      "utf8",
    );
    for (const column of [
      "user_id",
      "endpoint",
      "keys",
      "timezone",
      "verse_time_local",
      "ss_reminder",
      "created_at",
      "last_verse_local_date",
      "last_ss_local_date",
    ]) {
      assert.match(sql, new RegExp(column));
    }
    assert.match(sql, /ON DELETE CASCADE/);
  });
});
