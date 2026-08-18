import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "./Button";

// Path B light sweep: pinned light tokens (shared-component micro-task)
const INK = "#1F1A12";
const INK_SECONDARY = "#3F3A31";
const MUTED = "#6B6660";
const CORAL_SOFT = "rgba(232,96,76,0.10)";
const DARK_TEXT = "#F0EBE0";
const DARK_TEXT_SECONDARY = "rgba(240,235,224,0.75)";
const DARK_MUTED = "#8B877E";

interface EmptyStateProps {
  /** "dark" keeps text readable on not-yet-converted dark screens */
  appearance?: "light" | "dark";
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export default function EmptyState({
  appearance = "light",
  icon,
  title,
  description,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) {
  const dark = appearance === "dark";

  return (
    <View style={s.container} testID={testID}>
      <View style={[s.iconWrap, { backgroundColor: CORAL_SOFT }]}>
        <Ionicons name={icon} size={32} color={dark ? DARK_MUTED : MUTED} />
      </View>
      <Text style={[s.title, { color: dark ? DARK_TEXT : INK, fontFamily: "Inter_600SemiBold" }]}>
        {title}
      </Text>
      {description ? (
        <Text style={[s.description, { color: dark ? DARK_TEXT_SECONDARY : INK_SECONDARY, fontFamily: "Inter_400Regular" }]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          appearance={appearance}
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
