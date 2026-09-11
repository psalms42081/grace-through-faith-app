import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PathB } from "@/constants/colors";

export const AI_GENERATED_LABEL = "AI-generated";

export const AI_ADVENTIST_NOTE =
  "Answers are shaped by an Adventist understanding of Scripture and may contain errors. Test them against the Bible.";

/** Small muted Canon chip for the top of an AI content block. No icon, no new colours. */
export function AIGeneratedLabel({ testID }: { testID?: string }) {
  return (
    <View style={styles.chip} testID={testID ?? "ai-generated-label"}>
      <Text style={styles.chipText}>{AI_GENERATED_LABEL}</Text>
    </View>
  );
}

/** One-line note under Ask the Bible, Study Tutor, and the sparkle generator input. */
export function AIAdventistNote({ testID }: { testID?: string }) {
  return (
    <Text style={styles.note} testID={testID ?? "ai-adventist-note"}>
      {AI_ADVENTIST_NOTE}
    </Text>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    backgroundColor: PathB.surface,
    borderColor: "rgba(31,26,18,0.12)",
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    color: PathB.inkMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  note: {
    color: PathB.inkMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
});
