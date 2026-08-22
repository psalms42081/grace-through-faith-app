import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { F } from "@/components/home-v2/theme";
import type { MemoryText } from "@/lib/sabbath-school-memory-text";

interface MemoryVerseCardProps {
  memoryText: MemoryText;
  testID?: string;
}

/**
 * The single ceremonial presentation for Adventech's Sabbath School Memory Text.
 */
export function MemoryVerseCard({ memoryText, testID }: MemoryVerseCardProps) {
  return (
    <View style={styles.card} testID={testID}>
      <Text style={styles.label}>MEMORY VERSE</Text>
      <Text style={styles.verse}>{memoryText.verse}</Text>
      {memoryText.reference && <Text style={styles.reference}>{memoryText.reference}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#050507",
    borderRadius: 20,
    padding: 22,
    gap: 10,
  },
  label: {
    fontFamily: F.interBold,
    fontSize: 11,
    letterSpacing: 1.8,
    color: "#7FC8BE",
  },
  verse: {
    fontFamily: "Lora_400Regular_Italic",
    fontStyle: "italic",
    fontSize: 17,
    lineHeight: 27,
    color: "#F0EBE0",
  },
  reference: {
    fontFamily: F.interMed,
    fontSize: 12.5,
    color: "rgba(240,235,224,0.72)",
  },
});