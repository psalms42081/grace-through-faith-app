import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  activeLiveSessionOrNull,
  LIVE_HEARTBEAT_STALE_MS,
} from "../server/services/bible-group-live-session";

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
    assert.match(routes, /isNull\(bibleSmallGroupLiveSessions\.endedAt\)/);
    assert.doesNotMatch(routes, /isNotNull\(bibleSmallGroupLiveSessions\.endedAt\)/);
    assert.match(
      routes,
      /res\.json\(\{ session: session \? publicLiveSession\(session\) : null \}\)/,
    );
    assert.match(routes, /isLiveSessionStale/);
    assert.match(routes, /endLiveSessionRow\(row\)/);
    const community = read("server/routes/community.ts");
    assert.doesNotMatch(community, /bible_small_group_live_session/);
    assert.doesNotMatch(community, /\/api\/bible-groups\/:id\/live/);
  });
});

describe("GET /api/bible-groups/:id/live active session policy", () => {
  const now = Date.parse("2026-09-01T10:00:00.000Z");

  it("returns null when there is no session", () => {
    assert.equal(activeLiveSessionOrNull(null, now), null);
    assert.equal(activeLiveSessionOrNull(undefined, now), null);
  });

  it("returns an open session with NULL heartbeat if started_at is 1 minute ago", () => {
    const startedAt = new Date(now - 60_000);
    const row = {
      endedAt: null,
      lastHeartbeatAt: null,
      startedAt,
      id: "open-null-heartbeat",
    };
    assert.equal(activeLiveSessionOrNull(row, now), row);
  });

  it("treats an open session with last heartbeat 6 minutes ago as stale (auto-end → null)", () => {
    assert.ok(LIVE_HEARTBEAT_STALE_MS === 5 * 60 * 1000);
    const startedAt = new Date(now - 10 * 60 * 1000);
    const lastHeartbeatAt = new Date(now - 6 * 60 * 1000);
    const row = {
      endedAt: null,
      lastHeartbeatAt,
      startedAt,
      id: "stale-heartbeat",
    };
    assert.equal(activeLiveSessionOrNull(row, now), null);
  });

  it("returns null for an already ended session", () => {
    const startedAt = new Date(now - 60_000);
    const row = {
      endedAt: new Date(now - 10_000),
      lastHeartbeatAt: new Date(now - 20_000),
      startedAt,
      id: "ended",
    };
    assert.equal(activeLiveSessionOrNull(row, now), null);
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

  it("joins only on a non-null open session and polls live on focus plus 15s", () => {
    const screen = read("app/bible-group/[id].tsx");
    assert.match(screen, /liveSession != null && liveSession\.endedAt == null/);
    assert.match(screen, /function openLiveSession/);
    assert.match(screen, /session\.endedAt != null/);
    assert.match(screen, /refetchInterval: 15_000/);
    assert.match(screen, /refetchOnWindowFocus: true/);
    assert.match(screen, /refetchOnMount: "always"/);
    assert.match(screen, /useFocusEffect/);
    assert.match(screen, /void refetchLive\(\)/);
    assert.match(screen, /\/live\/heartbeat/);
    assert.match(
      screen,
      /qc\.invalidateQueries\(\{ queryKey: \["\/api\/bible-groups", id, "live"\] \}\)/,
    );
    assert.match(screen, /Platform\.OS === "web"/);
    assert.match(screen, /Remove \$\{member\.displayName\} from this group\?/);
  });
});
