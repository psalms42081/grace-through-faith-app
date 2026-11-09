import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReminderTimeField from "@/components/profile/ReminderTimeField";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { PathBSwitch } from "@/components/settings/PathBSwitch";
import { apiRequest } from "@/lib/query-client";
import {
  ANDROID_CHROME_BATTERY_TIP,
  DEFAULT_VERSE_PUSH_TIME,
  MAX_PRAYER_TIMES,
  NOTIFICATIONS_BLOCKED_MESSAGE,
  NOTIFICATIONS_SETUP_FAILED_MESSAGE,
  SABBATH_SCHOOL_PUSH_TIME,
  isAndroidChrome,
  normalizeHm,
} from "@/lib/daily-verse-push";
import {
  acquirePushEndpoint,
  currentWebEndpoint,
  deviceTimeZone,
  dropWebPushSubscription,
  existingPushEndpoint,
  notificationPermissionState,
  settleWebNotificationPermission,
  startWebNotificationPermission,
  type PushEndpoint,
  type WebPermissionStart,
} from "@/lib/push-subscribe";
import { explainAndRequestNotificationPermission } from "@/lib/notification-consent";

type StoredSubscription = {
  endpoint: string;
  verseTimeLocal: string | null;
  ssReminder: boolean;
  ssTimeLocal: string | null;
  planReminder: boolean;
  prayerTimes: string[];
  timezone: string;
  web: boolean;
};

type ReminderPrefs = {
  verseTimeLocal: string | null;
  ssReminder: boolean;
  ssTimeLocal: string | null;
  planReminder: boolean;
  prayerTimes: string[];
};

const PRAYER_SLOT_LABELS = ["Morning", "Midday", "Evening"];
const PRAYER_SLOT_DEFAULTS = ["07:00", "12:00", "18:00"];

function nextPrayerTime(existing: string[]): string {
  return PRAYER_SLOT_DEFAULTS.find((time) => !existing.includes(time)) ?? "21:00";
}

type PlanProgress = {
  planId: string;
  isActive: boolean;
  completedCount: number;
  totalDays: number;
};

const BATTERY_TIP_KEY = "@grace-through-faith/android-battery-tip-dismissed";

type SubscriptionResponse = {
  vapidConfigured: boolean;
  subscriptions: StoredSubscription[];
};

const QUERY_KEY = ["/api/push/subscription"];

