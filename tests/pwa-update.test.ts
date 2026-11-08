import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  entryScriptFromHtml,
  markReloaded,
  reloadStorageKey,
  shellNeedsReload,
  shouldReloadNow,
} from "../lib/pwa-update";

const OLD_HTML = `<script src="/_expo/static/js/web/entry-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.js" defer></script>`;
const NEW_HTML = `<script src="/_expo/static/js/web/entry-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.js" defer></script>`;

describe("PWA shell update", () => {
  it("reloads when the running entry script is not the one in fresh index.html", () => {
    assert.equal(entryScriptFromHtml(NEW_HTML), "/_expo/static/js/web/entry-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.js");
    assert.equal(shellNeedsReload("/_expo/static/js/web/entry-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.js", NEW_HTML), true);
    assert.equal(shellNeedsReload("/_expo/static/js/web/entry-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.js", NEW_HTML), false);
    assert.equal(shellNeedsReload(null, NEW_HTML), false);
  });

  it("keys the reload flag to the new build so a later deploy can reload again", () => {
    const store = new Map<string, string>();
    const getItem = (key: string) => store.get(key) ?? null;
    const setItem = (key: string, value: string) => {
      store.set(key, value);
    };
    assert.equal(shouldReloadNow(getItem, "build-a"), true);
    markReloaded(setItem, "build-a");
    assert.equal(shouldReloadNow(getItem, "build-a"), false);
    assert.equal(shouldReloadNow(getItem, "build-b"), true);
    assert.equal(reloadStorageKey("build-a"), "im-pwa-sw-reloaded:build-a");
  });

  it("checks for a new shell on open, focus, pageshow and visibility", () => {
    const source = readFileSync(new URL("../lib/register-web-service-worker.ts", import.meta.url), "utf8");
    assert.match(source, /ensureFreshShell/);
    assert.match(source, /fetch\("\/index.html", \{ cache: "no-store" \}\)/);
    assert.match(source, /updateViaCache: "none"/);
    assert.match(source, /window.addEventListener\("pageshow"/);
    assert.match(source, /window.addEventListener\("focus"/);
    assert.match(source, /visibilitychange/);
    assert.match(source, /postMessage\(\{ type: "SKIP_WAITING" \}\)/);
    assert.doesNotMatch(source, /const RELOAD_FLAG = "im-pwa-sw-reloaded"/);
    assert.match(source, /DOMContentLoaded/);
  });

  it("new service worker skips waiting, claims clients and precaches index.html", () => {
    const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
    const server = readFileSync(new URL("../server/index.ts", import.meta.url), "utf8");
    const copy = readFileSync(new URL("../scripts/copy-web-pwa-assets.mjs", import.meta.url), "utf8");
    assert.match(sw, /self\.skipWaiting\(\)/);
    assert.match(sw, /self\.clients\.claim\(\)/);
    assert.match(sw, /SW_UPDATED/);
    assert.match(sw, /precacheIndex/);
    assert.match(sw, /cache: "no-store"/);
    assert.match(sw, /function documentRequest/);
    assert.match(sw, /function noStoreResponse/);
    assert.match(sw, /GET_BUILD_ID/);
    assert.match(server, /\.update\(swSource\)/);
    assert.match(server, /path\.sep\}sw\.js/);
    assert.match(server, /\[\.-\]\)\[a-f0-9\]\{8,\}/);
    assert.match(copy, /\.update\(swSource\)/);
  });

  it("stamps a new BUILD_ID when either index.html or sw.js changes", () => {
    const stamp = (index: string, sw: string) =>
      createHash("sha256").update(index).update(sw).digest("hex").slice(0, 12);
    assert.notEqual(stamp(OLD_HTML, "sw-a"), stamp(NEW_HTML, "sw-a"));
    assert.notEqual(stamp(OLD_HTML, "sw-a"), stamp(OLD_HTML, "sw-b"));
  });
});
