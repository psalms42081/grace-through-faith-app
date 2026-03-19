import { Platform, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REMINDER_ENABLED_KEY = "@grace-through-faith/reminder-enabled";
const REMINDER_HOUR_KEY = "@grace-through-faith/reminder-hour";
const REMINDER_MINUTE_KEY = "@grace-through-faith/reminder-minute";
const NOTIFICATION_ID_KEY = "@grace-through-faith/reminder-notification-id";

const DEFAULT_HOUR = 8;
const DEFAULT_MINUTE = 0;

let Notifications: typeof import("expo-notifications") | null = null;

async function loadModule() {
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
  await mod.setNotificationChannelAsync("daily-reminders", {
    name: "Daily Reading Reminders",
    importance: mod.AndroidImportance.HIGH,
    sound: "default",
  });
}

export type PermissionResult = {
  granted: boolean;
  canAskAgain: boolean;
};

export async function getNotificationPermissionStatus(): Promise<PermissionResult> {
  if (Platform.OS === "web") return { granted: false, canAskAgain: false };
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

export async function setReminderEnabled(enabled: boolean): Promise<{ success: boolean; permissionDenied?: boolean; canAskAgain?: boolean }> {
  await AsyncStorage.setItem(REMINDER_ENABLED_KEY, String(enabled));
  if (enabled) {
    const result = await requestNotificationPermission();
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

export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<void> {
  if (Platform.OS === "web") return;
  const mod = await loadModule();
  if (!mod) return;

  await cancelReminder();
  await ensureAndroidChannel();

  const id = await mod.scheduleNotificationAsync({
    content: {
      title: "Your reading plan is waiting",
      body: "Take a few minutes with today's passage.",
      sound: true,
      ...(Platform.OS === "android" ? { channelId: "daily-reminders" } : {}),
    },
    trigger: {
      type: mod.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    } as any,
  });

  await AsyncStorage.setItem(NOTIFICATION_ID_KEY, id);
}

export async function cancelReminder(): Promise<void> {
  if (Platform.OS === "web") return;
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
