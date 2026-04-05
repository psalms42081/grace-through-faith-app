import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

export default function GoldDivider({ theme }: { theme: typeof Colors.dark }) {
  return (
    <View style={styles.dividerRow}>
      <LinearGradient
        colors={["transparent", theme.accent + "40", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientLine}
      />
      <View style={[styles.centerDot, { backgroundColor: theme.accent + "50" }]} />
      <View style={[styles.centerDotInner, { backgroundColor: theme.accent + "80" }]} />
      <View style={[styles.centerDot, { backgroundColor: theme.accent + "50" }]} />
      <LinearGradient
        colors={["transparent", theme.accent + "40", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientLine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 12,
    paddingHorizontal: 20,
  },
  gradientLine: {
    flex: 1,
    height: 1,
  },
  centerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  centerDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
