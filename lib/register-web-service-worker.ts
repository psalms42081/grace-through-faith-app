/** Web-only: register the app-shell service worker at /sw.js. */
const RELOAD_FLAG = "im-pwa-sw-reloaded";

function consumeReloadFlag(): void {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG) === "1") {
      window.setTimeout(() => {
        try {
          sessionStorage.removeItem(RELOAD_FLAG);
        } catch {
          /* ignore quota / private-mode */
        }
      }, 2000);
    }
  } catch {
    /* ignore */
  }
}

function reloadOnce(): void {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG) === "1") return;
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    /* still reload if storage is unavailable */
  }
  window.location.reload();
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

export function registerWebServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  consumeReloadFlag();

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    reloadOnce();
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SW_UPDATED") {
      reloadOnce();
    }
  });

  const register = () => {
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        watchForWaitingWorker(registration);
        void checkForUpdates(registration);

        const onVisible = () => {
          if (document.visibilityState === "visible") {
            void checkForUpdates(registration);
          }
        };
        window.addEventListener("focus", () => {
          void checkForUpdates(registration);
        });
        document.addEventListener("visibilitychange", onVisible);
      })
      .catch(() => {});
  };

  if (document.readyState === "complete") {
    register();
    return;
  }
  window.addEventListener("load", register, { once: true });
}