export default function NotificationSettings() {
  const queryClient = useQueryClient();
  const permission = notificationPermissionState();
  const [blocked, setBlocked] = useState(permission === "denied");
  const [setupFailed, setSetupFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localTime, setLocalTime] = useState(DEFAULT_VERSE_PUSH_TIME);
  const [localSsTime, setLocalSsTime] = useState(SABBATH_SCHOOL_PUSH_TIME);
  const [browserEndpoint, setBrowserEndpoint] = useState<string | null>(null);
  const [endpointChecked, setEndpointChecked] = useState(Platform.OS !== "web");
  const [switchEpoch, setSwitchEpoch] = useState(0);
  const [planChoice, setPlanChoice] = useState<boolean | null>(null);
  const [prayerChoice, setPrayerChoice] = useState<string[] | null>(null);
  const [batteryTipDismissed, setBatteryTipDismissed] = useState(true);

  useEffect(() => {
    void currentWebEndpoint().then((endpoint) => {
      setBrowserEndpoint(endpoint);
      setEndpointChecked(true);
    });
  }, []);

  useEffect(() => {
    void AsyncStorage.getItem(BATTERY_TIP_KEY).then((value) => {
      setBatteryTipDismissed(value === "1");
    });
  }, []);

  const plans = useQuery<PlanProgress[]>({
    queryKey: ["/api/devotionals/user-progress"],
    staleTime: 30_000,
  });
  const hasActivePlan = (plans.data ?? []).some(
    (plan) => plan.isActive && plan.completedCount < plan.totalDays,
  );

  const query = useQuery<SubscriptionResponse>({
    queryKey: QUERY_KEY,
    staleTime: 0,
    refetchOnMount: "always",
    networkMode: "always",
  });
  const ready = query.isFetchedAfterMount && endpointChecked;
  const mine = !ready
    ? undefined
    : Platform.OS === "web"
      ? query.data?.subscriptions.find((row) => row.endpoint === browserEndpoint)
      : query.data?.subscriptions.find((row) => !row.web);
  const verseOn = Boolean(mine?.verseTimeLocal);
  const ssOn = Boolean(mine?.ssReminder);
  const planOn = planChoice ?? (mine ? mine.planReminder : hasActivePlan);
  const prayerTimes = prayerChoice ?? mine?.prayerTimes ?? [];
  const prayerOn = prayerTimes.length > 0;
  const anyNotificationOn = verseOn || ssOn || planOn || prayerOn;
  const showBatteryTip =
    anyNotificationOn &&
    !batteryTipDismissed &&
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    isAndroidChrome(navigator.userAgent);
  const verseTime = mine?.verseTimeLocal ?? localTime;
  const ssTime = mine?.ssTimeLocal ?? localSsTime;
  const notice = blocked
    ? Platform.OS === "web"
      ? NOTIFICATIONS_BLOCKED_MESSAGE
      : "Notifications are blocked — enable them in your device settings."
    : setupFailed
      ? NOTIFICATIONS_SETUP_FAILED_MESSAGE
      : null;

  function markFailure(kind: "denied" | "failed") {
    setBlocked(kind === "denied");
    setSetupFailed(kind === "failed");
  }

  function rememberSubscription(endpoint: string, next: (ReminderPrefs & { timezone: string }) | null) {
    queryClient.setQueryData<SubscriptionResponse>(QUERY_KEY, (current) => {
      const subscriptions = (current?.subscriptions ?? []).filter((row) => row.endpoint !== endpoint);
      if (next && (next.verseTimeLocal || next.ssReminder || next.planReminder || next.prayerTimes.length > 0)) {
        subscriptions.push({
          endpoint,
          verseTimeLocal: next.verseTimeLocal,
          ssReminder: next.ssReminder,
          ssTimeLocal: next.ssTimeLocal,
          planReminder: next.planReminder,
          prayerTimes: next.prayerTimes,
          timezone: next.timezone,
          web: !endpoint.startsWith("ExponentPushToken[") && !endpoint.startsWith("ExpoPushToken["),
        });
      }
      return { vapidConfigured: current?.vapidConfigured ?? true, subscriptions };
    });
  }

  function currentPrefs(overrides: Partial<ReminderPrefs> = {}): ReminderPrefs {
    return {
      verseTimeLocal: verseOn ? verseTime : null,
      ssReminder: ssOn,
      ssTimeLocal: ssOn ? ssTime : null,
      planReminder: planOn,
      prayerTimes,
      ...overrides,
    };
  }

  async function save(next: ReminderPrefs & {
    permission: WebPermissionStart | null;
    turningOn: boolean;
  }) {
    const knownEndpoint = mine?.endpoint ?? (await currentWebEndpoint());
    if (!next.verseTimeLocal && !next.ssReminder && !next.planReminder && next.prayerTimes.length === 0) {
      if (!knownEndpoint) {
        markFailure("failed");
        return;
      }
      await apiRequest("DELETE", "/api/push/subscription", { endpoint: knownEndpoint });
      await dropWebPushSubscription(knownEndpoint);
      rememberSubscription(knownEndpoint, null);
      setBlocked(false);
      setSetupFailed(false);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      return;
    }
    let acquired: PushEndpoint | null = null;
    if (next.turningOn && Platform.OS !== "web") {
      const decision = await explainAndRequestNotificationPermission();
      if (decision !== "granted") {
        if (decision === "blocked") markFailure("denied");
        else if (decision === "unavailable") markFailure("failed");
        setPlanChoice(null);
        setPrayerChoice(null);
        return;
      }
    }
    if (next.turningOn) {
      if (Platform.OS === "web") {
        if (!next.permission) {
          markFailure("failed");
          return;
        }
        const settled = await settleWebNotificationPermission(next.permission);
        if (settled !== "granted") {
          markFailure(settled === "denied" ? "denied" : "failed");
          return;
        }
      }
      const result = await acquirePushEndpoint();
      if (!result.ok) {
        markFailure(result.reason === "denied" ? "denied" : "failed");
        return;
      }
      acquired = result.endpoint;
    } else if (knownEndpoint) {
      const existing = await existingPushEndpoint();
      acquired = existing ?? { kind: "web", endpoint: knownEndpoint, keys: { p256dh: "", auth: "" } };
    } else {
      markFailure("failed");
      return;
    }
    const timezone = deviceTimeZone();
    const saved = {
      verseTimeLocal: next.verseTimeLocal,
      ssReminder: next.ssReminder,
      ssTimeLocal: next.ssReminder ? next.ssTimeLocal : null,
      planReminder: next.planReminder,
      prayerTimes: next.prayerTimes,
      timezone,
    };
    const keys = acquired.kind === "web" && acquired.keys.p256dh && acquired.keys.auth ? acquired.keys : null;
    await apiRequest("PUT", "/api/push/subscription", {
      endpoint: acquired.endpoint,
      keys,
      ...saved,
    });
    if (knownEndpoint && knownEndpoint !== acquired.endpoint) {
      rememberSubscription(knownEndpoint, null);
    }
    rememberSubscription(acquired.endpoint, saved);
    if (Platform.OS === "web") setBrowserEndpoint(acquired.endpoint);
    setBlocked(false);
    setSetupFailed(false);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }

  async function commit(
    next: ReminderPrefs,
    permission: WebPermissionStart | null,
    turningOn: boolean,
  ) {
    if (busy) return;
    setBusy(true);
    setSetupFailed(false);
    try {
      await save({ ...next, permission, turningOn });
    } catch {
      markFailure("failed");
    } finally {
      setBusy(false);
      setSwitchEpoch((epoch) => epoch + 1);
    }
  }

  function onVerseChange(enabled: boolean) {
    if (!ready || busy || enabled === verseOn) return;
    const permission = enabled && Platform.OS === "web" ? startWebNotificationPermission() : null;
    void commit(
      currentPrefs({ verseTimeLocal: enabled ? verseTime : null }),
      permission,
      enabled,
    );
  }

  function onPlanChange(enabled: boolean) {
    if (!ready || busy || enabled === planOn) return;
    setPlanChoice(enabled);
    if (!enabled && !mine) return;
    const permission = enabled && Platform.OS === "web" && !mine ? startWebNotificationPermission() : null;
    void commit(
      currentPrefs({ planReminder: enabled }),
      permission,
      enabled && !mine,
    );
  }

  function onSabbathChange(enabled: boolean) {
    if (!ready || busy || enabled === ssOn) return;
    const permission = enabled && Platform.OS === "web" ? startWebNotificationPermission() : null;
    void commit(
      currentPrefs({ ssReminder: enabled, ssTimeLocal: enabled ? ssTime : null }),
      permission,
      enabled,
    );
  }

  function onPrayerChange(enabled: boolean) {
    if (!ready || busy || enabled === prayerOn) return;
    const nextTimes = enabled ? [nextPrayerTime([])] : [];
    setPrayerChoice(nextTimes);
    if (!enabled && !mine) return;
    const permission = enabled && Platform.OS === "web" && !mine ? startWebNotificationPermission() : null;
    void commit(currentPrefs({ prayerTimes: nextTimes }), permission, enabled && !mine);
  }

  function onAddPrayerTime() {
    if (!ready || busy || prayerTimes.length >= MAX_PRAYER_TIMES) return;
    const nextTimes = [...prayerTimes, nextPrayerTime(prayerTimes)];
    setPrayerChoice(nextTimes);
    const permission = Platform.OS === "web" && !mine ? startWebNotificationPermission() : null;
    void commit(currentPrefs({ prayerTimes: nextTimes }), permission, !mine);
  }

  function onRemovePrayerTime(index: number) {
    if (!ready || busy) return;
    const nextTimes = prayerTimes.filter((_, item) => item !== index);
    setPrayerChoice(nextTimes);
    if (nextTimes.length === 0 && !mine) return;
    void commit(currentPrefs({ prayerTimes: nextTimes }), null, false);
  }

  async function applyPrayerTime(index: number, nextTime: string) {
    const normalized = normalizeHm(nextTime);
    if (!normalized) return;
    if (prayerTimes.some((time, item) => item !== index && time === normalized)) return;
    const nextTimes = prayerTimes.map((time, item) => (item === index ? normalized : time));
    setPrayerChoice(nextTimes);
    await commit(currentPrefs({ prayerTimes: nextTimes }), null, false);
  }

  async function applyTime(which: "verse" | "sabbath", nextTime: string) {
    const fallback = which === "sabbath" ? SABBATH_SCHOOL_PUSH_TIME : DEFAULT_VERSE_PUSH_TIME;
    const normalized = normalizeHm(nextTime) ?? fallback;
    if (which === "sabbath") {
      setLocalSsTime(normalized);
      if (!ssOn) return;
      await commit(
        currentPrefs({ ssReminder: true, ssTimeLocal: normalized }),
        null,
        false,
      );
      return;
    }
    setLocalTime(normalized);
    if (!verseOn) return;
    await commit(currentPrefs({ verseTimeLocal: normalized }), null, false);
  }

  return (
    <View style={styles.section} testID="profile-notifications-section">
      <Text style={styles.heading}>Notifications</Text>
      {notice ? (
        <Text style={styles.blocked} testID="profile-notifications-blocked">
          {notice}
        </Text>
      ) : null}
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>Daily verse</Text>
          <Text style={styles.meta}>The same verse shown on Home</Text>
        </View>
        {busy ? <ActivityIndicator color={PathB.coral} /> : null}
        <PathBSwitch
          key={`verse-${verseOn}-${switchEpoch}`}
          value={verseOn}
          onValueChange={onVerseChange}
          disabled={!ready || busy}
          testID="profile-daily-verse-switch"
          accessibilityLabel="Daily verse"
        />
      </View>
      <ReminderTimeField
        label="Time"
        value={verseTime}
        testID="profile-daily-verse-time"
        onCommit={(next) => void applyTime("verse", next)}
      />
      {showBatteryTip ? (
        <View style={styles.tip} testID="profile-android-battery-tip">
          <Text style={styles.tipText}>{ANDROID_CHROME_BATTERY_TIP}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss battery tip"
            testID="profile-android-battery-tip-dismiss"
            onPress={() => {
              setBatteryTipDismissed(true);
              void AsyncStorage.setItem(BATTERY_TIP_KEY, "1");
            }}
          >
            <Text style={styles.tipDismiss}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>Reading plan</Text>
          <Text style={styles.meta}>Day of your plan, with the daily verse</Text>
        </View>
        <PathBSwitch
          key={`plan-${planOn}-${switchEpoch}`}
          value={planOn}
          onValueChange={onPlanChange}
          disabled={!ready || busy}
          testID="profile-plan-reminder-switch"
          accessibilityLabel="Reading plan"
        />
      </View>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>Sabbath School reminder</Text>
          <Text style={styles.meta}>Friday, your time</Text>
        </View>
        <PathBSwitch
          key={`sabbath-${ssOn}-${switchEpoch}`}
          value={ssOn}
          onValueChange={onSabbathChange}
          disabled={!ready || busy}
          testID="profile-ss-reminder-switch"
          accessibilityLabel="Sabbath School reminder"
        />
      </View>
      <ReminderTimeField
        label="Friday"
        value={ssTime}
        testID="profile-ss-reminder-time"
        onCommit={(next) => void applyTime("sabbath", next)}
      />
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>Times of prayer</Text>
          <Text style={styles.meta}>Up to three times a day, after Daniel 6:10</Text>
        </View>
        <PathBSwitch
          key={`prayer-${prayerOn}-${switchEpoch}`}
          value={prayerOn}
          onValueChange={onPrayerChange}
          disabled={!ready || busy}
          testID="profile-prayer-times-switch"
          accessibilityLabel="Times of prayer"
        />
      </View>
      {prayerTimes.map((time, index) => (
        <View key={`${time}-${index}`}>
          <ReminderTimeField
            label={PRAYER_SLOT_LABELS[index] ?? "Prayer"}
            value={time}
            testID={`profile-prayer-time-${index}`}
            onCommit={(next) => void applyPrayerTime(index, next)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${PRAYER_SLOT_LABELS[index] ?? "prayer"} time`}
            testID={`profile-prayer-time-remove-${index}`}
            onPress={() => onRemovePrayerTime(index)}
            style={styles.remove}
          >
            <Text style={styles.tipDismiss}>Remove</Text>
          </Pressable>
        </View>
      ))}
      {prayerOn && prayerTimes.length < MAX_PRAYER_TIMES ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a prayer time"
          testID="profile-prayer-time-add"
          onPress={onAddPrayerTime}
          style={styles.remove}
        >
          <Text style={styles.tipDismiss}>Add a time</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 24, marginBottom: 24 },
  heading: {
    color: HV2.inkMutedText,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  blocked: {
    color: PathB.coralInk,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: "Inter_500Medium",
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 },
  copy: { flex: 1 },
  title: { color: PathB.ink, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  meta: { color: HV2.inkMutedText, fontSize: 13, marginTop: 2, fontFamily: "Inter_400Regular" },
  tip: {
    backgroundColor: "#FBF7EE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  tipText: {
    color: PathB.ink,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  tipDismiss: {
    color: PathB.coralInk,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  remove: { alignSelf: "flex-start", paddingBottom: 8 },
});
