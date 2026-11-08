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

async function precacheIndex() {
  const fresh = await fetch(new Request("/index.html", { cache: "no-store" }));
  if (!fresh.ok) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put("/index.html", fresh.clone());
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
      try {
        await precacheIndex();
      } catch {
        /* offline */
      }
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
  if (event.data && event.data.type === "GET_BUILD_ID" && event.source) {
    event.source.postMessage({ type: "SW_BUILD_ID", buildId: BUILD_ID });
  }
});

function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function documentRequest(request) {
  try {
    return new Request(request.url, {
      method: "GET",
      credentials: request.credentials,
      cache: "no-store",
      redirect: "follow",
    });
  } catch {
    return request;
  }
}

function noStoreResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Pragma", "no-cache");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function fetchIndexDocument() {
  const indexRequest = new Request("/index.html", { cache: "no-store" });
  const fresh = await fetch(indexRequest);
  if (fresh.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put("/index.html", fresh.clone());
  }
  return noStoreResponse(fresh);
}

async function networkFirstDocument(request) {
  try {
    const fresh = await fetch(documentRequest(request));
    if (fresh.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put("/index.html", fresh.clone());
      return noStoreResponse(fresh);
    }
    // Static hosts 404 client routes; serve the app shell instead.
    if (fresh.status === 404) {
      return fetchIndexDocument();
    }
    return noStoreResponse(fresh);
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

self.addEventListener("push", (event) => {
  const fallback = { title: "Informed Ministries", body: "", url: "/" };
  let payload = fallback;
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = {
        title: typeof parsed.title === "string" ? parsed.title : fallback.title,
        body: typeof parsed.body === "string" ? parsed.body : "",
        url: typeof parsed.url === "string" ? parsed.url : "/",
      };
    }
  } catch {
    payload = fallback;
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { url: payload.url },
      icon: "/assets/images/informed-ministries-icon.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const path = typeof raw === "string" && raw.startsWith("/") ? raw : "/";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if (typeof client.navigate === "function") {
            try {
              await client.navigate(target);
            } catch {
              client.postMessage({ type: "PUSH_OPEN", url: path });
            }
          } else {
            client.postMessage({ type: "PUSH_OPEN", url: path });
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

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
