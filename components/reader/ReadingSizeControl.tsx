import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  READING_BODY_FONT_SIZE,
  READING_BODY_LINE_HEIGHT,
  READING_FONT_SCALE_STEPS,
  type ReadingFontScale,
} from "@/lib/reading-font-scale";

const INK = "#1F1A12";
const MUTED = "#6B6660";

/**
 * Large A buttons step the size. The track jumps straight to a step.
 * Every target is at least 44px for older hands.
 */
export function ReadingSizeControl({
  scale,
  onChange,
}: {
  scale: ReadingFontScale;
  onChange: (next: ReadingFontScale) => void;
}) {
  const index = READING_FONT_SCALE_STEPS.indexOf(scale);
  const current = index >= 0 ? index : READING_FONT_SCALE_STEPS.indexOf(1);

  return (
    <View>
      <View style={styles.ends}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Smaller text"
          testID="reading-size-smaller"
          disabled={current <= 0}
          onPress={() => onChange(READING_FONT_SCALE_STEPS[current - 1]!)}
          style={[styles.aButton, current <= 0 && styles.aButtonOff]}
        >
          <Text style={styles.aSmall} allowFontScaling={false}>A</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Larger text"
          testID="reading-size-larger"
          disabled={current >= READING_FONT_SCALE_STEPS.length - 1}
          onPress={() => onChange(READING_FONT_SCALE_STEPS[current + 1]!)}
          style={[styles.aButton, current >= READING_FONT_SCALE_STEPS.length - 1 && styles.aButtonOff]}
        >
          <Text style={styles.aLarge} allowFontScaling={false}>A</Text>
        </Pressable>
      </View>
      <View style={styles.track}>
        {READING_FONT_SCALE_STEPS.map((step) => {
          const selected = step === scale;
          return (
            <Pressable
              key={step}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Text size ${Math.round(step * 100)} percent`}
              testID={`reading-size-${step}`}
              onPress={() => onChange(step)}
              style={styles.stop}
            >
              <View style={[styles.dot, selected && styles.dotOn]} />
            </Pressable>
          );
        })}
      </View>
      <Text
        allowFontScaling={false}
        style={[
          styles.preview,
          {
            fontSize: READING_BODY_FONT_SIZE * scale,
            lineHeight: READING_BODY_LINE_HEIGHT * scale,
          },
        ]}
      >
        For by grace are ye saved through faith.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ends: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  aButton: {
    minWidth: 56,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F1EBDD",
  },
  aButtonOff: {
    opacity: 0.35,
  },
  aSmall: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
    lineHeight: 20,
    color: MUTED,
  },
  aLarge: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 32,
    lineHeight: 38,
    color: INK,
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1EBDD",
    borderRadius: 16,
    marginBottom: 16,
  },
  stop: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#D8D0BE",
  },
  dotOn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: INK,
  },
  preview: {
    fontFamily: "Lora_400Regular",
    color: INK,
    paddingBottom: 8,
  },
});
