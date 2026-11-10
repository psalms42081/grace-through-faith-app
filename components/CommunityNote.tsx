import React from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

export const COMMUNITY_NOTE = "Keep it kind. Posts can be reported and removed.";

export function CommunityNote({ color, style }: { color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text
      style={[styles.note, color ? { color } : null, style]}
      accessibilityRole="text"
    >
      {COMMUNITY_NOTE}
    </Text>
  );
}

const styles = StyleSheet.create({
  note: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: "#6B6660",
    marginBottom: 10,
  },
});
