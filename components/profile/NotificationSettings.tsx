import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { PathBSwitch } from "@/components/settings/PathBSwitch";
import { useToast } from "@/contexts/ToastContext";
import { apiRequest } from "@/lib/query-client";
import {
  DEFAULT_VERSE_PUSH_TIME,
  NOTIFICATIONS_BLOCKED_MESSAGE,
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
  type PushEndpoint,
} from "@/lib/push-subscribe";

type StoredSubscription = {
  endpoint: string;
  verseTimeLocal: string | null;
  ssReminder: boolean;
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
  const { showToast } = useToast();
  const permission = notificationPermissionState();
  const [blocked, setBlocked] = useState(permission === "denied");
  const [busy, setBusy] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [draftTime, setDraftTime] = useState(DEFAULT_VERSE_PUSH_TIME);
  const [localTime, setLocalTime] = useState(DEFAULT_VERSE_PUSH_TIME);
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

  async function save(next: {
    verseTimeLocal: string | null;
    ssReminder: boolean;
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
    let acquired = endpoint ?? (await existingPushEndpoint());
    if (!acquired) {
      const result = await acquirePushEndpoint();
      if (!result.ok) {
        if (result.reason === "denied") setBlocked(true);
        else showToast("Notifications are not available on this device", "error");
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
    });
    setBlocked(false);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }

  async function onVerseChange(enabled: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      await save({
        verseTimeLocal: enabled ? verseTime : null,
        ssReminder: ssOn,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update notifications", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onSabbathChange(enabled: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      await save({
        verseTimeLocal: verseOn ? verseTime : null,
        ssReminder: enabled,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update notifications", "error");
    } finally {
      setBusy(false);
    }
  }

  async function applyTime(nextTime: string) {
    const normalized = normalizeHm(nextTime) ?? DEFAULT_VERSE_PUSH_TIME;
    setLocalTime(normalized);
    setTimeOpen(false);
    if (!verseOn) return;
    setBusy(true);
    try {
      await save({ verseTimeLocal: normalized, ssReminder: ssOn });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update the time", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.section} testID="profile-notifications-section">
      <Text style={styles.heading}>Notifications</Text>
      {blocked ? (
        <Text style={styles.blocked} testID="profile-notifications-blocked">
          {Platform.OS === "web"
            ? NOTIFICATIONS_BLOCKED_MESSAGE
            : "Notifications are blocked — enable them in your device settings."}
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
          onValueChange={(value) => {
            void onVerseChange(value);
          }}
          disabled={busy}
          testID="profile-daily-verse-switch"
        />
      </View>
      <Pressable
        style={styles.timeRow}
        onPress={() => {
          setDraftTime(verseTime);
          setTimeOpen(true);
        }}
        testID="profile-daily-verse-time"
      >
        <Text style={styles.meta}>Time</Text>
        <Text style={styles.timeValue}>{formatVerseTimeLabel(verseTime)}</Text>
      </Pressable>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>Sabbath School reminder</Text>
          <Text style={styles.meta}>Friday at 6:00 pm, your time</Text>
        </View>
        <PathBSwitch
          value={ssOn}
          onValueChange={(value) => {
            void onSabbathChange(value);
          }}
          disabled={busy}
          testID="profile-ss-reminder-switch"
        />
      </View>
      <Modal visible={timeOpen} transparent animationType="fade" onRequestClose={() => setTimeOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setTimeOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>Daily verse time</Text>
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
