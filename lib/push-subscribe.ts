import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiRequest } from "@/lib/query-client";
import { isAndroidExpoGo } from "@/lib/notifications";

export type PushEndpoint =
  | { kind: "web"; endpoint: string; keys: { p256dh: string; auth: string } }
  | { kind: "native"; endpoint: string };

export type PushAcquireResult =
  | { ok: true; endpoint: PushEndpoint }
  | { ok: false; reason: "denied" | "unavailable" };

export type WebPermissionStart =
  | { status: "granted" }
  | { status: "denied" }
  | { status: "unsupported" }
  | { status: "pending"; pending: Promise<NotificationPermission> };

const PERMISSION_TIMEOUT_MS = 20000;
const READY_TIMEOUT_MS = 8000;
const SUBSCRIBE_TIMEOUT_MS = 12000;

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Must be called in the switch press, before any await.
 * Always invokes requestPermission in that turn. Skipping the call when
 * permission already looks granted or denied hides the prompt, and Android
 * Chrome never shows it — and never settles — if it runs after an await.
 */
export function startWebNotificationPermission(): WebPermissionStart {
  if (typeof window === "undefined" || typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
    return { status: "unsupported" };
  }
  return { status: "pending", pending: Notification.requestPermission() };
}

export async function settleWebNotificationPermission(
  start: WebPermissionStart,
): Promise<"granted" | "denied" | "failed"> {
  if (start.status === "granted") return "granted";
  if (start.status === "denied") return "denied";
  if (start.status === "unsupported") return "failed";
  try {
    const result = await withTimeout(start.pending, PERMISSION_TIMEOUT_MS);
    if (result === "granted") return "granted";
    if (result === "denied") return "denied";
    return "failed";
  } catch {
    return "failed";
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function isExpoGo(): boolean {
  try {
    return Constants.executionEnvironment === "storeClient" || Constants.appOwnership === "expo";
  } catch {
    return false;
  }
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function notificationPermissionState(): "granted" | "denied" | "default" | "unsupported" {
  if (Platform.OS !== "web" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/** Subscribes after permission is already granted. Does not request permission. */
export async function acquirePushEndpoint(): Promise<PushAcquireResult> {
  if (Platform.OS === "web") return acquireWebEndpoint();
  return acquireNativeEndpoint();
}

async function acquireWebEndpoint(): Promise<PushAcquireResult> {
  if (typeof window === "undefined" || typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, reason: "unavailable" };
  }
  if (Notification.permission === "denied") return { ok: false, reason: "denied" };
  if (Notification.permission !== "granted") return { ok: false, reason: "unavailable" };
  try {
    const keyResponse = await withTimeout(apiRequest("GET", "/api/push/vapid-public-key"), READY_TIMEOUT_MS);
    const keyJson = (await keyResponse.json()) as { publicKey?: string };
    if (!keyJson.publicKey) return { ok: false, reason: "unavailable" };
    const registration = await withTimeout(navigator.serviceWorker.ready, READY_TIMEOUT_MS);
    const applicationServerKey = urlBase64ToUint8Array(keyJson.publicKey) as BufferSource;
    const subscribeOptions = { userVisibleOnly: true, applicationServerKey };
    let subscription: PushSubscription;
    try {
      subscription = await withTimeout(
        registration.pushManager.subscribe(subscribeOptions),
        SUBSCRIBE_TIMEOUT_MS,
      );
    } catch (error) {
      const invalid = error instanceof DOMException && error.name === "InvalidStateError";
      const existing = invalid ? await registration.pushManager.getSubscription() : null;
      if (!existing) return { ok: false, reason: "unavailable" };
      await existing.unsubscribe();
      subscription = await withTimeout(
        registration.pushManager.subscribe(subscribeOptions),
        SUBSCRIBE_TIMEOUT_MS,
      );
    }
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
      return { ok: false, reason: "unavailable" };
    }
    return {
      ok: true,
      endpoint: {
        kind: "web",
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      },
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

async function acquireNativeEndpoint(): Promise<PushAcquireResult> {
  if (isExpoGo() || isAndroidExpoGo()) return { ok: false, reason: "unavailable" };
  try {
    const mod = await import("expo-notifications");
    const existing = await mod.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const asked = await withTimeout(mod.requestPermissionsAsync(), PERMISSION_TIMEOUT_MS);
      status = asked.status;
    }
    if (status !== "granted") return { ok: false, reason: "denied" };
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId ||
      undefined;
    if (!projectId) return { ok: false, reason: "unavailable" };
    const token = await withTimeout(mod.getExpoPushTokenAsync({ projectId }), SUBSCRIBE_TIMEOUT_MS);
    if (!token.data) return { ok: false, reason: "unavailable" };
    return { ok: true, endpoint: { kind: "native", endpoint: token.data } };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/** Reads an existing subscription. Does not request permission. */
export async function existingPushEndpoint(): Promise<PushEndpoint | null> {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined" || typeof Notification === "undefined") return null;
  if (Notification.permission !== "granted" || !("serviceWorker" in navigator)) return null;
  let registration: ServiceWorkerRegistration | undefined;
  try {
    registration = await withTimeout(navigator.serviceWorker.getRegistration(), READY_TIMEOUT_MS);
  } catch {
    return null;
  }
  const subscription = await registration?.pushManager.getSubscription();
  const json = subscription?.toJSON();
  if (!json?.endpoint || !json.keys?.p256dh || !json.keys.auth) return null;
  return {
    kind: "web",
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

export async function currentWebEndpoint(): Promise<string | null> {
  if (Platform.OS !== "web" || typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const registration = await withTimeout(navigator.serviceWorker.getRegistration(), READY_TIMEOUT_MS);
    const subscription = await registration?.pushManager.getSubscription();
    return subscription?.endpoint ?? null;
  } catch {
    return null;
  }
}

export async function dropWebPushSubscription(endpoint: string | null): Promise<void> {
  if (Platform.OS !== "web" || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  let registration: ServiceWorkerRegistration | undefined;
  try {
    registration = await withTimeout(navigator.serviceWorker.getRegistration(), READY_TIMEOUT_MS);
  } catch {
    return;
  }
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription && (!endpoint || subscription.endpoint === endpoint)) {
    await subscription.unsubscribe();
  }
}
