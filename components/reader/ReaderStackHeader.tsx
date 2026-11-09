import React from "react";
import { PixelRatio, Pressable, StyleSheet, Text, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { READING_CHROME_FONT_CAP } from "@/lib/reading-font-scale";
import {
  chapterListTitle,
  readerHeaderLabel,
  readerHeaderTitleKey,
  readerHeaderTitleWidth,
} from "@/lib/reader-header-layout";
import { currentReaderHeaderActions } from "@/lib/reader-header-store";

/** PathB.surface / PathB.ink / muted ink, matching the reader itself. */
export const READER_HEADER_SURFACE = "#FBF7EE";
export const READER_HEADER_INK = "#1F1A12";
export const READER_HEADER_INK_MUTED = "#6B6660";

type RouteOptionArgs = { route: { params?: object } };

/** Back chevron; the focused reader decides where "back" goes. */
export function ReaderHeaderBack() {
  return (
    <Pressable
      onPress={() => currentReaderHeaderActions()?.goBack()}
      hitSlop={12}
      style={styles.iconButton}
      testID="bible-reader-back"
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={22} color={READER_HEADER_INK} />
    </Pressable>
  );
}

/**
 * "Matthew 5 ⌄" — opens the chapter picker. `width` is computed from the label (character count
 * and font size) and clamped to the room beside the chips. The button does not flex inside the
 * native header subview, which on Android keeps whatever size it measured first.
 */
export function ReaderHeaderTitle({ label }: { label: string }) {
  const { width: screenWidth } = useWindowDimensions();
  const fontScale = Math.min(PixelRatio.getFontScale(), READING_CHROME_FONT_CAP);
  const width = readerHeaderTitleWidth(label, screenWidth, fontScale);
  return (
    <Pressable
      onPress={() => currentReaderHeaderActions()?.openChapterPicker()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label ? `${label}, open chapter selector` : "Open chapter selector"}
      style={[styles.titleButton, { width }]}
      collapsable={false}
      testID="reader-header-title"
    >
      <Text
        style={styles.titleText}
        numberOfLines={1}
        ellipsizeMode="tail"
        maxFontSizeMultiplier={READING_CHROME_FONT_CAP}
      >
        {label}
      </Text>
      <Ionicons name="chevron-down" size={14} color={READER_HEADER_INK_MUTED} />
    </Pressable>
  );
}

/** Header pieces that must exist on the first frame and be recreated when the chapter changes. */
export function readerHeaderNavigationOptions(params: object | undefined, label: string) {
  const key = readerHeaderTitleKey(params);
  return {
    title: label,
    headerLeft: () => <ReaderHeaderBack key={`back-${key}`} />,
    headerTitle: () => <ReaderHeaderTitle key={key} label={label} />,
  };
}

const headerChrome = {
  headerShown: true as const,
  headerShadowVisible: false as const,
  headerStyle: { backgroundColor: READER_HEADER_SURFACE },
  headerTintColor: READER_HEADER_INK,
  headerTitleStyle: { fontFamily: "Lora_600SemiBold", fontSize: 17, color: READER_HEADER_INK },
};

/**
 * Layout-level options for the reader route. Everything the first header frame needs — the title
 * text, the back button, the title button, colours — comes from the route params here, not from
 * the screen after it mounts.
 */
export function readerScreenOptions({ route }: RouteOptionArgs) {
  const label = readerHeaderLabel(route.params);
  return {
    ...headerChrome,
    headerBackVisible: false as const,
    ...readerHeaderNavigationOptions(route.params, label),
  };
}

/** Layout-level options for the chapter list, titled from the book id on the first frame. */
export function chapterListScreenOptions({ route }: RouteOptionArgs) {
  return {
    ...headerChrome,
    title: chapterListTitle(route.params),
  };
}

const styles = StyleSheet.create({
  iconButton: {
    padding: 4,
  },
  titleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  titleText: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Lora_600SemiBold",
    color: READER_HEADER_INK,
  },
});
