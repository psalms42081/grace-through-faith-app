import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { after, describe, it } from "node:test";
import express from "express";
import { odbDateKeyFromTimeZone } from "../odb-select";
import type { OdbPostJson } from "../odb-map";
import { createOdbRouter } from "../routes/odb";
import type { OdbStore } from "../odb-store";

const repoRoot = path.resolve(process.cwd());

function samplePost(overrides: Partial<OdbPostJson> = {}): OdbPostJson {
  return {
    id: 42,
    title: "Christ in Me",
    date: "2026-08-31",
    author: "ODB",
    verse: "Galatians 2:20",
    verseRef: "Galatians 2:20",
    passage: "Galatians 2:20",
    content: "Body",
    thought: "Think",
    response: "Pray",
    insights: "Insight",
    insightsAuthor: "Editor",
    bibleInAYear: "Psalm 1",
    url: "https://odb.org/2026/08/31/christ-in-me",
    imageUrl: null,
    ...overrides,
  };
}

type RunningServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

async function startServer(store: OdbStore): Promise<RunningServer> {
  const app = express();
  app.use(createOdbRouter(store));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function memoryStore(posts: OdbPostJson[]): OdbStore {
  return {
    async findLatestOnOrBefore(dateKey) {
      const eligible = posts
        .filter((p) => p.date <= dateKey)
        .sort((a, b) => b.date.localeCompare(a.date));
      return eligible[0] ?? null;
    },
    async findRecentOnOrBefore(dateKey, count) {
      return posts
        .filter((p) => p.date <= dateKey)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, count);
    },
    async findBySourceId(id) {
      return posts.find((p) => p.id === id) ?? null;
    },
  };
}

describe("ODB routes read only from odb_posts", () => {
  const servers: RunningServer[] = [];

  after(async () => {
    await Promise.all(servers.map((s) => s.close()));
  });

  it("returns 503 when the table is empty", async () => {
    const server = await startServer(memoryStore([]));
    servers.push(server);
    const today = await fetch(`${server.baseUrl}/api/odb/today?timeZone=Australia/Melbourne`);
    const todayBody = await today.json();
    assert.equal(today.status, 503);
    assert.equal(todayBody.error, "Devotional not available yet");

    const recent = await fetch(`${server.baseUrl}/api/odb/recent?timeZone=Australia/Melbourne`);
    const recentBody = await recent.json();
    assert.equal(recent.status, 503);
    assert.equal(recentBody.error, "Devotional not available yet");
  });

  it("serves today as the newest row on or before the request calendar day", async () => {
    let seenDateKey = "";
    const post = samplePost({ date: "2026-08-31", title: "Christ in Me", id: 2 });
    const store: OdbStore = {
      async findLatestOnOrBefore(dateKey) {
        seenDateKey = dateKey;
        return dateKey >= post.date ? post : null;
      },
      async findRecentOnOrBefore() {
        return [];
      },
      async findBySourceId() {
        return null;
      },
    };
    const server = await startServer(store);
    servers.push(server);

    const melbourne = await fetch(`${server.baseUrl}/api/odb/today`);
    const melbourneBody = await melbourne.json();
    assert.equal(melbourne.status, 200);
    assert.equal(seenDateKey, odbDateKeyFromTimeZone(undefined));
    assert.equal(melbourneBody.title, "Christ in Me");
    assert.equal(melbourneBody.content, "Body");
    assert.equal(melbourneBody.verseRef, "Galatians 2:20");

    const utc = await fetch(`${server.baseUrl}/api/odb/today?timeZone=UTC`);
    assert.equal(utc.status, 200);
    assert.equal(seenDateKey, odbDateKeyFromTimeZone("UTC"));
  });

  it("serves recent as the newest seven rows without fetching odb.org", async () => {
    const posts = Array.from({ length: 10 }, (_, i) =>
      samplePost({
        id: i + 1,
        date: `2020-01-${String(i + 1).padStart(2, "0")}`,
        title: `Day ${i}`,
      }),
    );
    const server = await startServer(memoryStore(posts));
    servers.push(server);
    const res = await fetch(`${server.baseUrl}/api/odb/recent?count=7&timeZone=UTC`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.length, 7);
    assert.equal(body[0].date >= body[6].date, true);
  });

  it("does not fetch odb.org or use a request-path timeout", () => {
    const routes = readFileSync(path.join(repoRoot, "server/routes/odb.ts"), "utf8");
    assert.doesNotMatch(routes, /odb\.org/);
    assert.doesNotMatch(routes, /AbortController/);
    assert.doesNotMatch(routes, /status\(502\)/);
    assert.match(routes, /Devotional not available yet/);
    assert.match(routes, /status\(503\)/);

    const refresh = readFileSync(
      path.join(repoRoot, "server/services/odb-refresh.ts"),
      "utf8",
    );
    assert.match(refresh, /https:\/\/odb\.org\/wp-json\/wp\/v2\/posts/);
    assert.match(refresh, /ODB_FETCH_TIMEOUT_MS = 20_000/);
    assert.match(refresh, /ODB_BACKFILL_DAYS = 14/);
    assert.match(refresh, /User-Agent/);
    assert.match(refresh, /initOdbRefresh/);
  });
});
