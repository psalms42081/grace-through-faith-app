import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import ReminderTimeField from "@/components/profile/ReminderTimeField";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { PathBSwitch } from "@/components/settings/PathBSwitch";
import { apiRequest } from "@/lib/query-client";
import {
  DEFAULT_VERSE_PUSH_TIME,
  NOTIFICATIONS_BLOCKED_MESSAGE,
  NOTIFICATIONS_SETUP_FAILED_MESSAGE,
  SABBATH_SCHOOL_PUSH_TIME,
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

type StoredSubscription = {
  endpoint: string;
  verseTimeLocal: string | null;
  ssReminder: boolean;
  ssTimeLocal: string | null;
  timezone: string;
  web: boolean;
};

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

  useEffect(() => {
    void currentWebEndpoint().then((endpoint) => {
      setBrowserEndpoint(endpoint);
      setEndpointChecked(true);
    });
  }, []);

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

  function rememberSubscription(
    endpoint: string,
    next: {
      verseTimeLocal: string | null;
      ssReminder: boolean;
      ssTimeLocal: string | null;
      timezone: string;
    } | null,
  ) {
    queryClient.setQueryData<SubscriptionResponse>(QUERY_KEY, (current) => {
      const subscriptions = (current?.subscriptions ?? []).filter((row) => row.endpoint !== endpoint);
      if (next && (next.verseTimeLocal || next.ssReminder)) {
        subscriptions.push({
          endpoint,
          verseTimeLocal: next.verseTimeLocal,
          ssReminder: next.ssReminder,
          ssTimeLocal: next.ssTimeLocal,
          timezone: next.timezone,
          web: !endpoint.startsWith("ExponentPushToken[") && !endpoint.startsWith("ExpoPushToken["),
        });
      }
      return { vapidConfigured: current?.vapidConfigured ?? true, subscriptions };
    });
  }

  async function save(next: {
    verseTimeLocal: string | null;
    ssReminder: boolean;
    ssTimeLocal: string | null;
    permission: WebPermissionStart | null;
    turningOn: boolean;
  }) {
    const knownEndpoint = mine?.endpoint ?? (await currentWebEndpoint());
    if (!next.verseTimeLocal && !next.ssReminder) {
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
    next: { verseTimeLocal: string | null; ssReminder: boolean; ssTimeLocal: string | null },
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
      {
        verseTimeLocal: enabled ? verseTime : null,
        ssReminder: ssOn,
        ssTimeLocal: ssOn ? ssTime : null,
      },
      permission,
      enabled,
    );
  }

  function onSabbathChange(enabled: boolean) {
    if (!ready || busy || enabled === ssOn) return;
    const permission = enabled && Platform.OS === "web" ? startWebNotificationPermission() : null;
    void commit(
      {
        verseTimeLocal: verseOn ? verseTime : null,
        ssReminder: enabled,
        ssTimeLocal: enabled ? ssTime : null,
      },
      permission,
      enabled,
    );
  }

  async function applyTime(which: "verse" | "sabbath", nextTime: string) {
    const fallback = which === "sabbath" ? SABBATH_SCHOOL_PUSH_TIME : DEFAULT_VERSE_PUSH_TIME;
    const normalized = normalizeHm(nextTime) ?? fallback;
    if (which === "sabbath") {
      setLocalSsTime(normalized);
      if (!ssOn) return;
      await commit(
        { verseTimeLocal: verseOn ? verseTime : null, ssReminder: true, ssTimeLocal: normalized },
        null,
        false,
      );
      return;
    }
    setLocalTime(normalized);
    if (!verseOn) return;
    await commit(
      {
        verseTimeLocal: normalized,
        ssReminder: ssOn,
        ssTimeLocal: ssOn ? ssTime : null,
      },
      null,
      false,
    );
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
        />
      </View>
      <ReminderTimeField
        label="Time"
        value={verseTime}
        testID="profile-daily-verse-time"
        onCommit={(next) => void applyTime("verse", next)}
      />
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
        />
      </View>
      <ReminderTimeField
        label="Friday"
        value={ssTime}
        testID="profile-ss-reminder-time"
        onCommit={(next) => void applyTime("sabbath", next)}
      />
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
});
