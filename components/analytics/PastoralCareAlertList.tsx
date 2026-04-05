import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PastoralCareAlertCard, {
  type PastoralCareAlertProps,
} from "./PastoralCareAlertCard";

interface PastoralCareAlertListProps {
  alerts: PastoralCareAlertProps[];
}

const SEVERITY_ORDER: Record<string, number> = {
  HIGH: 0,
  MODERATE: 1,
  INFO: 2,
};

export default function PastoralCareAlertList({
  alerts,
}: PastoralCareAlertListProps) {
  if (alerts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle" size={48} color="#C9933A" />
        <Text style={styles.emptyText}>No pastoral signals this period</Text>
      </View>
    );
  }

  const sorted = [...alerts].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3),
  );

  return (
    <View style={styles.listContent}>
      {sorted.map((alert, index) => (
        <PastoralCareAlertCard key={`alert-${index}`} {...alert} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 14,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#5C5549",
    textAlign: "center",
  },
});
