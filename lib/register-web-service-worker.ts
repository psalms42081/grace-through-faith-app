/** Web-only: register the app-shell service worker at /sw.js. */
import {
  entryScriptFromHtml,
  markReloaded,
  shellNeedsReload,
  shouldReloadNow,
} from "@/lib/pwa-update";

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function reloadOnce(token: string): void {
  const store = sessionStore();
  if (store && !shouldReloadNow((key) => store.getItem(key), token)) return;
  try {
    if (store) markReloaded((key, value) => store.setItem(key, value), token);
  } catch {
    /* still reload if storage is unavailable */
  }
  window.location.reload();
}

function pageEntryScript(): string | null {
  const el = document.querySelector('script[src*="_expo/static/js/web/entry-"]');
  return el?.getAttribute("src") ?? null;
}

async function ensureFreshShell(): Promise<void> {
  try {
    const res = await fetch("/index.html", { cache: "no-store" });
    if (!res.ok) return;
    const html = await res.text();
    if (!shellNeedsReload(pageEntryScript(), html)) return;
    const token = entryScriptFromHtml(html) || "html";
    reloadOnce(token);
  } catch {
    /* offline */
  }
}

function watchForWaitingWorker(registration: ServiceWorkerRegistration): void {
  const askToSkip = (worker: ServiceWorker | null) => {
    worker?.postMessage({ type: "SKIP_WAITING" });
  };

  if (registration.waiting) {
    askToSkip(registration.waiting);
  }

  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener("statechange", () => {
      if (installing.state === "installed") {
        askToSkip(installing);
      }
    });
  });
}

async function checkForUpdates(registration: ServiceWorkerRegistration): Promise<void> {
  try {
    await registration.update();
  } catch {
    /* offline or unsupported */
  }
}

function onAppVisible(registration: ServiceWorkerRegistration): void {
  void checkForUpdates(registration);
  void ensureFreshShell();
}

export function registerWebServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    reloadOnce("controller");
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SW_UPDATED") {
      reloadOnce(typeof event.data.buildId === "string" ? event.data.buildId : "sw");
    }
    if (
      event.data &&
      event.data.type === "PUSH_OPEN" &&
      typeof event.data.url === "string" &&
      event.data.url.startsWith("/")
    ) {
      window.location.assign(event.data.url);
    }
  });

  const register = () => {
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        watchForWaitingWorker(registration);
        onAppVisible(registration);

        window.addEventListener("focus", () => onAppVisible(registration));
        window.addEventListener("pageshow", () => onAppVisible(registration));
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") onAppVisible(registration);
        });
      })
      .catch(() => {});
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", register, { once: true });
    return;
  }
  register();
}
