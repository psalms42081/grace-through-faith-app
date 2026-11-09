import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { READING_CHROME_FONT_CAP } from "@/lib/reading-font-scale";
import { chapterListTitle, readerHeaderLabel } from "@/lib/reader-header-layout";
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
 * "Matthew 5 ⌄" — opens the chapter picker. The label arrives as `children` (the navigation
 * `title`, derived from the route params in the layout options and later refreshed by the screen),
 * so it is present on the first header frame and re-renders whenever the title option changes.
 */
export function ReaderHeaderTitle({ children, label }: { children?: React.ReactNode; label?: string }) {
  const text = typeof children === "string" && children.trim() ? children : label ?? "";
  return (
    <Pressable
      onPress={() => currentReaderHeaderActions()?.openChapterPicker()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={text ? `${text}, open chapter selector` : "Open chapter selector"}
      style={styles.titleButton}
      testID="reader-header-title"
    >
      <Text
        style={styles.titleText}
        numberOfLines={1}
        ellipsizeMode="tail"
        maxFontSizeMultiplier={READING_CHROME_FONT_CAP}
      >
        {text}
      </Text>
      <Ionicons name="chevron-down" size={14} color={READER_HEADER_INK_MUTED} />
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
 * Layout-level options for the reader route. Everything the first header frame needs — the title
 * text, the back button, the title button, colours — comes from the route params here, not from
 * the screen after it mounts.
 */
export function readerScreenOptions({ route }: RouteOptionArgs) {
  const label = readerHeaderLabel(route.params);
  return {
    ...headerChrome,
    title: label,
    headerBackVisible: false as const,
    headerLeft: () => <ReaderHeaderBack />,
    headerTitle: ({ children }: { children: string }) => (
      <ReaderHeaderTitle label={label}>{children}</ReaderHeaderTitle>
    ),
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
    // Fill the left header slot (the back button's sibling, already beside the chips) and
    // ellipsize only when the label itself is wider than the room left. The width is not
    // measured: the chips' laid-out width is the stretched toolbar slot, and capping the
    // title from it shrinks "Luke 2" to "Luke..." once a chapter change rebuilds the header.
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  titleText: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 17,
    fontFamily: "Lora_600SemiBold",
    color: READER_HEADER_INK,
  },
});
