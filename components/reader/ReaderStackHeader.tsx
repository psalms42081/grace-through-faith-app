import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  chapterListTitle,
  READER_HEADER_BACK_ICON,
  READER_HEADER_BACK_PADDING,
  READER_HEADER_CHEVRON_GAP,
  READER_HEADER_CHEVRON_SIZE,
  READER_HEADER_TITLE_FONT_CAP,
  READER_HEADER_TITLE_FONT_SIZE,
  READER_HEADER_TITLE_TEXT_WIDTH,
  READER_HEADER_TITLE_WIDTH,
  readerHeaderAccessibilityLabel,
  readerHeaderLabel,
  readerHeaderTitle,
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
      <Ionicons name="chevron-back" size={READER_HEADER_BACK_ICON} color={READER_HEADER_INK} />
    </Pressable>
  );
}

/**
 * "Luke ⌄" — the book's short name in a fixed-width box, opening the book/chapter picker.
 * The chapter is already in the large heading and the chapter pill. No dimension here flexes,
 * so the box is the same on the first header frame and after every chapter change, and the
 * chevron is always inside it.
 */
export function ReaderHeaderTitle({ title, accessibilityLabel }: { title: string; accessibilityLabel: string }) {
  return (
    <Pressable
      onPress={() => currentReaderHeaderActions()?.openChapterPicker()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.titleButton}
      testID="reader-header-title"
    >
      <View style={styles.titleTextBox}>
        <Text
          style={styles.titleText}
          numberOfLines={1}
          ellipsizeMode="tail"
          maxFontSizeMultiplier={READER_HEADER_TITLE_FONT_CAP}
        >
          {title}
        </Text>
      </View>
      <Ionicons name="chevron-down" size={READER_HEADER_CHEVRON_SIZE} color={READER_HEADER_INK_MUTED} />
    </Pressable>
  );
}

const headerChrome = {
  headerShown: true as const,
  headerShadowVisible: false as const,
  headerStyle: { backgroundColor: READER_HEADER_SURFACE },
  headerTintColor: READER_HEADER_INK,
  headerTitleStyle: { fontFamily: "Lora_600SemiBold", fontSize: 17, color: READER_HEADER_INK },
};

/**
 * Layout-level options for the reader route. Everything the header needs — the short title,
 * the accessible full name, the back button, colours — comes from the route params here, so it
 * is right on the first frame and again for every chapter the route moves to.
 */
export function readerScreenOptions({ route }: RouteOptionArgs) {
  const title = readerHeaderTitle(route.params);
  const accessibilityLabel = readerHeaderAccessibilityLabel(route.params);
  return {
    ...headerChrome,
    // The full label is the route's (document) title; the visible header shows the short name.
    title: readerHeaderLabel(route.params),
    headerBackVisible: false as const,
    headerLeft: () => <ReaderHeaderBack />,
    headerTitle: () => <ReaderHeaderTitle title={title} accessibilityLabel={accessibilityLabel} />,
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
    padding: READER_HEADER_BACK_PADDING,
  },
  titleButton: {
    width: READER_HEADER_TITLE_WIDTH,
    flexDirection: "row",
    alignItems: "center",
  },
  titleTextBox: {
    width: READER_HEADER_TITLE_TEXT_WIDTH,
    marginRight: READER_HEADER_CHEVRON_GAP,
  },
  titleText: {
    fontSize: READER_HEADER_TITLE_FONT_SIZE,
    fontFamily: "Lora_600SemiBold",
    color: READER_HEADER_INK,
  },
});
