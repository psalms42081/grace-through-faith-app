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
          { paddingTop: topPad + 16, backgroundColor: theme.background },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Bible
        </Text>
        <Pressable
          style={[
            styles.translationPill,
            { backgroundColor: theme.accent + "18" },
          ]}
          hitSlop={8}
        >
          <Text style={[styles.translationPillText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            KJV
          </Text>
          <Ionicons name="chevron-down" size={12} color={theme.accent} />
        </Pressable>
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
        >
          <View style={styles.testamentSection}>
            <Text style={[styles.testamentLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              Old Testament
            </Text>
            <Text style={[styles.testamentCount, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {otBooks.length} books
            </Text>
          </View>
          <View style={styles.booksGrid}>
            {otBooks.map((book) => (
              <Pressable
                key={book.id}
                onPress={() => router.push(`/read/${book.id}`)}
                style={({ pressed }) => [
                  styles.bookPill,
                  {
                    backgroundColor: pressed ? theme.accent + "15" : theme.backgroundCard,
                    borderColor: pressed ? theme.accent + "40" : theme.border,
                  },
                ]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {book.name}
                </Text>
                <Text style={[styles.bookChapters, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {book.chapterCount}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.testamentSection, { marginTop: 36 }]}>
            <Text style={[styles.testamentLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              New Testament
            </Text>
            <Text style={[styles.testamentCount, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {ntBooks.length} books
            </Text>
          </View>
          <View style={styles.booksGrid}>
            {ntBooks.map((book) => (
              <Pressable
                key={book.id}
                onPress={() => router.push(`/read/${book.id}`)}
                style={({ pressed }) => [
                  styles.bookPill,
                  {
                    backgroundColor: pressed ? theme.accent + "15" : theme.backgroundCard,
                    borderColor: pressed ? theme.accent + "40" : theme.border,
                  },
                ]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
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
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 34,
    letterSpacing: -0.5,
  },
  translationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 4,
  },
  translationPillText: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 8 },
  testamentSection: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 8,
  },
  testamentLabel: {
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  testamentCount: {
    fontSize: 12,
  },
  booksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  bookPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  bookPillText: {
    fontSize: 14,
  },
  bookChapters: {
    fontSize: 11,
    opacity: 0.7,
  },
});
