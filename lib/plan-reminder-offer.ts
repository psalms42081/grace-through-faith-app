import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { confirmWebSafe } from "@/components/WebSafeConfirm";
import { getDeviceTimeZone } from "@/lib/device-time-zone";
import { NOTIFICATION_EXPLAIN } from "@/lib/notification-consent";
import { requestNotificationPermission } from "@/lib/notifications";
import { acquirePushEndpoint, settleWebNotificationPermission, startWebNotificationPermission } from "@/lib/push-subscribe";
import { apiRequest } from "@/lib/query-client";

const ASKED_KEY = "@gtf/plan-reminder-asked";

/** One offer, after a plan day is finished, when plan reminders are off. */
export async function offerPlanReminder(): Promise<void> {
  if ((await AsyncStorage.getItem(ASKED_KEY)) === "1") return;
  let remindersOn = false;
  let existing: {
    verseTimeLocal?: string | null;
    ssReminder?: boolean;
    ssTimeLocal?: string | null;
    prayerTimes?: string[];
  } | null = null;
  try {
    const response = await apiRequest("GET", "/api/push/subscription");
    const body = await response.json() as {
      subscriptions?: {
        planReminder?: boolean;
        verseTimeLocal?: string | null;
        ssReminder?: boolean;
        ssTimeLocal?: string | null;
        prayerTimes?: string[];
      }[];
    };
    existing = body.subscriptions?.[0] ?? null;
    remindersOn = (body.subscriptions ?? []).some((row) => row.planReminder);
  } catch {
    remindersOn = false;
  }
  if (remindersOn) {
    await AsyncStorage.setItem(ASKED_KEY, "1");
    return;
  }
  const agreed = await confirmWebSafe({
    title: "Want a reminder for tomorrow's reading?",
    message: NOTIFICATION_EXPLAIN.message,
    confirmLabel: NOTIFICATION_EXPLAIN.confirmLabel,
    cancelLabel: NOTIFICATION_EXPLAIN.cancelLabel,
  });
  await AsyncStorage.setItem(ASKED_KEY, "1");
  if (!agreed) return;
  if (Platform.OS === "web") {
    const started = startWebNotificationPermission();
    if (started.status === "unsupported") return;
    const settled = await settleWebNotificationPermission(started);
    if (settled !== "granted") return;
  } else {
    const asked = await requestNotificationPermission();
    if (!asked.granted) return;
  }
  const acquired = await acquirePushEndpoint();
  if (!acquired.ok) return;
  const keys = acquired.endpoint.kind === "web" ? acquired.endpoint.keys : null;
  await apiRequest("PUT", "/api/push/subscription", {
    endpoint: acquired.endpoint.endpoint,
    keys,
    timezone: getDeviceTimeZone(),
    verseTimeLocal: existing?.verseTimeLocal ?? null,
    ssReminder: existing?.ssReminder === true,
    ssTimeLocal: existing?.ssTimeLocal ?? null,
    planReminder: true,
    prayerTimes: existing?.prayerTimes ?? [],
  });
}
