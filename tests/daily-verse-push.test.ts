import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { getHomeLocalDay, getTodaysVerse } from "../components/home-v2/home-data";
import {
  NOTIFICATIONS_BLOCKED_MESSAGE,
  ANDROID_CHROME_BATTERY_TIP,
  WEB_PUSH_TTL_SECONDS,
  WEB_PUSH_URGENCY,
  dailyVerseNotification,
  dayIndexForDateKey,
  duePushKinds,
  fallsInCurrentWindow,
  firstVerseLine,
  isAndroidChrome,
  isGonePushStatus,
  readRegisteredPushToken,
  normalizePrayerTimes,
  prayerTimeNotification,
  readingPlanNotification,
  sabbathSchoolNotification,
  formatVerseTimeLabel,
  normalizeHm,
  verseReferenceForLocalDate,
  webPushSendOptions,
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

  it("sends a reading plan reminder in the daily verse window", () => {
    const due = duePushKinds(
      { ...base, planReminder: true },
      new Date("2026-09-23T07:07:00Z"),
    );
    assert.deepEqual(due, ["verse", "plan"]);
    const note = readingPlanNotification(2, "The Life of Christ", "plan-1");
    assert.equal(note.title, "Reading plan");
    assert.equal(note.body, "Day 2 of The Life of Christ is ready");
    assert.equal(note.url, "/devotional-day-preview?planId=plan-1");
    const again = duePushKinds(
      { ...base, planReminder: true, lastPlanLocalDate: "2026-09-23" },
      new Date("2026-09-23T07:07:00Z"),
    );
    assert.deepEqual(again, ["verse"]);
  });

  it("sends each prayer time once, and stays off when none are set", () => {
    assert.deepEqual(normalizePrayerTimes(undefined), []);
    assert.equal(normalizePrayerTimes(["07:00", "07:00"]), null);
    assert.equal(normalizePrayerTimes(["07:00", "12:00", "18:00", "21:00"]), null);
    const quiet = duePushKinds(base, new Date("2026-09-23T07:07:00Z"));
    assert.deepEqual(quiet, ["verse"]);
    const morning = duePushKinds(
      { ...base, verseTimeLocal: null, prayerTimes: ["07:00", "12:00", "18:00"] },
      new Date("2026-09-23T07:07:00Z"),
    );
    assert.deepEqual(morning, ["prayer:07:00"]);
    const midday = duePushKinds(
      {
        ...base,
        verseTimeLocal: null,
        prayerTimes: ["07:00", "12:00"],
        lastPrayerSent: { "07:00": "2026-09-23" },
      },
      new Date("2026-09-23T12:05:00Z"),
    );
    assert.deepEqual(midday, ["prayer:12:00"]);
    const note = prayerTimeNotification("Psalm 23:1");
    assert.equal(note.title, "A time to pray");
    assert.equal(note.body, "Psalm 23:1");
    assert.equal(note.url, "/prayer-journal");
  });

  it("sends web push as high urgency with a six-hour TTL", () => {
    assert.equal(WEB_PUSH_URGENCY, "high");
    assert.equal(WEB_PUSH_TTL_SECONDS, 6 * 60 * 60);
    assert.deepEqual(webPushSendOptions(), { urgency: "high", TTL: 21600 });
    const source = readFileSync(path.join(root, "server", "services", "daily-verse-push.ts"), "utf8");
    assert.match(source, /webPushSendOptions\(\)/);
    assert.equal(
      ANDROID_CHROME_BATTERY_TIP,
      "If notifications arrive late, turn off battery optimisation for Chrome in Android settings.",
    );
    assert.equal(
      isAndroidChrome(
        "Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      ),
      true,
    );
    assert.equal(isAndroidChrome("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0 Safari/537.36"), false);
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

  it("lets either reminder use any time of day in the device hour cycle", () => {
    assert.equal(normalizeHm("18:30"), "18:30");
    assert.equal(normalizeHm("00:00"), "00:00");
    assert.equal(normalizeHm("23:59"), "23:59");
    assert.match(formatVerseTimeLabel("18:30", "en-US"), /6:30/);
    assert.match(formatVerseTimeLabel("18:30", "en-US"), /PM/i);
    assert.match(formatVerseTimeLabel("18:30", "en-GB"), /18:30/);
    const settings = readFileSync(
      path.join(root, "components", "profile", "NotificationSettings.tsx"),
      "utf8",
    );
    const web = readFileSync(
      path.join(root, "components", "profile", "ReminderTimeField.web.tsx"),
      "utf8",
    );
    const native = readFileSync(
      path.join(root, "components", "profile", "ReminderTimeField.tsx"),
      "utf8",
    );
    assert.doesNotMatch(settings, /−1 hour|\+15 min|profile-verse-hour/);
    assert.match(settings, /testID="profile-daily-verse-time"/);
    assert.match(settings, /testID="profile-ss-reminder-time"/);
    assert.match(settings, /Reading plan/);
    assert.match(settings, /testID="profile-plan-reminder-switch"/);
    assert.match(settings, /Times of prayer/);
    assert.match(settings, /testID="profile-prayer-times-switch"/);
    assert.match(settings, /testID=\{`profile-prayer-time-\$\{index\}`\}/);
    assert.match(settings, /anyNotificationOn/);
    assert.match(settings, /ANDROID_CHROME_BATTERY_TIP/);
    assert.match(web, /type: "time"/);
    assert.match(native, /@react-native-community\/datetimepicker/);
    assert.match(native, /mode="time"/);
    assert.doesNotMatch(native, /is24Hour/);
  });

  it("shows notification settings for a signed-in member and states the blocked message", () => {
    const profile = readFileSync(path.join(root, "app", "(tabs)", "profile.tsx"), "utf8");
    const settings = readFileSync(
      path.join(root, "components", "profile", "NotificationSettings.tsx"),
      "utf8",
    );
    assert.match(profile, /isAuthenticated \? <NotificationSettings \/> : null/);
    assert.doesNotMatch(profile, /isKidsMode/);
    const subscribe = readFileSync(path.join(root, "lib", "push-subscribe.ts"), "utf8");
    assert.match(settings, /NOTIFICATIONS_BLOCKED_MESSAGE/);
    assert.equal(
      NOTIFICATIONS_BLOCKED_MESSAGE,
      "Notifications are blocked for this site — enable them in your browser settings",
    );
    assert.match(subscribe, /Notification\.requestPermission/);
    assert.doesNotMatch(settings, /Notification\.requestPermission/);
    assert.match(settings, /acquirePushEndpoint\(\)/);
    assert.match(settings, /isFetchedAfterMount/);
    assert.match(settings, /refetchOnMount: "always"/);
    const enableVerse = settings.slice(
      settings.indexOf("function onVerseChange"),
      settings.indexOf("function onSabbathChange"),
    );
    assert.match(enableVerse, /startWebNotificationPermission\(\)/);
    assert.doesNotMatch(enableVerse, /await/);
    const save = settings.slice(settings.indexOf("async function save"), settings.indexOf("async function commit"));
    assert.match(save, /"DELETE", "\/api\/push\/subscription"/);
    assert.match(save, /next\.turningOn/);
  });

  it("records notification subscriptions in the privacy policy", () => {
    const policy = readFileSync(
      path.join(root, "docs", "legal", "informed-ministries-privacy-policy.md"),
      "utf8",
    );
    assert.match(policy, /push endpoint/);
    assert.match(policy, /time you chose/);
    assert.match(policy, /Times of prayer/);
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
