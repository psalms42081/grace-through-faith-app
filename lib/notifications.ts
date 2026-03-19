import { Platform } from "react-native";
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

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const mod = await loadModule();
  if (!mod) return false;

  const { status: existingStatus } = await mod.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await mod.requestPermissionsAsync();
  return status === "granted";
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const mod = await loadModule();
  if (!mod) return false;

  const { status } = await mod.getPermissionsAsync();
  return status === "granted";
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

export async function setReminderEnabled(enabled: boolean): Promise<boolean> {
  await AsyncStorage.setItem(REMINDER_ENABLED_KEY, String(enabled));
  if (enabled) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      await AsyncStorage.setItem(REMINDER_ENABLED_KEY, "false");
      return false;
    }
    const { hour, minute } = await getReminderSettings();
    await scheduleDailyReminder(hour, minute);
    return true;
  } else {
    await cancelReminder();
    return true;
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

  const id = await mod.scheduleNotificationAsync({
    content: {
      title: "Your reading plan is waiting",
      body: "Take a few minutes with today's passage.",
      sound: true,
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
