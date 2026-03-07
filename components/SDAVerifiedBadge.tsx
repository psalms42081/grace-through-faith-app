import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  variant?: "full" | "compact";
}

export default function SDAVerifiedBadge({ variant = "full" }: Props) {
  if (variant === "compact") {
    return (
      <View style={styles.compactContainer}>
        <Ionicons name="shield-checkmark" size={11} color="#2E7D32" />
        <Text style={styles.compactText}>SDA Verified</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        <Ionicons name="shield-checkmark" size={14} color="#2E7D32" />
        <Text style={styles.label}>Verified SDA Framework</Text>
      </View>
      <Text style={styles.subtitle}>
        Aligned with the 28 Fundamental Beliefs
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(46, 125, 50, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(46, 125, 50, 0.2)",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#2E7D32",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(46, 125, 50, 0.7)",
    marginLeft: 20,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(46, 125, 50, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(46, 125, 50, 0.15)",
    alignSelf: "flex-start",
  },
  compactText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "#2E7D32",
  },
});
