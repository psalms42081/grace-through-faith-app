/* Informed Ministries app-shell service worker.
 * Network-first for HTML so deploys are not sticky.
 * Cache-first only for hashed static assets.
 * Do not use StaleWhileRevalidate for documents.
 */
const CACHE_NAME = "im-app-shell-v1";
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
    })(),
  );
});

async function networkFirstDocument(request) {
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put("/index.html", fresh.clone());
    }
    return fresh;
  } catch {
    const cache = await caches.open(CACHE_NAME);
    return (
      (await cache.match("/index.html")) ||
      (await cache.match(request)) ||
      Response.error()
    );
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
  if (url.pathname.startsWith("/api/")) return;
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
  }
});
