import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export interface PastoralCareAlertProps {
  alert_type: "individual" | "congregational";
  topic: string;
  severity: "HIGH" | "MODERATE" | "INFO";
  actual_count: number;
  created_at: string;
  opted_in_members?: { first_name: string; last_initial: string }[];
  status: "active" | "acknowledged" | "resolved";
  onMarkReviewed: () => void;
  onAssignToElder: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  HIGH: "#EF8C2C",
  MODERATE: "#C9933A",
  INFO: "#3B82F6",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  const diffWeek = Math.floor(diffDay / 7);
  return `${diffWeek} week${diffWeek !== 1 ? "s" : ""} ago`;
}

function capitalize(s: string): string {
  return s
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function PastoralCareAlertCard({
  alert_type,
  topic,
  severity,
  actual_count,
  created_at,
  opted_in_members,
  status,
  onMarkReviewed,
  onAssignToElder,
}: PastoralCareAlertProps) {
  const badgeColor = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.INFO;
  const buttonsDisabled = status === "acknowledged" || status === "resolved";

  const title =
    alert_type === "congregational"
      ? `${capitalize(topic)} Engagement in Your Church`
      : "Member Support Needed";

  const description =
    alert_type === "congregational"
      ? `${actual_count} member${actual_count !== 1 ? "s" : ""} engaging with this topic this week`
      : `A member has been engaging frequently with ${topic.toLowerCase()} this week`;

  const showOptedIn =
    opted_in_members !== undefined && opted_in_members.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{severity}</Text>
        </View>
        <Text style={styles.timestamp}>{timeAgo(created_at)}</Text>
      </View>

      <Text style={styles.title}>{title}</Text>

      <Text style={styles.description}>{description}</Text>

      {showOptedIn && (
        <View style={styles.optedInSection}>
          <Text style={styles.optedInHeading}>Members Open to Outreach</Text>
          {opted_in_members!.map((m, i) => (
            <View key={i} style={styles.optedInRow}>
              <Text style={styles.memberName}>
                {m.first_name} {m.last_initial}.
              </Text>
              <Text style={styles.memberAvailability}>
                {" "}
                available for pastoral care
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.outlinedButton, buttonsDisabled && styles.buttonDisabled]}
          onPress={onMarkReviewed}
          activeOpacity={0.7}
          disabled={buttonsDisabled}
          accessibilityLabel="Mark Reviewed"
          accessibilityRole="button"
        >
          <Text style={styles.outlinedButtonText}>Mark Reviewed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filledButton, buttonsDisabled && styles.buttonDisabled]}
          onPress={onAssignToElder}
          activeOpacity={0.7}
          disabled={buttonsDisabled}
          accessibilityLabel="Assign to Elder"
          accessibilityRole="button"
        >
          <Text style={styles.filledButtonText}>Assign to Elder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141518",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1F24",
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  timestamp: {
    color: "#5C5549",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  title: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
    color: "#C9933A",
    marginBottom: 6,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#9A8E7A",
    lineHeight: 21,
  },
  optedInSection: {
    marginTop: 14,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#C9933A",
  },
  optedInHeading: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#C9933A",
    marginBottom: 8,
  },
  optedInRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  memberName: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#F0EBE0",
  },
  memberAvailability: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#5C5549",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  outlinedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C9933A",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
  },
  outlinedButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#C9933A",
  },
  filledButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C9933A",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
  },
  filledButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#050507",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
