/* Informed Ministries app-shell service worker.
 * Network-first + no-store for HTML so deploys are not sticky.
 * Cache-first only for hashed static assets (hashes change every build).
 * API responses are never cached.
 * __SW_BUILD_ID__ is replaced at export so each deploy is a new worker.
 */
const BUILD_ID = "__SW_BUILD_ID__";
const CACHE_NAME = "im-app-shell-" + BUILD_ID;
const HASHED_ASSET = /(?:[.-])[a-f0-9]{8,}\.(js|css|woff2?|ttf|otf|png|jpe?g|webp|svg)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
      const windows = await self.clients.matchAll({ type: "window" });
      for (const client of windows) {
        client.postMessage({ type: "SW_UPDATED", buildId: BUILD_ID });
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

async function fetchIndexDocument() {
  const indexRequest = new Request("/index.html", { cache: "no-store" });
  const fresh = await fetch(indexRequest);
  if (fresh.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put("/index.html", fresh.clone());
  }
  return fresh;
}

async function networkFirstDocument(request) {
  try {
    const fresh = await fetch(request, { cache: "no-store" });
    if (fresh.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put("/index.html", fresh.clone());
      return fresh;
    }
    // Static hosts 404 client routes; serve the app shell instead.
    if (fresh.status === 404) {
      return fetchIndexDocument();
    }
    return fresh;
  } catch {
    try {
      return await fetchIndexDocument();
    } catch {
      const cache = await caches.open(CACHE_NAME);
      return (
        (await cache.match("/index.html")) ||
        (await cache.match(request)) ||
        Response.error()
      );
    }
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) {
    await cache.put(request, fresh.clone());
  }
  return fresh;
}

async function networkFirstUnhashed(request) {
  try {
    const fresh = await fetch(request, { cache: "no-store" });
    if (fresh.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(request)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (isApiPath(url.pathname)) return;
  if (url.pathname === "/sw.js" || url.pathname === "/service-worker.js") return;
  if (url.pathname === "/manifest.json") return;

  const accept = request.headers.get("accept") || "";
  const isDocument =
    request.mode === "navigate" ||
    url.pathname === "/" ||
    url.pathname.endsWith(".html") ||
    accept.includes("text/html");

  if (isDocument) {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  if (HASHED_ASSET.test(url.pathname)) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  if (/\.(js|css)$/i.test(url.pathname)) {
    event.respondWith(networkFirstUnhashed(request));
  }
});
