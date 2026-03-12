import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/context/TranslationContext";
import FeatureTutorial from "@/components/FeatureTutorial";
import { BIBLE_READER_STEPS } from "@/lib/tutorial-steps";

interface BibleBook {
  id: number;
  name: string;
  abbreviation: string;
  testament: string;
  chapterCount: number;
  orderIndex: number;
}

const TRANSLATIONS = [
  { id: "KJV", name: "King James Version", year: "1611" },
  { id: "ASV", name: "American Standard Version", year: "1901" },
  { id: "WEB", name: "World English Bible", year: "2000" },
];

export default function ReadScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { translation, setTranslation } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: books, isLoading, error } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  const otBooks = books?.filter((b) => b.testament === "OT") ?? [];
  const ntBooks = books?.filter((b) => b.testament === "NT") ?? [];

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <FeatureTutorial tutorialId="bible-reader" steps={BIBLE_READER_STEPS} />
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
          onPress={() => setShowPicker(true)}
          testID="translation-picker-btn"
        >
          <Text style={[styles.translationPillText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            {translation}
          </Text>
          <Ionicons name="chevron-down" size={12} color={theme.accent} />
        </Pressable>
      </View>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
          <View style={[styles.pickerModal, { backgroundColor: isDark ? theme.backgroundElevated : "#fff" }]}>
            <Text style={[styles.pickerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Select Translation
            </Text>
            {TRANSLATIONS.map((t) => {
              const isActive = translation === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => { setTranslation(t.id); setShowPicker(false); }}
                  style={[styles.pickerOption, isActive && { backgroundColor: theme.accent + "15" }]}
                  testID={`translation-${t.id}`}
                >
                  <View style={styles.pickerOptionLeft}>
                    <Text style={[styles.pickerOptionAbbr, { color: isActive ? theme.accent : theme.text, fontFamily: "Inter_700Bold" }]}>
                      {t.id}
                    </Text>
                    <View>
                      <Text style={[styles.pickerOptionName, { color: isActive ? theme.accent : theme.text, fontFamily: "Inter_500Medium" }]}>
                        {t.name}
                      </Text>
                      <Text style={[styles.pickerOptionYear, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        Published {t.year}
                      </Text>
                    </View>
                  </View>
                  {isActive && <Ionicons name="checkmark-circle" size={22} color={theme.accent} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {isLoading ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={i} style={[styles.skeletonRow, { backgroundColor: theme.backgroundCard, opacity: 0.5 + (i % 2) * 0.15 }]}>
              <View style={[styles.skeletonBlock, { width: 40 + (i % 3) * 20, backgroundColor: theme.divider }]} />
              <View style={[styles.skeletonBlock, { flex: 1, marginLeft: 12, backgroundColor: theme.divider }]} />
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.error} />
          <Text style={{ color: theme.text, fontFamily: "Lora_500Medium", fontSize: 17, marginTop: 10 }}>
            Unable to load books
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>
            Please check your connection and try again.
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
                    backgroundColor: pressed
                      ? (isDark ? theme.accent + "18" : theme.accent + "10")
                      : (isDark ? theme.backgroundCard : theme.backgroundCard),
                    borderColor: isDark ? theme.border : theme.borderLight,
                    borderWidth: 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {book.name}
                </Text>
                <Text style={[styles.bookChapters, { color: isDark ? theme.textSecondary : theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {book.chapterCount}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.testamentSection, { marginTop: 40 }]}>
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
                    backgroundColor: pressed
                      ? (isDark ? theme.accent + "18" : theme.accent + "10")
                      : (isDark ? theme.backgroundCard : theme.backgroundCard),
                    borderColor: isDark ? theme.border : theme.borderLight,
                    borderWidth: 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {book.name}
                </Text>
                <Text style={[styles.bookChapters, { color: isDark ? theme.textSecondary : theme.textMuted, fontFamily: "Inter_400Regular" }]}>
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
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 36,
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
    marginBottom: 18,
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
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bookPillText: {
    fontSize: 14,
  },
  bookChapters: {
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  pickerModal: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
  },
  pickerTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 6,
  },
  pickerOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  pickerOptionAbbr: {
    fontSize: 16,
    width: 36,
  },
  pickerOptionName: {
    fontSize: 15,
  },
  pickerOptionYear: {
    fontSize: 12,
    marginTop: 1,
  },
  skeletonList: {
    paddingHorizontal: 22,
    paddingTop: 20,
    gap: 12,
  },
  skeletonRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  skeletonBlock: {
    height: 14,
    borderRadius: 6,
  },
});
