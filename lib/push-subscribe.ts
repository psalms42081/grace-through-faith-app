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

/** Asks for permission only when a reminder switch is turned on. */
export async function acquirePushEndpoint(): Promise<PushAcquireResult> {
  if (Platform.OS === "web") return acquireWebEndpoint();
  return acquireNativeEndpoint();
}

async function acquireWebEndpoint(): Promise<PushAcquireResult> {
  if (typeof window === "undefined" || typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, reason: "unavailable" };
  }
  if (Notification.permission === "denied") return { ok: false, reason: "denied" };
  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission === "denied") return { ok: false, reason: "denied" };
    if (permission !== "granted") return { ok: false, reason: "unavailable" };
  }
  const keyResponse = await apiRequest("GET", "/api/push/vapid-public-key");
  const keyJson = (await keyResponse.json()) as { publicKey?: string };
  if (!keyJson.publicKey) return { ok: false, reason: "unavailable" };
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey) as BufferSource,
    });
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
}

async function acquireNativeEndpoint(): Promise<PushAcquireResult> {
  if (isExpoGo() || isAndroidExpoGo()) return { ok: false, reason: "unavailable" };
  const mod = await import("expo-notifications");
  const existing = await mod.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const asked = await mod.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== "granted") return { ok: false, reason: "denied" };
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId ||
    undefined;
  if (!projectId) return { ok: false, reason: "unavailable" };
  const token = await mod.getExpoPushTokenAsync({ projectId });
  if (!token.data) return { ok: false, reason: "unavailable" };
  return { ok: true, endpoint: { kind: "native", endpoint: token.data } };
}

/** Reads an existing subscription. Does not request permission. */
export async function existingPushEndpoint(): Promise<PushEndpoint | null> {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined" || typeof Notification === "undefined") return null;
  if (Notification.permission !== "granted" || !("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
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
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}

export async function dropWebPushSubscription(endpoint: string | null): Promise<void> {
  if (Platform.OS !== "web" || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription && (!endpoint || subscription.endpoint === endpoint)) {
    await subscription.unsubscribe();
  }
}
