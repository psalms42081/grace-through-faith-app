import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { APP_CONTACT_EMAIL } from "../constants/app";

describe("Google Play first-build prep", () => {
  it("sets Android package identity, versionCode, light UI, and no google-services file", () => {
    const app = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8"));
    assert.equal(app.expo.name, "Informed Ministries");
    assert.equal(app.expo.android.package, "com.informedministries.app");
    assert.equal(app.expo.android.versionCode, 1);
    assert.equal(app.expo.userInterfaceStyle, "light");
    assert.equal(app.expo.scheme, "informedministries");
    assert.equal(app.expo.android.googleServicesFile, undefined);
    assert.equal(app.expo.extra.eas.projectId, "d9393f6d-a589-44e4-8359-04953488bb01");
  });

  it("defines EAS production app-bundle and preview apk with the public domain", () => {
    const eas = JSON.parse(readFileSync(new URL("../eas.json", import.meta.url), "utf8"));
    assert.equal(eas.cli.appVersionSource, "remote");
    assert.equal(eas.build.production.autoIncrement, true);
    assert.equal(eas.build.production.android.buildType, "app-bundle");
    assert.equal(eas.build.preview.android.buildType, "apk");
    assert.equal(eas.build.production.env.EXPO_PUBLIC_DOMAIN, "informedministries.app");
    assert.equal(eas.build.preview.env.EXPO_PUBLIC_DOMAIN, "informedministries.app");
  });

  it("uses hello@informedministries.app as the contact default", () => {
    assert.equal(APP_CONTACT_EMAIL, "hello@informedministries.app");
  });

  it("deletes owned rows before the user on POST /api/auth/delete-account", () => {
    const auth = readFileSync(new URL("../server/routes/auth.ts", import.meta.url), "utf8");
    const deleter = readFileSync(
      new URL("../server/services/delete-user-account.ts", import.meta.url),
      "utf8",
    );
    assert.match(auth, /deleteUserAccount\(req\.authUserId!\)/);
    assert.match(deleter, /userNotes/);
    assert.match(deleter, /userHighlights/);
    assert.match(deleter, /userBookmarks/);
    assert.match(deleter, /userPlanProgress/);
    assert.match(deleter, /db\.delete\(users\)/);
  });
});
