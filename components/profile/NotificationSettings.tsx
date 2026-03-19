import React, { useState, useEffect } from "react";
import { View, Text, Switch, Pressable, StyleSheet, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import {
  getReminderSettings,
  setReminderEnabled,
  setReminderTime,
  getNotificationPermissionStatus,
  openAppSettings,
} from "@/lib/notifications";

interface NotificationSettingsProps {
  theme: typeof Colors.dark;
  expanded: boolean;
  onToggle: () => void;
}

const TIME_OPTIONS = [
  { label: "6:00 AM", hour: 6, minute: 0 },
  { label: "7:00 AM", hour: 7, minute: 0 },
  { label: "8:00 AM", hour: 8, minute: 0 },
  { label: "9:00 AM", hour: 9, minute: 0 },
  { label: "12:00 PM", hour: 12, minute: 0 },
  { label: "6:00 PM", hour: 18, minute: 0 },
  { label: "9:00 PM", hour: 21, minute: 0 },
];

export default function NotificationSettings({
  theme,
  expanded,
  onToggle,
}: NotificationSettingsProps) {
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [loading, setLoading] = useState(false);
  const [permDenied, setPermDenied] = useState(false);

  useEffect(() => {
    getReminderSettings().then(settings => {
      setEnabled(settings.enabled);
      setHour(settings.hour);
      setMinute(settings.minute);
    }).catch(() => {});
    if (Platform.OS !== "web") {
      getNotificationPermissionStatus().then(p => {
        if (!p.granted && !p.canAskAgain) setPermDenied(true);
      }).catch(() => {});
    }
  }, []);

  const handleToggle = async (value: boolean) => {
    setLoading(true);
    const result = await setReminderEnabled(value);
    if (result.success) {
      setEnabled(value);
      setPermDenied(false);
    } else if (result.permissionDenied) {
      setEnabled(false);
      if (!result.canAskAgain) {
        setPermDenied(true);
        Alert.alert(
          "Notifications Blocked",
          "You previously denied notification access. To enable reminders, open your device settings and allow notifications for this app.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: openAppSettings },
          ]
        );
      }
    }
    setLoading(false);
  };

  const handleTimeSelect = async (h: number, m: number) => {
    setHour(h);
    setMinute(m);
    await setReminderTime(h, m);
  };

  const isWeb = Platform.OS === "web";

  return (
    <View style={[styles.wrap, { borderColor: theme.border }]}>
      <Pressable
        onPress={onToggle}
        style={styles.headerRow}
        hitSlop={4}
      >
        <View style={[styles.iconWrap, { backgroundColor: "#5B86E5" + "18" }]}>
          <Ionicons name="notifications-outline" size={18} color="#5B86E5" />
        </View>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          Daily Reminders
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.textMuted}
        />
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          {isWeb ? (
            <Text style={[styles.webNote, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Notifications are available on mobile devices only.
            </Text>
          ) : (
            <>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                  Enable daily reading reminder
                </Text>
                <Switch
                  value={enabled}
                  onValueChange={handleToggle}
                  disabled={loading}
                  trackColor={{ false: theme.border, true: theme.accent + "60" }}
                  thumbColor={enabled ? theme.accent : "#ccc"}
                  testID="reminder-toggle"
                />
              </View>

              {permDenied && !enabled && (
                <Pressable
                  onPress={openAppSettings}
                  style={[styles.settingsLink, { backgroundColor: theme.accent + "12" }]}
                >
                  <Ionicons name="settings-outline" size={14} color={theme.accent} />
                  <Text style={[styles.settingsText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                    Open device settings to allow notifications
                  </Text>
                </Pressable>
              )}

              {enabled && (
                <View style={styles.timeSection}>
                  <Text style={[styles.timeLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                    Remind me at
                  </Text>
                  <View style={styles.timeGrid}>
                    {TIME_OPTIONS.map(opt => {
                      const selected = opt.hour === hour && opt.minute === minute;
                      return (
                        <Pressable
                          key={opt.label}
                          onPress={() => handleTimeSelect(opt.hour, opt.minute)}
                          style={[
                            styles.timeChip,
                            {
                              backgroundColor: selected ? theme.accent : theme.backgroundCard,
                              borderColor: selected ? theme.accent : theme.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.timeChipText,
                              {
                                color: selected ? "#fff" : theme.text,
                                fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
                              },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 15,
  },
  body: {
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  webNote: {
    fontSize: 13,
    fontStyle: "italic",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  settingsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  settingsText: {
    fontSize: 13,
  },
  timeSection: {
    marginTop: 12,
  },
  timeLabel: {
    fontSize: 13,
    marginBottom: 10,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  timeChipText: {
    fontSize: 13,
  },
});
