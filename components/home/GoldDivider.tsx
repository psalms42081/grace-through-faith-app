import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export default function GoldDivider({ theme }: { theme: typeof Colors.dark }) {
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: theme.accent + "30" }]} />
      <Ionicons name="diamond-outline" size={10} color={theme.accent + "60"} />
      <View style={[styles.dividerLine, { backgroundColor: theme.accent + "30" }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
});
