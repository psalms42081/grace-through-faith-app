import React, { createElement } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { normalizeHm } from "@/lib/daily-verse-push";

type ReminderTimeFieldProps = {
  label: string;
  value: string;
  testID: string;
  onCommit: (hm: string) => void;
};

export default function ReminderTimeField({ label, value, testID, onCommit }: ReminderTimeFieldProps) {
  const normalized = normalizeHm(value) ?? value;
  return (
    <View style={styles.timeRow}>
      <Text style={styles.meta}>{label}</Text>
      {createElement("input", {
        type: "time",
        value: normalized,
        step: 60,
        "data-testid": testID,
        "aria-label": label,
        onChange: (event: { currentTarget: { value: string } }) => {
          const next = normalizeHm(event.currentTarget.value.slice(0, 5));
          if (next) onCommit(next);
        },
        style: {
          border: "none",
          background: "transparent",
          color: PathB.ink,
          fontSize: 16,
          fontFamily: "Inter_600SemiBold",
        },
      })}
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
  meta: { color: HV2.inkMutedText, fontSize: 13, marginTop: 2, fontFamily: "Inter_400Regular" },
});
