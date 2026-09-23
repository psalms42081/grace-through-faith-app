import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { formatVerseTimeLabel, normalizeHm } from "@/lib/daily-verse-push";

type ReminderTimeFieldProps = {
  label: string;
  value: string;
  testID: string;
  onCommit: (hm: string) => void;
};

function hmToDate(value: string): Date {
  const normalized = normalizeHm(value) ?? "07:00";
  const [hour, minute] = normalized.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function dateToHm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function ReminderTimeField({ label, value, testID, onCommit }: ReminderTimeFieldProps) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeHm(value) ?? value;

  if (Platform.OS === "ios") {
    return (
      <View style={styles.timeRow}>
        <Text style={styles.meta}>{label}</Text>
        <DateTimePicker
          testID={testID}
          mode="time"
          display="compact"
          minuteInterval={1}
          value={hmToDate(normalized)}
          onValueChange={(_event, date) => onCommit(dateToHm(date))}
        />
      </View>
    );
  }

  return (
    <View style={styles.timeRow}>
      <Pressable style={styles.valueButton} onPress={() => setOpen(true)} testID={testID}>
        <Text style={styles.meta}>{label}</Text>
        <Text style={styles.timeValue}>{formatVerseTimeLabel(normalized)}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          mode="time"
          display="clock"
          value={hmToDate(normalized)}
          onValueChange={(_event, date) => {
            setOpen(false);
            onCommit(dateToHm(date));
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 4,
  },
  valueButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meta: { color: HV2.inkMutedText, fontSize: 13, marginTop: 2, fontFamily: "Inter_400Regular" },
  timeValue: { color: PathB.ink, fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
