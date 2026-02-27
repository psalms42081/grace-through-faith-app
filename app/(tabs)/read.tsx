import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const OT_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi",
];

const NT_BOOKS = [
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
  "James", "1 Peter", "2 Peter", "1 John", "2 John",
  "3 John", "Jude", "Revelation",
];

export default function ReadScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      {/* Sticky Header */}
      <View
        style={[
          styles.stickyHeader,
          { paddingTop: topPad + 12, backgroundColor: theme.background, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Bible Reader
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: theme.backgroundSecondary }]}
            hitSlop={8}
          >
            <Ionicons name="text" size={16} color={theme.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: theme.backgroundSecondary }]}
            hitSlop={8}
          >
            <Ionicons name="bookmark-outline" size={16} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Translation Badge */}
        <Pressable style={[styles.translationBadge, { backgroundColor: theme.accent + "22", borderColor: theme.accent + "55" }]}>
          <Text style={[styles.translationText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            KJV — King James Version
          </Text>
          <Ionicons name="chevron-down" size={13} color={theme.accent} />
        </Pressable>

        {/* Old Testament */}
        <Text style={[styles.testamentLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
          Old Testament
        </Text>
        <View style={styles.booksGrid}>
          {OT_BOOKS.map((book) => (
            <Pressable
              key={book}
              style={({ pressed }) => [
                styles.bookPill,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Lora_500Medium" }]}>
                {book}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* New Testament */}
        <Text style={[styles.testamentLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>
          New Testament
        </Text>
        <View style={styles.booksGrid}>
          {NT_BOOKS.map((book) => (
            <Pressable
              key={book}
              style={({ pressed }) => [
                styles.bookPill,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Lora_500Medium" }]}>
                {book}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Data Notice */}
        <View style={[styles.notice, { backgroundColor: theme.primary + "22", borderColor: theme.primary + "44" }]}>
          <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
          <Text style={[styles.noticeText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Bible text will load here after KJV data is imported in Milestone 2.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  stickyHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: { fontSize: 24 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  translationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 22,
  },
  translationText: { fontSize: 13 },
  testamentLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  booksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bookPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bookPillText: { fontSize: 13 },
  notice: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 28,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
