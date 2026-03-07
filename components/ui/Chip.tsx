import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export default function Chip({
  label,
  selected = false,
  onPress,
  icon,
  style,
  testID,
}: ChipProps) {
  const { theme, isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        {
          backgroundColor: selected
            ? theme.accent + "20"
            : isDark
              ? theme.backgroundCard
              : "#FFFDF6",
          borderColor: selected ? theme.accent : theme.border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
      testID={testID}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? theme.accent : theme.textSecondary}
        />
      ) : null}
      <Text
        style={[
          s.label,
          {
            color: selected ? theme.accent : theme.textSecondary,
            fontFamily: selected
              ? ("Inter_600SemiBold" as const)
              : ("Inter_500Medium" as const),
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  label: {
    fontSize: 13,
  },
});
