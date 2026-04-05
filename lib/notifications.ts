import { Platform, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const PUSH_TOKEN_REGISTERED_KEY = "@grace-through-faith/push-token-registered";
const REMINDER_ENABLED_KEY = "@grace-through-faith/reminder-enabled";
const REMINDER_HOUR_KEY = "@grace-through-faith/reminder-hour";
const REMINDER_MINUTE_KEY = "@grace-through-faith/reminder-minute";
const NOTIFICATION_ID_KEY = "@grace-through-faith/reminder-notification-id";

const DEFAULT_HOUR = 8;
const DEFAULT_MINUTE = 0;

/**
 * Returns true when running inside Expo Go.
 * SDK 53+ removed Android push notifications from Expo Go entirely.
 * A proper development build (EAS) is required for Android push notifications.
 */
function isExpoGo(): boolean {
  try {
    const env = (Constants as any).executionEnvironment;
    if (env) return env === "storeClient";
    return (Constants as any).appOwnership === "expo";
  } catch {
    return false;
  }
}

/**
 * Android + Expo Go = no notification support at all since SDK 53.
 * iOS Expo Go still supports local notifications (not remote push).
 */
export function isAndroidExpoGo(): boolean {
  return Platform.OS === "android" && isExpoGo();
}

/**
 * Remote push tokens are unavailable in ALL Expo Go environments since SDK 53.
 */
function canUsePushTokens(): boolean {
  return !isExpoGo();
}

let Notifications: typeof import("expo-notifications") | null = null;

async function loadModule() {
  if (Platform.OS === "web") return null;
  // Do not even try to load expo-notifications on Android Expo Go (SDK 53+)
  if (isAndroidExpoGo()) return null;
  if (!Notifications) {
    try {
      Notifications = await import("expo-notifications");
    } catch {
      Notifications = null;
    }
  }
  return Notifications;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  const mod = await loadModule();
  if (!mod) return;
  try {
    await mod.setNotificationChannelAsync("daily-reminders", {
      name: "Daily Reading Reminders",
      importance: mod.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#C9933A",
    });
  } catch {}
}

export type PermissionResult = {
  granted: boolean;
  canAskAgain: boolean;
  /** True when the feature is unavailable (e.g. Android Expo Go) */
  unavailable?: boolean;
};

export async function getNotificationPermissionStatus(): Promise<PermissionResult> {
  if (Platform.OS === "web") return { granted: false, canAskAgain: false };
  if (isAndroidExpoGo()) return { granted: false, canAskAgain: false, unavailable: true };
  try {
    const mod = await loadModule();
    if (!mod) return { granted: false, canAskAgain: false };
    const perm = await mod.getPermissionsAsync();
    return {
      granted: perm.status === "granted",
      canAskAgain: perm.canAskAgain !== false,
    };
  } catch {
    return { granted: false, canAskAgain: false };
  }
}

export async function requestNotificationPermission(): Promise<PermissionResult> {
  if (Platform.OS === "web") return { granted: false, canAskAgain: false };
  if (isAndroidExpoGo()) return { granted: false, canAskAgain: false, unavailable: true };
  try {
    const mod = await loadModule();
    if (!mod) return { granted: false, canAskAgain: false };
    const existing = await mod.getPermissionsAsync();
    if (existing.status === "granted") return { granted: true, canAskAgain: true };
    const result = await mod.requestPermissionsAsync();
    return {
      granted: result.status === "granted",
      canAskAgain: result.canAskAgain !== false,
    };
  } catch {
    return { granted: false, canAskAgain: false };
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { granted } = await getNotificationPermissionStatus();
  return granted;
}

export function openAppSettings(): void {
  if (Platform.OS !== "web") {
    Linking.openSettings().catch(() => {});
  }
}

export async function getReminderSettings(): Promise<{
  enabled: boolean;
  hour: number;
  minute: number;
}> {
  try {
    const [enabled, hour, minute] = await Promise.all([
      AsyncStorage.getItem(REMINDER_ENABLED_KEY),
      AsyncStorage.getItem(REMINDER_HOUR_KEY),
      AsyncStorage.getItem(REMINDER_MINUTE_KEY),
    ]);
    return {
      enabled: enabled === "true",
      hour: hour !== null ? parseInt(hour, 10) : DEFAULT_HOUR,
      minute: minute !== null ? parseInt(minute, 10) : DEFAULT_MINUTE,
    };
  } catch {
    return { enabled: false, hour: DEFAULT_HOUR, minute: DEFAULT_MINUTE };
  }
}

export async function setReminderEnabled(
  enabled: boolean
): Promise<{ success: boolean; permissionDenied?: boolean; canAskAgain?: boolean; unavailable?: boolean }> {
  if (isAndroidExpoGo()) {
    return { success: false, unavailable: true };
  }
  await AsyncStorage.setItem(REMINDER_ENABLED_KEY, String(enabled));
  if (enabled) {
    const result = await requestNotificationPermission();
    if (result.unavailable) {
      await AsyncStorage.setItem(REMINDER_ENABLED_KEY, "false");
      return { success: false, unavailable: true };
    }
    if (!result.granted) {
      await AsyncStorage.setItem(REMINDER_ENABLED_KEY, "false");
      return { success: false, permissionDenied: true, canAskAgain: result.canAskAgain };
    }
    await ensureAndroidChannel();
    const { hour, minute } = await getReminderSettings();
    await scheduleDailyReminder(hour, minute);
    return { success: true };
  } else {
    await cancelReminder();
    return { success: true };
  }
}

export async function setReminderTime(hour: number, minute: number): Promise<void> {
  await AsyncStorage.setItem(REMINDER_HOUR_KEY, String(hour));
  await AsyncStorage.setItem(REMINDER_MINUTE_KEY, String(minute));
  const { enabled } = await getReminderSettings();
  if (enabled) {
    await scheduleDailyReminder(hour, minute);
  }
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  if (Platform.OS === "web" || isAndroidExpoGo()) return;
  const mod = await loadModule();
  if (!mod) return;

  await cancelReminder();
  await ensureAndroidChannel();

  try {
    const id = await mod.scheduleNotificationAsync({
      content: {
        title: "Your reading plan is waiting ✝",
        body: "Take a few minutes with today's passage.",
        sound: "default",
        ...(Platform.OS === "android" ? { channelId: "daily-reminders" } : {}),
      },
      trigger: {
        type: mod.SchedulableTriggerInputTypes?.DAILY
          ? mod.SchedulableTriggerInputTypes.DAILY
          : ("daily" as any),
        hour,
        minute,
        repeats: true,
      } as any,
    });
    await AsyncStorage.setItem(NOTIFICATION_ID_KEY, id);
  } catch (err) {
    console.warn("[notifications] scheduleDailyReminder failed:", err);
  }
}

export async function cancelReminder(): Promise<void> {
  if (Platform.OS === "web" || isAndroidExpoGo()) return;
  const mod = await loadModule();
  if (!mod) return;
  try {
    const existingId = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
    if (existingId) {
      await mod.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem(NOTIFICATION_ID_KEY);
    }
  } catch {}
}

export async function scheduleIfEnabled(): Promise<void> {
  const { enabled, hour, minute } = await getReminderSettings();
  if (enabled) {
    const granted = await hasNotificationPermission();
    if (granted) {
      await scheduleDailyReminder(hour, minute);
    }
  }
}

/**
 * Register for Expo remote push notifications.
 * Requires a proper development build — not supported in Expo Go (SDK 53+).
 */
export async function registerPushToken(authToken: string, apiBaseUrl: string): Promise<void> {
  if (Platform.OS === "web") return;

  if (isExpoGo()) {
    console.log(
      "[push] Push token registration skipped — Expo Go does not support remote push " +
      "notifications since SDK 53. Use a development build (npx expo run:android / run:ios) " +
      "or EAS Build to enable push notifications."
    );
    return;
  }

  try {
    const mod = await loadModule();
    if (!mod) return;

    const { status: existingStatus } = await mod.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await mod.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    await ensureAndroidChannel();

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      (Constants as any).easConfig?.projectId ||
      undefined;

    if (!projectId) {
      console.warn(
        "[push] No EAS projectId found in app.json extra.eas.projectId. " +
        "Run `eas init` to link your project and add the ID to app.json."
      );
      return;
    }

    const tokenData = await mod.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;
    if (!pushToken) return;

    const lastRegistered = await AsyncStorage.getItem(PUSH_TOKEN_REGISTERED_KEY);
    if (lastRegistered === pushToken) return;

    const url = new URL("/api/notifications/register-token", apiBaseUrl);
    const res = await globalThis.fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: pushToken, platform: Platform.OS }),
    });

    if (res.ok) {
      await AsyncStorage.setItem(PUSH_TOKEN_REGISTERED_KEY, pushToken);
      console.log("[push] Push token registered successfully");
    }
  } catch (err) {
    console.warn("[push] registerPushToken failed (non-fatal):", err instanceof Error ? err.message : err);
  }
}
