import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { F } from "@/components/home-v2/theme";
import { useTranslation } from "@/context/TranslationContext";
import { navigateToScriptureByParts } from "@/lib/scripture-nav";
import { parseScriptureReference } from "@/lib/scripture-reference";
import { readingSpace, readingType } from "@/lib/reading-font-scale";
import { useReadingFontScale, useSystemFontScale } from "@/lib/use-reading-font-scale";
import type { MemoryText } from "@/lib/sabbath-school-memory-text";

interface MemoryVerseCardProps {
  memoryText: MemoryText;
  testID?: string;
}

/**
 * The single ceremonial presentation for Adventech's Sabbath School Memory Text.
 */
export function MemoryVerseCard({ memoryText, testID }: MemoryVerseCardProps) {
  const { translation } = useTranslation();
  const scale = useReadingFontScale() * useSystemFontScale();
  const parsed = memoryText.reference
    ? parseScriptureReference(memoryText.reference)
    : null;

  const body = (
    <>
      <Text style={styles.label}>MEMORY VERSE</Text>
      <Text allowFontScaling={false} style={[styles.verse, readingType(17, 27, scale)]}>{memoryText.verse}</Text>
      {memoryText.reference && (
        <Text allowFontScaling={false} style={[styles.reference, readingType(12.5, 18, scale)]}>
          {memoryText.reference}
        </Text>
      )}
    </>
  );

  if (!parsed) {
    return (
      <View style={[styles.card, { gap: readingSpace(10, scale) }]} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.card, { gap: readingSpace(10, scale) }]}
      testID={testID}
      accessibilityRole="link"
      accessibilityLabel={memoryText.reference || "Memory verse"}
      onPress={() =>
        navigateToScriptureByParts(
          parsed.bookId,
          parsed.chapter,
          parsed.verse,
          translation,
          parsed.verses ? undefined : parsed.verse != null ? (parsed.verseEnd ?? parsed.verse) : undefined,
          parsed.verses,
        )
      }
    >
      {body}
    </Pressable>
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
