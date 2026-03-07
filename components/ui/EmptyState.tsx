import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import Button from "./Button";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={s.container} testID={testID}>
      <View style={[s.iconWrap, { backgroundColor: theme.accent + "10" }]}>
        <Ionicons name={icon} size={32} color={theme.textMuted} />
      </View>
      <Text style={[s.title, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
        {title}
      </Text>
      {description ? (
        <Text style={[s.description, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          variant="secondary"
          size="sm"
          title={actionLabel}
          onPress={onAction}
          style={s.actionBtn}
        />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  actionBtn: {
    marginTop: 8,
  },
});
