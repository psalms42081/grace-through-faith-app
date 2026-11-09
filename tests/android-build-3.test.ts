import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("status bar clearance", () => {
  it("keeps the Bible heading below the status bar while the list scrolls", () => {
    const books = read("../app/book-picker.tsx");
    assert.match(books, /paddingTop: insets\.top \+ 12/);
    assert.match(books, /styles\.stickyHeader/);
  });

  it("pins the top inset outside the scroll on Home, Discover, and Profile", () => {
    for (const path of ["../app/(tabs)/home-v2.tsx", "../app/discover-v2.tsx", "../app/(tabs)/profile.tsx"]) {
      const source = read(path);
      assert.match(source, /pinnedTop = Platform\.OS === "web" \? 0 : insets\.top/);
      assert.match(source, /paddingTop: pinnedTop/);
    }
  });

  it("keeps the reader and chapter list on the stack header, which already includes the top inset", () => {
    const stack = read("../app/(tabs)/read/_layout.tsx");
    assert.match(stack, /name="\[bookId\]\/index" options=\{\{ headerShown: true \}\}/);
    assert.match(stack, /name="\[bookId\]\/\[chapter]"/);
    assert.match(stack, /headerShown: true/);
    assert.doesNotMatch(read("../app/read/[bookId]/[chapter].tsx"), /headerStatusBarHeight:\s*0/);
    assert.doesNotMatch(read("../app/read/[bookId]/index.tsx"), /headerStatusBarHeight:\s*0/);
  });
});

describe("notification permission timing", () => {
  it("does not ask for notifications from a restored session or the push token helper", () => {
    const auth = read("../contexts/AuthContext.tsx");
    const notifications = read("../lib/notifications.ts");
    const register = notifications.slice(
      notifications.indexOf("export async function registerPushToken"),
      notifications.indexOf("console.warn(\"[push] registerPushToken failed"),
    );
    assert.match(auth, /registerPushToken\(token, getApiUrl\(\)\)/);
    assert.doesNotMatch(register, /requestPermissionsAsync/);
    assert.doesNotMatch(read("../app/(auth)/login.tsx"), /requestPermissionsAsync/);
  });

  it("explains first, after sign-in and when a reminder is turned on", () => {
    const consent = read("../lib/notification-consent.ts");
    const login = read("../app/(auth)/login.tsx");
    const register = read("../app/(auth)/register.tsx");
    const settings = read("../components/profile/NotificationSettings.tsx");
    assert.match(consent, /confirmWebSafe/);
    assert.match(consent, /requestNotificationPermission/);
    assert.match(login, /offerNotificationsAfterFirstSignIn\(\)/);
    assert.match(register, /offerNotificationsAfterFirstSignIn\(\)/);
    assert.match(settings, /explainAndRequestNotificationPermission\(\)/);
    const native = read("../lib/push-subscribe.ts");
    const acquire = native.slice(native.indexOf("async function acquireNativeEndpoint"), native.indexOf("export async function existingPushEndpoint"));
    assert.doesNotMatch(acquire, /requestPermissionsAsync/);
  });
});
