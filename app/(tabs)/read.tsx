import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";

interface BibleBook {
  id: number;
  name: string;
  abbreviation: string;
  testament: string;
  chapterCount: number;
  orderIndex: number;
}

export default function ReadScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: books, isLoading, error } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  const otBooks = books?.filter((b) => b.testament === "OT") ?? [];
  const ntBooks = books?.filter((b) => b.testament === "NT") ?? [];

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.error} />
          <Text style={{ color: theme.text, fontFamily: "Lora_500Medium", fontSize: 17, marginTop: 10 }}>
            Unable to load books
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>
            {(error as Error).message}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <Pressable style={[styles.translationBadge, { backgroundColor: theme.accent + "22", borderColor: theme.accent + "55" }]}>
            <Text style={[styles.translationText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              KJV — King James Version
            </Text>
            <Ionicons name="chevron-down" size={13} color={theme.accent} />
          </Pressable>

          <Text style={[styles.testamentLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Old Testament
          </Text>
          <View style={styles.booksGrid}>
            {otBooks.map((book) => (
              <Pressable
                key={book.id}
                onPress={() => router.push(`/read/${book.id}`)}
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
                  {book.name}
                </Text>
                <Text style={[styles.bookChapters, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {book.chapterCount}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.testamentLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>
            New Testament
          </Text>
          <View style={styles.booksGrid}>
            {ntBooks.map((book) => (
              <Pressable
                key={book.id}
                onPress={() => router.push(`/read/${book.id}`)}
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
                  {book.name}
                </Text>
                <Text style={[styles.bookChapters, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {book.chapterCount}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bookPillText: { fontSize: 13 },
  bookChapters: { fontSize: 10 },
});
