import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

type BadgeVariant = "filled" | "outline";

interface BadgeProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  variant?: BadgeVariant;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export default function Badge({
  label,
  icon,
  color,
  variant = "filled",
  style,
  testID,
}: BadgeProps) {
  const { theme } = useTheme();
  const resolvedColor = color || theme.accent;

  const isFilled = variant === "filled";

  return (
    <View
      style={[
        s.badge,
        {
          backgroundColor: isFilled ? resolvedColor + "18" : "transparent",
          borderWidth: isFilled ? 0 : 1,
          borderColor: isFilled ? undefined : resolvedColor + "40",
        },
        style,
      ]}
      testID={testID}
    >
      {icon ? <Ionicons name={icon} size={12} color={resolvedColor} /> : null}
      <Text
        style={[
          s.label,
          { color: resolvedColor, fontFamily: "Inter_600SemiBold" },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
  },
});
