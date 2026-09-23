import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
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
  formatVerseTimeLabel,
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

function shiftTime(value: string, deltaMinutes: number): string {
  const normalized = normalizeHm(value) ?? DEFAULT_VERSE_PUSH_TIME;
  const [hour, minute] = normalized.split(":").map(Number);
  const total = (hour * 60 + minute + deltaMinutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function NotificationSettings() {
  const queryClient = useQueryClient();
  const permission = notificationPermissionState();
  const [blocked, setBlocked] = useState(permission === "denied");
  const [setupFailed, setSetupFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [timeOpen, setTimeOpen] = useState<"verse" | "sabbath" | null>(null);
  const [draftTime, setDraftTime] = useState(DEFAULT_VERSE_PUSH_TIME);
  const [localTime, setLocalTime] = useState(DEFAULT_VERSE_PUSH_TIME);
  const [localSsTime, setLocalSsTime] = useState(SABBATH_SCHOOL_PUSH_TIME);
  const [browserEndpoint, setBrowserEndpoint] = useState<string | null>(null);

  useEffect(() => {
    void currentWebEndpoint().then(setBrowserEndpoint);
  }, []);

  const query = useQuery<SubscriptionResponse>({ queryKey: QUERY_KEY });
  const mine =
    Platform.OS === "web"
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

  async function save(next: {
    verseTimeLocal: string | null;
    ssReminder: boolean;
    ssTimeLocal: string | null;
    permission: WebPermissionStart | null;
    endpoint?: PushEndpoint | null;
  }) {
    const endpoint = next.endpoint ?? null;
    const currentEndpoint = endpoint?.endpoint ?? mine?.endpoint ?? (await currentWebEndpoint());
    if (!next.verseTimeLocal && !next.ssReminder) {
      if (currentEndpoint) {
        await apiRequest("DELETE", "/api/push/subscription", { endpoint: currentEndpoint });
        await dropWebPushSubscription(currentEndpoint);
      }
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      return;
    }
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
    let acquired = endpoint ?? (await existingPushEndpoint());
    if (!acquired) {
      const result = await acquirePushEndpoint();
      if (!result.ok) {
        markFailure(result.reason === "denied" ? "denied" : "failed");
        return;
      }
      acquired = result.endpoint;
    }
    await apiRequest("PUT", "/api/push/subscription", {
      endpoint: acquired.endpoint,
      keys: acquired.kind === "web" ? acquired.keys : null,
      timezone: deviceTimeZone(),
      verseTimeLocal: next.verseTimeLocal,
      ssReminder: next.ssReminder,
      ssTimeLocal: next.ssReminder ? next.ssTimeLocal : null,
    });
    setBlocked(false);
    setSetupFailed(false);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }

  async function commit(
    next: { verseTimeLocal: string | null; ssReminder: boolean; ssTimeLocal: string | null },
    permission: WebPermissionStart | null,
  ) {
    if (busy) return;
    setBusy(true);
    try {
      await save({ ...next, permission });
    } catch {
      markFailure("failed");
    } finally {
      setBusy(false);
    }
  }

  function onVerseChange(enabled: boolean) {
    if (busy) return;
    setSetupFailed(false);
    const permission = enabled && Platform.OS === "web" ? startWebNotificationPermission() : null;
    if (permission?.status === "denied") {
      markFailure("denied");
      return;
    }
    void commit(
      {
        verseTimeLocal: enabled ? verseTime : null,
        ssReminder: ssOn,
        ssTimeLocal: ssOn ? ssTime : null,
      },
      permission,
    );
  }

  function onSabbathChange(enabled: boolean) {
    if (busy) return;
    setSetupFailed(false);
    const permission = enabled && Platform.OS === "web" ? startWebNotificationPermission() : null;
    if (permission?.status === "denied") {
      markFailure("denied");
      return;
    }
    void commit(
      {
        verseTimeLocal: verseOn ? verseTime : null,
        ssReminder: enabled,
        ssTimeLocal: enabled ? ssTime : null,
      },
      permission,
    );
  }

  async function applyTime(nextTime: string) {
    const picker = timeOpen;
    const fallback = picker === "sabbath" ? SABBATH_SCHOOL_PUSH_TIME : DEFAULT_VERSE_PUSH_TIME;
    const normalized = normalizeHm(nextTime) ?? fallback;
    setTimeOpen(null);
    if (picker === "sabbath") {
      setLocalSsTime(normalized);
      if (!ssOn) return;
      const permission = Platform.OS === "web" ? startWebNotificationPermission() : null;
      if (permission?.status === "denied") {
        markFailure("denied");
        return;
      }
      await commit(
        { verseTimeLocal: verseOn ? verseTime : null, ssReminder: true, ssTimeLocal: normalized },
        permission,
      );
      return;
    }
    setLocalTime(normalized);
    if (!verseOn) return;
    const permission = Platform.OS === "web" ? startWebNotificationPermission() : null;
    if (permission?.status === "denied") {
      markFailure("denied");
      return;
    }
    await commit(
      {
        verseTimeLocal: normalized,
        ssReminder: ssOn,
        ssTimeLocal: ssOn ? ssTime : null,
      },
      permission,
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
          value={verseOn}
          onValueChange={onVerseChange}
          disabled={busy}
          testID="profile-daily-verse-switch"
        />
      </View>
      <Pressable
        style={styles.timeRow}
        onPress={() => {
          setDraftTime(verseTime);
          setTimeOpen("verse");
        }}
        testID="profile-daily-verse-time"
      >
        <Text style={styles.meta}>Time</Text>
        <Text style={styles.timeValue}>{formatVerseTimeLabel(verseTime)}</Text>
      </Pressable>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>Sabbath School reminder</Text>
          <Text style={styles.meta}>Friday, your time</Text>
        </View>
        <PathBSwitch
          value={ssOn}
          onValueChange={onSabbathChange}
          disabled={busy}
          testID="profile-ss-reminder-switch"
        />
      </View>
      <Pressable
        style={styles.timeRow}
        onPress={() => {
          setDraftTime(ssTime);
          setTimeOpen("sabbath");
        }}
        testID="profile-ss-reminder-time"
      >
        <Text style={styles.meta}>Friday</Text>
        <Text style={styles.timeValue}>{formatVerseTimeLabel(ssTime)}</Text>
      </Pressable>
      <Modal visible={timeOpen !== null} transparent animationType="fade" onRequestClose={() => setTimeOpen(null)}>
        <Pressable style={styles.backdrop} onPress={() => setTimeOpen(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>{timeOpen === "sabbath" ? "Friday reminder" : "Daily verse time"}</Text>
            <Text style={styles.timeLarge} testID="profile-daily-verse-time-value">
              {formatVerseTimeLabel(draftTime)}
            </Text>
            <View style={styles.steppers}>
              <Pressable style={styles.step} onPress={() => setDraftTime(shiftTime(draftTime, -60))} testID="profile-verse-hour-down">
                <Text style={styles.stepLabel}>−1 hour</Text>
              </Pressable>
              <Pressable style={styles.step} onPress={() => setDraftTime(shiftTime(draftTime, 60))} testID="profile-verse-hour-up">
                <Text style={styles.stepLabel}>+1 hour</Text>
              </Pressable>
              <Pressable style={styles.step} onPress={() => setDraftTime(shiftTime(draftTime, -15))} testID="profile-verse-minute-down">
                <Text style={styles.stepLabel}>−15 min</Text>
              </Pressable>
              <Pressable style={styles.step} onPress={() => setDraftTime(shiftTime(draftTime, 15))} testID="profile-verse-minute-up">
                <Text style={styles.stepLabel}>+15 min</Text>
              </Pressable>
            </View>
            <Pressable style={styles.save} onPress={() => void applyTime(draftTime)} testID="profile-daily-verse-time-save">
              <Text style={styles.saveLabel}>Save time</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 4,
  },
  timeValue: { color: PathB.ink, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(42, 36, 24, 0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: PathB.surface,
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  timeLarge: {
    color: PathB.ink,
    fontSize: 32,
    fontFamily: "Lora_700Bold",
    marginVertical: 12,
  },
  steppers: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  step: {
    backgroundColor: PathB.surfaceCard,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stepLabel: { color: PathB.ink, fontFamily: "Inter_600SemiBold" },
  save: {
    marginTop: 16,
    backgroundColor: PathB.coral,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 12,
  },
  saveLabel: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
