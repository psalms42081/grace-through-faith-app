import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { confirmWebSafe } from "@/components/WebSafeConfirm";
import { getApiUrl } from "@/lib/query-client";
import {
  getNotificationPermissionStatus,
  registerPushToken,
  requestNotificationPermission,
} from "@/lib/notifications";

const AUTH_TOKEN_KEY = "@grace_auth_token";
const OFFERED_KEY = "@grace-through-faith/notification-offer-shown";

export const NOTIFICATION_EXPLAIN = {
  title: "Allow reminders?",
  message:
    "Informed Ministries can remind you about reading, prayer, and Sabbath School. You can change this later in Settings.",
  confirmLabel: "Continue",
  cancelLabel: "Not now",
} as const;

export type NotificationDecision = "granted" | "declined" | "blocked" | "unavailable";

/** Shows the in-app explanation, then the system permission dialog only if the person agrees. */
export async function explainAndRequestNotificationPermission(): Promise<NotificationDecision> {
  if (Platform.OS === "web") return "unavailable";
  const current = await getNotificationPermissionStatus();
  if (current.unavailable) return "unavailable";
  if (current.granted) return "granted";
  if (!current.canAskAgain) return "blocked";
  const agreed = await confirmWebSafe({
    title: NOTIFICATION_EXPLAIN.title,
    message: NOTIFICATION_EXPLAIN.message,
    confirmLabel: NOTIFICATION_EXPLAIN.confirmLabel,
    cancelLabel: NOTIFICATION_EXPLAIN.cancelLabel,
  });
  if (!agreed) return "declined";
  const asked = await requestNotificationPermission();
  if (asked.unavailable) return "unavailable";
  if (asked.granted) return "granted";
  return asked.canAskAgain ? "declined" : "blocked";
}

/**
 * After the first successful sign-in, offer reminders once. Later sign-ins
 * only refresh a token that was already allowed. Opening the Sign In screen
 * does not call this.
 */
export async function offerNotificationsAfterFirstSignIn(): Promise<void> {
  if (Platform.OS === "web") return;
  const current = await getNotificationPermissionStatus();
  if (current.unavailable) return;
  const offered = await AsyncStorage.getItem(OFFERED_KEY);
  if (offered === "1") {
    if (!current.granted) return;
  } else if (current.granted) {
    await AsyncStorage.setItem(OFFERED_KEY, "1");
  } else {
    const agreed = await confirmWebSafe({
      title: NOTIFICATION_EXPLAIN.title,
      message: NOTIFICATION_EXPLAIN.message,
      confirmLabel: NOTIFICATION_EXPLAIN.confirmLabel,
      cancelLabel: NOTIFICATION_EXPLAIN.cancelLabel,
    });
    await AsyncStorage.setItem(OFFERED_KEY, "1");
    if (!agreed) return;
    const asked = await requestNotificationPermission();
    if (!asked.granted) return;
  }
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (token) await registerPushToken(token, getApiUrl());
}
