import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { untranslatedBookMessage } from "@/shared/partial-bible";

const INK = "#1F1A12";
const PILL = "#F1EBDD";

interface Props {
  bookName: string;
  language: string;
  nearestBook?: string | null;
  nearestChapter?: number | null;
  onNearest?: () => void;
  previousLabel?: string | null;
  onPrevious?: () => void;
  /** Inside a scrolling chapter, the notice should not stretch to fill the screen. */
  embedded?: boolean;
  testID?: string;
}

/** Calm stand-in when an edition does not contain the open book. */
export function MissingTranslationNotice({
  bookName,
  language,
  nearestBook,
  nearestChapter,
  onNearest,
  previousLabel,
  onPrevious,
  embedded = false,
  testID = "missing-translation-notice",
}: Props) {
  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]} testID={testID}>
      <Text style={styles.message}>{untranslatedBookMessage(bookName, language)}</Text>
      {nearestBook && onNearest ? (
        <Pressable
          onPress={onNearest}
          accessibilityRole="button"
          accessibilityLabel={nearestActionLabel(nearestBook, nearestChapter)}
          testID="missing-translation-nearest"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>{nearestActionLabel(nearestBook, nearestChapter)}</Text>
        </Pressable>
      ) : null}
      {previousLabel && onPrevious ? (
        <Pressable
          onPress={onPrevious}
          accessibilityRole="button"
          accessibilityLabel={`Read this chapter in ${previousLabel}`}
          testID="missing-translation-previous"
          style={({ pressed }) => [styles.button, styles.buttonQuiet, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Read this chapter in {previousLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function nearestActionLabel(book: string, chapter?: number | null): string {
  return chapter && chapter > 1 ? `Read ${book} ${chapter}` : `Read ${book}`;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    alignSelf: "stretch",
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 14,
  },
  wrapEmbedded: {
    flex: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  message: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: "center",
    fontFamily: "Lora_500Medium",
    color: INK,
  },
  button: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: PILL,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonQuiet: {
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E7E0D2",
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    color: INK,
  },
});
