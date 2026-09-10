import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PathB } from "@/constants/colors";

const INK = PathB.ink;
const MUTED = "#6B6660";
const CREAM = PathB.surface;
const PILL = "#F1EBDD";
const BORDER = "#E7E0D2";

export const VERSE_SELECTION_ACTIONS = [
  "Highlight",
  "Bookmark",
  "Share",
  "Copy",
  "Done",
] as const;

type HighlightKey = "yellow" | "green" | "blue" | "orange";

const HIGHLIGHT_DOTS: { key: HighlightKey; bg: string; label: string }[] = [
  { key: "yellow", bg: "#FFF176", label: "Yellow" },
  { key: "green", bg: "#A5D6A7", label: "Green" },
  { key: "blue", bg: "#90CAF9", label: "Blue" },
  { key: "orange", bg: "#FFCC80", label: "Orange" },
];

export function VerseSelectionBar({
  count,
  reference,
  bottomPad,
  onHighlight,
  onBookmark,
  onShare,
  onCopy,
  onDone,
}: {
  count: number;
  reference: string;
  bottomPad: number;
  onHighlight: (color: HighlightKey) => void;
  onBookmark: () => void;
  onShare: () => void;
  onCopy: () => void;
  onDone: () => void;
}) {
  const [showColors, setShowColors] = useState(false);

  return (
    <View
      testID="reader-verse-action-bar"
      accessibilityRole="toolbar"
      accessibilityLabel={`${count} verse${count === 1 ? "" : "s"} selected`}
      style={[s.wrap, { bottom: bottomPad }]}
    >
      <Text style={s.ref} numberOfLines={1}>
        {reference}
      </Text>
      {showColors ? (
        <View style={s.colorRow}>
          {HIGHLIGHT_DOTS.map((dot) => (
            <Pressable
              key={dot.key}
              onPress={() => {
                onHighlight(dot.key);
                setShowColors(false);
              }}
              accessibilityLabel={`Highlight ${dot.label}`}
              style={({ pressed }) => [s.dot, { backgroundColor: dot.bg, opacity: pressed ? 0.65 : 1 }]}
            />
          ))}
          <Pressable
            onPress={() => setShowColors(false)}
            accessibilityLabel="Cancel highlight colors"
            hitSlop={8}
            style={s.colorCancel}
          >
            <Text style={s.colorCancelText}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.actions}>
          <BarAction icon="color-fill-outline" label="Highlight" onPress={() => setShowColors(true)} />
          <BarAction icon="bookmark-outline" label="Bookmark" onPress={onBookmark} />
          <BarAction icon="share-outline" label="Share" onPress={onShare} />
          <BarAction icon="copy-outline" label="Copy" onPress={onCopy} />
          <BarAction icon="checkmark" label="Done" onPress={onDone} />
        </View>
      )}
    </View>
  );
}

function BarAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: (typeof VERSE_SELECTION_ACTIONS)[number];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={`reader-verse-action-${label.toLowerCase()}`}
      style={({ pressed }) => [s.action, { opacity: pressed ? 0.55 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={INK} />
      <Text style={s.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    elevation: 20,
    backgroundColor: CREAM,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  ref: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.3,
    color: MUTED,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  action: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
  },
  actionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: INK,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 6,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(31,26,18,0.12)",
  },
  colorCancel: {
    backgroundColor: PILL,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  colorCancelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: MUTED,
  },
});
