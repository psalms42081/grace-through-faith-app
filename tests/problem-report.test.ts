import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { APP_CONTACT_EMAIL } from "../constants/app";
import { parseProblemReport, PROBLEM_REPORT_SCREENS } from "../lib/problem-report";

const root = process.cwd();

describe("problem report payload", () => {
  it("accepts a report and keeps a blank email empty", () => {
    const parsed = parseProblemReport({
      message: "  The verse sheet closed itself  ",
      screen: "Bible",
      device: "Mozilla/5.0",
      email: "  ",
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.value.message, "The verse sheet closed itself");
    assert.equal(parsed.value.screen, "Bible");
    assert.equal(parsed.value.device, "Mozilla/5.0");
    assert.equal(parsed.value.email, null);
  });

  it("requires what happened and a known screen", () => {
    assert.equal(parseProblemReport({ message: "   ", screen: "Home" }).ok, false);
    assert.equal(parseProblemReport({ message: "Broke", screen: "Kids" }).ok, false);
    const badEmail = parseProblemReport({
      message: "Broke",
      screen: "Other",
      email: "not-an-email",
    });
    assert.equal(badEmail.ok, false);
  });

  it("lists the adult tabs plus Other", () => {
    assert.deepEqual(PROBLEM_REPORT_SCREENS, [
      "Home",
      "Bible",
      "Devotions",
      "Discover",
      "Profile",
      "Other",
    ]);
  });
});

describe("problem report surfaces", () => {
  it("shows the report row and Beta chip only in adult Profile About", () => {
    const profile = readFileSync(path.join(root, "app", "(tabs)", "profile.tsx"), "utf8");
    const aboutAt = profile.indexOf('testID="profile-about-section"');
    const kidsGate = profile.lastIndexOf("{!isKidsMode && (", aboutAt);
    assert.ok(aboutAt > kidsGate && kidsGate >= 0);
    const about = profile.slice(aboutAt);
    assert.match(about, /Informed Ministries/);
    assert.match(about, /profile-beta-chip/);
    assert.match(about, />\s*Beta\s*</);
    assert.match(about, /<ReportProblem \/>/);
    const form = readFileSync(
      path.join(root, "components", "profile", "ReportProblem.tsx"),
      "utf8",
    );
    assert.match(form, /Report a problem/);
    assert.match(form, /What happened/);
    assert.match(form, /Which screen/);
    assert.match(form, /Device and browser/);
    assert.match(form, /Email \(optional\)/);
    assert.match(form, /isAuthenticated \? null/);
    assert.match(form, /Thanks — we read every one/);
    assert.match(form, /POST", "\/api\/feedback"/);
    assert.match(form, /navigator\.userAgent/);
  });

  it("stores problem reports in the feedback table and emails the contact address", () => {
    const migration = readFileSync(path.join(root, "migrations", "0019_feedback.sql"), "utf8");
    assert.match(migration, /CREATE TABLE IF NOT EXISTS "public"\."feedback"/);
    for (const column of ["user_id", "message", "screen", "device", "email", "created_at"]) {
      assert.match(migration, new RegExp(column));
    }
    assert.match(migration, /ON DELETE SET NULL/);
    const handler = readFileSync(path.join(root, "server", "routes", "problem-report.ts"), "utf8");
    assert.match(handler, /db\.insert\(feedback\)/);
    assert.match(handler, /sendFeedbackEmail/);
    const mail = readFileSync(path.join(root, "server", "services", "feedback-mail.ts"), "utf8");
    assert.match(mail, /to: APP_CONTACT_EMAIL/);
    assert.equal(APP_CONTACT_EMAIL, "joseph@gracethroughfaith.app");
    const route = readFileSync(path.join(root, "server", "routes.ts"), "utf8");
    assert.match(route, /handleProblemReport\(req, res\)/);
    assert.match(route, /app\.post\("\/api\/feedback"/);
  });
});
