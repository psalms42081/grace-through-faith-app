import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const repoRoot = path.resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

describe("migration 0010 bible small group live session", () => {
  it("is the numbered 0010 file with a partial unique active session index", () => {
    const migrationsDir = path.join(repoRoot, "migrations");
    const files0010 = readdirSync(migrationsDir).filter((f) => f.startsWith("0010_"));
    assert.deepEqual(files0010, ["0010_bible_small_group_live_session.sql"]);
    assert.equal(
      existsSync(path.join(migrationsDir, "0010_bible_small_group_live_session.sql")),
      true,
    );
    const sql = read("migrations/0010_bible_small_group_live_session.sql");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS "public"\."bible_small_group_live_session"/);
    assert.match(sql, /last_heartbeat_at/);
    assert.match(sql, /bible_small_group_live_session_active_group_uniq/);
    assert.match(sql, /WHERE "ended_at" IS NULL/);
    assert.doesNotMatch(sql, /prayer_groups/);
  });
});

describe("bible group live API paths", () => {
  it("uses /api/bible-groups/:id/live and does not collide with prayer_groups /api/groups/:id", () => {
    const routes = read("server/routes/bible-groups.ts");
    assert.match(routes, /\/api\/bible-groups\/:id\/live\/start/);
    assert.match(routes, /\/api\/bible-groups\/:id\/live\/end/);
    assert.match(routes, /\/api\/bible-groups\/:id\/live\/token/);
    assert.match(routes, /\/api\/bible-groups\/:id\/live\/heartbeat/);
    assert.match(routes, /\/api\/bible-groups\/:id\/live"/);
    assert.match(routes, /\/api\/bible-groups\/:id\/room/);
    assert.doesNotMatch(routes, /\/api\/groups\/:id\/live/);
    assert.match(routes, /Live rooms are not configured/);
    assert.match(routes, /isLiveKitConfigured/);
    assert.match(routes, /identity: userId/);
    const community = read("server/routes/community.ts");
    assert.doesNotMatch(community, /bible_small_group_live_session/);
    assert.doesNotMatch(community, /\/api\/bible-groups\/:id\/live/);
  });
});

describe("live room client", () => {
  it("registers a Path B room screen without gold or react-native LiveKit", () => {
    const layout = read("app/_layout.tsx");
    assert.match(layout, /bible-group-live\/\[id\]/);
    const tabs = read("app/(tabs)/_layout.tsx");
    assert.doesNotMatch(tabs, /bible-group-live/);
    const room = read("app/bible-group-live/[id].tsx");
    assert.doesNotMatch(room, /#C9933A/);
    assert.match(room, /isKidsMode/);
    assert.match(room, /livekit-client/);
    const pkg = read("package.json");
    assert.doesNotMatch(pkg, /@livekit\/react-native/);
    const html = read("server/templates/bible-group-live-room.html");
    assert.match(html, /\/api\/streams\/livekit-client\.umd\.js/);
    assert.doesNotMatch(html, /livekit-room\.html/);
  });
});
